-- ============================================================
-- Wedding List — Phase 1: SQL functions scoped to p_event_id
-- Run AFTER deploying Phase 1 app code.
--
-- All five functions are replaced with event-scoped versions.
-- p_event_id DEFAULT NULL means existing callers keep working
-- (no event filter) until they are updated to pass the parameter.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 0. get_dashboard_stats
--    Added p_event_id — when provided, all counts are scoped
--    to guests/scans belonging to that event.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_dashboard_stats(
  p_event_id UUID DEFAULT NULL
)
RETURNS jsonb
LANGUAGE sql
SECURITY INVOKER
AS $$
  SELECT jsonb_build_object(
    'totalGuests',        (
      SELECT COUNT(*) FROM public.guests
      WHERE ($1 IS NULL OR event_id = $1)
    ),
    'justCeremony', (
      SELECT COUNT(*)
      FROM public.guests g
      INNER JOIN public.event_attendance ea ON g.id = ea.guest_id
      WHERE ea.event_type = 'ceremony'
        AND ($1 IS NULL OR g.event_id = $1)
        AND NOT EXISTS (
          SELECT 1 FROM public.event_attendance ea2
          WHERE ea2.guest_id = g.id AND ea2.event_type = 'reception'
        )
    ),
    'justReception', (
      SELECT COUNT(*)
      FROM public.guests g
      INNER JOIN public.event_attendance ea ON g.id = ea.guest_id
      WHERE ea.event_type = 'reception'
        AND ($1 IS NULL OR g.event_id = $1)
    ),
    'confirmedGuests', (
      SELECT COUNT(*) FROM public.guests
      WHERE status = 'confirmed' AND ($1 IS NULL OR event_id = $1)
    ),
    'pendingGuests', (
      SELECT COUNT(*) FROM public.guests
      WHERE status = 'pending' AND ($1 IS NULL OR event_id = $1)
    ),
    'declinedGuests', (
      SELECT COUNT(*) FROM public.guests
      WHERE status = 'declined' AND ($1 IS NULL OR event_id = $1)
    ),
    'checkedInCeremony', (
      SELECT COUNT(DISTINCT sl.guest_id)
      FROM   public.scan_logs sl
      WHERE  sl.event_type = 'ceremony'
        AND  sl.is_duplicate = false
        AND  ($1 IS NULL OR sl.event_id = $1)
    ),
    'checkedInReception', (
      SELECT COUNT(DISTINCT sl.guest_id)
      FROM   public.scan_logs sl
      WHERE  sl.event_type = 'reception'
        AND  sl.is_duplicate = false
        AND  ($1 IS NULL OR sl.event_id = $1)
    ),
    'guestsByStatus', jsonb_build_array(
      jsonb_build_object('status', 'Confirmed', 'count',
        (SELECT COUNT(*) FROM public.guests WHERE status = 'confirmed' AND ($1 IS NULL OR event_id = $1))),
      jsonb_build_object('status', 'Pending', 'count',
        (SELECT COUNT(*) FROM public.guests WHERE status = 'pending'   AND ($1 IS NULL OR event_id = $1))),
      jsonb_build_object('status', 'Declined', 'count',
        (SELECT COUNT(*) FROM public.guests WHERE status = 'declined'  AND ($1 IS NULL OR event_id = $1))),
      jsonb_build_object('status', 'Tentative', 'count',
        (SELECT COUNT(*) FROM public.guests WHERE status = 'tentative' AND ($1 IS NULL OR event_id = $1)))
    ),
    'guestsByCategory', (
      SELECT COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'name',  c.name,
            'color', c.color,
            'count', COALESCE(cnt.guest_count, 0)
          ) ORDER BY c.name
        ),
        '[]'::jsonb
      )
      FROM public.categories c
      LEFT JOIN (
        SELECT gc.category_id, COUNT(*) AS guest_count
        FROM   public.guest_categories gc
        JOIN   public.guests g ON g.id = gc.guest_id
        WHERE  ($1 IS NULL OR g.event_id = $1)
        GROUP  BY gc.category_id
      ) cnt ON cnt.category_id = c.id
      WHERE ($1 IS NULL OR c.event_id = $1)
    ),
    'recentActivity', (
      SELECT COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'id',           sl.id,
            'guest_id',     sl.guest_id,
            'scanned_by',   sl.scanned_by,
            'scanned_at',   sl.scanned_at,
            'event_type',   sl.event_type,
            'is_duplicate', sl.is_duplicate,
            'notes',        sl.notes,
            'guests',       jsonb_build_object('first_name', g.first_name, 'last_name', g.last_name),
            'users',        CASE WHEN u.display_name IS NOT NULL
                              THEN jsonb_build_object('display_name', u.display_name)
                              ELSE NULL END
          ) ORDER BY sl.scanned_at DESC
        ),
        '[]'::jsonb
      )
      FROM (
        SELECT * FROM public.scan_logs
        WHERE ($1 IS NULL OR event_id = $1)
        ORDER BY scanned_at DESC LIMIT 10
      ) sl
      LEFT JOIN public.guests g ON g.id = sl.guest_id
      LEFT JOIN public.users  u ON u.id = sl.scanned_by
    )
  )
$$;

GRANT EXECUTE ON FUNCTION public.get_dashboard_stats(UUID) TO authenticated;


