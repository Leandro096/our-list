-- ============================================================
-- Wedding List — Migration 005: security hardening
-- Idempotent (CREATE OR REPLACE). Safe to re-run.
--
-- WHY: public.get_guests_paginated is SECURITY DEFINER and GRANTed to
-- `authenticated`, so it bypasses RLS. The Phase 1 version (migration 002)
-- added p_event_id but TRUSTS it blindly — any authenticated user could call
-- the RPC with another tenant's event_id and read that tenant's guest list,
-- and passing NULL returned guests across ALL tenants.
--
-- This migration adds an authorization guard: the event must exist AND the
-- caller must be a member of its tenant. is_tenant_member() reads auth.uid()
-- (the request JWT), which is still populated inside a SECURITY DEFINER body.
-- ============================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.get_guests_paginated(
  p_search        TEXT     DEFAULT NULL,
  p_status        TEXT     DEFAULT NULL,
  p_category_ids  UUID[]   DEFAULT NULL,
  p_event_types   TEXT[]   DEFAULT NULL,
  p_sort_by       TEXT     DEFAULT 'first_name',
  p_sort_order    TEXT     DEFAULT 'asc',
  p_page          INTEGER  DEFAULT 1,
  p_page_size     INTEGER  DEFAULT 50,
  p_event_id      UUID     DEFAULT NULL
)
RETURNS TABLE (
  id                   UUID,
  invitation_guid      UUID,
  first_name           TEXT,
  last_name            TEXT,
  email                TEXT,
  phone                TEXT,
  status               TEXT,
  dietary_restrictions TEXT,
  notes                TEXT,
  is_plus_one          BOOLEAN,
  parent_guest_id      UUID,
  created_at           TIMESTAMPTZ,
  updated_at           TIMESTAMPTZ,
  created_by           UUID,
  guest_categories     JSONB,
  event_attendance     JSONB,
  seating_assignments  JSONB,
  has_children         BOOLEAN,
  total_count          BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_offset   INTEGER;
  v_sort_col TEXT;
  v_sort_dir TEXT;
  v_sql      TEXT;
BEGIN
  -- ---- Authorization guard (Phase 1 hardening) ----
  -- A concrete event is required, and the caller must belong to its tenant.
  IF p_event_id IS NULL THEN
    RAISE EXCEPTION 'get_guests_paginated: p_event_id is required'
      USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = p_event_id
      AND public.is_tenant_member(e.tenant_id)
  ) THEN
    RAISE EXCEPTION 'get_guests_paginated: not authorized for event %', p_event_id
      USING ERRCODE = '42501';
  END IF;

  v_offset := (GREATEST(p_page, 1) - 1) * GREATEST(p_page_size, 1);

  v_sort_col := CASE p_sort_by
                  WHEN 'last_name'  THEN 'last_name'
                  WHEN 'status'     THEN 'status'
                  WHEN 'created_at' THEN 'created_at'
                  ELSE 'first_name'
                END;

  v_sort_dir := CASE WHEN lower(p_sort_order) = 'desc' THEN 'DESC' ELSE 'ASC' END;

  v_sql := format($q$
    WITH filtered AS (
      SELECT g.id
      FROM guests g
      WHERE
        -- Event scope (Phase 1+)
        ($7 IS NULL OR g.event_id = $7)

        -- Search: first_name, last_name, email
        AND ($1 IS NULL OR $1 = '' OR
          g.first_name ILIKE '%%' || $1 || '%%' OR
          g.last_name  ILIKE '%%' || $1 || '%%' OR
          g.email      ILIKE '%%' || $1 || '%%')

        -- Status
        AND ($2 IS NULL OR $2 = 'all' OR g.status::TEXT = $2)

        -- Categories: guest must have ALL selected categories
        AND (
          $3 IS NULL
          OR array_length($3::UUID[], 1) IS NULL
          OR (
            SELECT COUNT(DISTINCT gc.category_id)
            FROM guest_categories gc
            WHERE gc.guest_id = g.id
              AND gc.category_id = ANY($3::UUID[])
          ) = array_length($3::UUID[], 1)
        )

        -- Event type filter
        AND (
          $4 IS NULL
          OR array_length($4::TEXT[], 1) IS NULL
          OR (
            ('ceremony' = ANY($4::TEXT[]) AND NOT ('reception' = ANY($4::TEXT[]))
              AND EXISTS (
                SELECT 1 FROM event_attendance ea
                WHERE ea.guest_id = g.id AND ea.event_type = 'ceremony'
              )
              AND NOT EXISTS (
                SELECT 1 FROM event_attendance ea2
                WHERE ea2.guest_id = g.id AND ea2.event_type = 'reception'
              )
            )
            OR
            ('reception' = ANY($4::TEXT[]) AND NOT ('ceremony' = ANY($4::TEXT[]))
              AND EXISTS (
                SELECT 1 FROM event_attendance ea
                WHERE ea.guest_id = g.id AND ea.event_type = 'reception'
              )
              AND NOT EXISTS (
                SELECT 1 FROM event_attendance ea2
                WHERE ea2.guest_id = g.id AND ea2.event_type = 'ceremony'
              )
            )
            OR
            ('ceremony' = ANY($4::TEXT[]) AND 'reception' = ANY($4::TEXT[])
              AND EXISTS (
                SELECT 1 FROM event_attendance ea
                WHERE ea.guest_id = g.id AND ea.event_type = 'ceremony'
              )
              AND EXISTS (
                SELECT 1 FROM event_attendance ea2
                WHERE ea2.guest_id = g.id AND ea2.event_type = 'reception'
              )
            )
            OR
            ('none' = ANY($4::TEXT[])
              AND NOT EXISTS (
                SELECT 1 FROM event_attendance ea
                WHERE ea.guest_id = g.id AND ea.event_type = 'ceremony'
              )
              AND NOT EXISTS (
                SELECT 1 FROM event_attendance ea2
                WHERE ea2.guest_id = g.id AND ea2.event_type = 'reception'
              )
            )
          )
        )
    ),

    counted AS (
      SELECT COUNT(*) AS total FROM filtered
    ),

    paged AS (
      SELECT g.*
      FROM guests g
      INNER JOIN filtered f ON g.id = f.id
      ORDER BY g.%I %s
      LIMIT $5 OFFSET $6
    )

    SELECT
      p.id,
      p.invitation_guid,
      p.first_name,
      p.last_name,
      p.email,
      p.phone,
      p.status::TEXT                  AS status,
      p.dietary_restrictions,
      p.notes,
      p.is_plus_one,
      p.parent_guest_id,
      p.created_at,
      p.updated_at,
      p.created_by,

      COALESCE(
        (SELECT jsonb_agg(jsonb_build_object(
            'category_id', gc.category_id,
            'categories',  jsonb_build_object('id', c.id, 'name', c.name, 'color', c.color)
         ))
         FROM guest_categories gc
         INNER JOIN categories c ON c.id = gc.category_id
         WHERE gc.guest_id = p.id),
        '[]'::jsonb
      ) AS guest_categories,

      COALESCE(
        (SELECT jsonb_agg(jsonb_build_object(
            'id',         ea.id,
            'guest_id',   ea.guest_id,
            'event_type', ea.event_type::TEXT,
            'attending',  ea.attending,
            'created_at', ea.created_at,
            'updated_at', ea.updated_at
         ))
         FROM event_attendance ea
         WHERE ea.guest_id = p.id),
        '[]'::jsonb
      ) AS event_attendance,

      COALESCE(
        (SELECT jsonb_agg(jsonb_build_object(
            'id',         sa.id,
            'guest_id',   sa.guest_id,
            'table_id',   sa.table_id,
            'created_at', sa.created_at,
            'updated_at', sa.updated_at,
            'tables',     CASE WHEN t.id IS NOT NULL
                            THEN jsonb_build_object('number', t.number)
                            ELSE NULL
                          END
         ))
         FROM seating_assignments sa
         LEFT JOIN tables t ON t.id = sa.table_id
         WHERE sa.guest_id = p.id),
        '[]'::jsonb
      ) AS seating_assignments,

      EXISTS (
        SELECT 1 FROM guests child WHERE child.parent_guest_id = p.id
      ) AS has_children,

      (SELECT total FROM counted) AS total_count

    FROM paged p
  $q$, v_sort_col, v_sort_dir);

  RETURN QUERY EXECUTE v_sql
    USING p_search, p_status, p_category_ids, p_event_types, p_page_size, v_offset, p_event_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_guests_paginated(
  TEXT, TEXT, UUID[], TEXT[], TEXT, TEXT, INTEGER, INTEGER, UUID
) TO authenticated;

COMMIT;