-- ------------------------------------------------------------
-- 1. create_guest_full
--    Added p_event_id — stored in guests.event_id.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_guest_full(
  p_first_name             text,
  p_last_name              text,
  p_email                  text,
  p_phone                  text,
  p_status                 text,
  p_dietary_restrictions   text,
  p_notes                  text,
  p_is_plus_one            boolean,
  p_category_ids           uuid[],
  p_ceremony_attending     boolean,
  p_reception_attending    boolean,
  p_event_id               uuid    DEFAULT NULL,
  p_created_by             uuid    DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_guest_id uuid;
  v_guest    jsonb;
BEGIN
  INSERT INTO public.guests (
    first_name, last_name, email, phone, status,
    dietary_restrictions, notes, is_plus_one, event_id, created_by
  )
  VALUES (
    p_first_name,
    p_last_name,
    NULLIF(p_email, ''),
    NULLIF(p_phone, ''),
    p_status,
    NULLIF(p_dietary_restrictions, ''),
    NULLIF(p_notes, ''),
    p_is_plus_one,
    p_event_id,
    p_created_by
  )
  RETURNING id INTO v_guest_id;

  IF p_category_ids IS NOT NULL AND array_length(p_category_ids, 1) > 0 THEN
    INSERT INTO public.guest_categories (guest_id, category_id)
    SELECT v_guest_id, unnest(p_category_ids);
  END IF;

  IF p_ceremony_attending THEN
    INSERT INTO public.event_attendance (guest_id, event_type, attending)
    VALUES (
      v_guest_id,
      'ceremony',
      CASE WHEN p_status = 'confirmed' THEN true ELSE NULL END
    );
  END IF;

  IF p_reception_attending THEN
    INSERT INTO public.event_attendance (guest_id, event_type, attending)
    VALUES (
      v_guest_id,
      'reception',
      CASE WHEN p_status = 'confirmed' THEN true ELSE NULL END
    );
  END IF;

  SELECT to_jsonb(g) INTO v_guest FROM public.guests g WHERE g.id = v_guest_id;

  RETURN v_guest;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_guest_full(
  text, text, text, text, text, text, text, boolean, uuid[], boolean, boolean, uuid, uuid
) TO authenticated;


-- ------------------------------------------------------------
-- 2. update_guest_with_categories  (no change needed — updates by id)
-- ------------------------------------------------------------


-- ------------------------------------------------------------
-- 3. process_guest_scan
--    Added p_event_id — stored in scan_logs.event_id.
--    Today-stats counts are scoped to the event when provided.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.process_guest_scan(
  p_invitation_guid  uuid,
  p_event_type       text,
  p_scanned_by       uuid,
  p_event_id         uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_guest_id        uuid;
  v_first_name      text;
  v_last_name       text;
  v_status          text;
  v_is_duplicate    boolean;
  v_ceremony_count  bigint;
  v_reception_count bigint;
BEGIN
  SELECT id, first_name, last_name, status
  INTO   v_guest_id, v_first_name, v_last_name, v_status
  FROM   public.guests
  WHERE  invitation_guid = p_invitation_guid;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('found', false);
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM   public.scan_logs
    WHERE  guest_id     = v_guest_id
      AND  event_type   = p_event_type
      AND  is_duplicate = false
      AND  scanned_at::date = current_date
      AND  ($4 IS NULL OR event_id = $4)
  ) INTO v_is_duplicate;

  INSERT INTO public.scan_logs (guest_id, scanned_by, event_type, is_duplicate, event_id)
  VALUES (v_guest_id, p_scanned_by, p_event_type, v_is_duplicate, p_event_id);

  SELECT COUNT(DISTINCT guest_id) INTO v_ceremony_count
  FROM   public.scan_logs
  WHERE  event_type = 'ceremony'
    AND  is_duplicate = false
    AND  scanned_at::date = current_date
    AND  ($4 IS NULL OR event_id = $4);

  SELECT COUNT(DISTINCT guest_id) INTO v_reception_count
  FROM   public.scan_logs
  WHERE  event_type = 'reception'
    AND  is_duplicate = false
    AND  scanned_at::date = current_date
    AND  ($4 IS NULL OR event_id = $4);

  RETURN jsonb_build_object(
    'found',        true,
    'is_duplicate', v_is_duplicate,
    'guest', jsonb_build_object(
      'id',         v_guest_id,
      'first_name', v_first_name,
      'last_name',  v_last_name,
      'status',     v_status,
      'categories', (
        SELECT COALESCE(
          jsonb_agg(jsonb_build_object('name', c.name, 'color', c.color)),
          '[]'::jsonb
        )
        FROM   public.guest_categories gc
        JOIN   public.categories c ON c.id = gc.category_id
        WHERE  gc.guest_id = v_guest_id
      ),
      'seating', (
        SELECT jsonb_build_object(
          'table_number', t.number,
          'seat_number',  NULL
        )
        FROM   public.seating_assignments sa
        JOIN   public.tables t ON t.id = sa.table_id
        WHERE  sa.guest_id = v_guest_id
        LIMIT  1
      )
    ),
    'today_stats', jsonb_build_object(
      'ceremony',  v_ceremony_count,
      'reception', v_reception_count
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.process_guest_scan(uuid, text, uuid, uuid) TO authenticated;


-- ------------------------------------------------------------
-- 4. get_guests_paginated
--    Added p_event_id — filters the `filtered` CTE to guests
--    belonging to the specified event.
-- ------------------------------------------------------------
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
