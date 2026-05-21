-- ============================================================
-- Wedding List — PostgreSQL Functions (Supabase)
-- Execute this script in the Supabase SQL Editor.
-- ============================================================


-- ------------------------------------------------------------
-- 0. get_dashboard_stats
--    Returns all dashboard aggregations in a single round-trip.
--    All counts are computed in PostgreSQL — no JS-side filtering.
--
--    Requires Supabase Realtime enabled on:
--      · public.guests
--      · public.scan_logs
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_dashboard_stats()
RETURNS jsonb
LANGUAGE sql
SECURITY INVOKER
AS $$
  SELECT jsonb_build_object(
    'totalGuests',        (SELECT COUNT(*)                  FROM public.guests),
    'confirmedGuests',    (SELECT COUNT(*) FILTER (WHERE status = 'confirmed')  FROM public.guests),
    'pendingGuests',      (SELECT COUNT(*) FILTER (WHERE status = 'pending')    FROM public.guests),
    'declinedGuests',     (SELECT COUNT(*) FILTER (WHERE status = 'declined')   FROM public.guests),
    'checkedInCeremony',  (
      SELECT COUNT(DISTINCT guest_id)
      FROM   public.scan_logs
      WHERE  event_type = 'ceremony' AND is_duplicate = false
    ),
    'checkedInReception', (
      SELECT COUNT(DISTINCT guest_id)
      FROM   public.scan_logs
      WHERE  event_type = 'reception' AND is_duplicate = false
    ),
    'guestsByStatus', jsonb_build_array(
      jsonb_build_object('status', 'Confirmed', 'count', (SELECT COUNT(*) FROM public.guests WHERE status = 'confirmed')),
      jsonb_build_object('status', 'Pending',   'count', (SELECT COUNT(*) FROM public.guests WHERE status = 'pending')),
      jsonb_build_object('status', 'Declined',  'count', (SELECT COUNT(*) FROM public.guests WHERE status = 'declined')),
      jsonb_build_object('status', 'Tentative', 'count', (SELECT COUNT(*) FROM public.guests WHERE status = 'tentative'))
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
        SELECT category_id, COUNT(*) AS guest_count
        FROM   public.guest_categories
        GROUP  BY category_id
      ) cnt ON cnt.category_id = c.id
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
        SELECT * FROM public.scan_logs ORDER BY scanned_at DESC LIMIT 10
      ) sl
      LEFT JOIN public.guests g ON g.id = sl.guest_id
      LEFT JOIN public.users  u ON u.id = sl.scanned_by
    )
  )
$$;



-- ------------------------------------------------------------
-- 1. create_guest_full
--    Inserts a guest + categories + event_attendance atomically.
--    Replaces 3 sequential round-trips in createGuest().
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
  p_reception_attending    boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_guest_id uuid;
  v_guest    jsonb;
BEGIN
  -- Insert guest
  INSERT INTO public.guests (
    first_name, last_name, email, phone, status,
    dietary_restrictions, notes, is_plus_one
  )
  VALUES (
    p_first_name,
    p_last_name,
    NULLIF(p_email, ''),
    NULLIF(p_phone, ''),
    p_status,
    NULLIF(p_dietary_restrictions, ''),
    NULLIF(p_notes, ''),
    p_is_plus_one
  )
  RETURNING id INTO v_guest_id;

  -- Insert category associations
  IF p_category_ids IS NOT NULL AND array_length(p_category_ids, 1) > 0 THEN
    INSERT INTO public.guest_categories (guest_id, category_id)
    SELECT v_guest_id, unnest(p_category_ids);
  END IF;

  -- Insert event attendance
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


-- ------------------------------------------------------------
-- 2. update_guest_with_categories
--    Updates guest fields and replaces category assignments
--    atomically (DELETE + INSERT in a single transaction).
--    Replaces 3 sequential round-trips in updateGuest().
--
--    Pass p_category_ids = NULL to skip category update.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_guest_with_categories(
  p_guest_id     uuid,
  p_fields       jsonb,
  p_category_ids uuid[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  UPDATE public.guests
  SET
    first_name           = CASE WHEN p_fields ? 'first_name'           THEN p_fields->>'first_name'                         ELSE first_name           END,
    last_name            = CASE WHEN p_fields ? 'last_name'            THEN p_fields->>'last_name'                          ELSE last_name            END,
    email                = CASE WHEN p_fields ? 'email'                THEN NULLIF(p_fields->>'email', '')                  ELSE email                END,
    phone                = CASE WHEN p_fields ? 'phone'                THEN NULLIF(p_fields->>'phone', '')                  ELSE phone                END,
    status               = CASE WHEN p_fields ? 'status'               THEN p_fields->>'status'                             ELSE status               END,
    dietary_restrictions = CASE WHEN p_fields ? 'dietary_restrictions' THEN NULLIF(p_fields->>'dietary_restrictions', '')   ELSE dietary_restrictions END,
    notes                = CASE WHEN p_fields ? 'notes'                THEN NULLIF(p_fields->>'notes', '')                  ELSE notes                END,
    is_plus_one          = CASE WHEN p_fields ? 'is_plus_one'          THEN (p_fields->>'is_plus_one')::boolean             ELSE is_plus_one          END,
    updated_at           = now()
  WHERE id = p_guest_id;

  -- Only replace categories when the caller explicitly passes the array
  IF p_category_ids IS NOT NULL THEN
    DELETE FROM public.guest_categories WHERE guest_id = p_guest_id;

    IF array_length(p_category_ids, 1) > 0 THEN
      INSERT INTO public.guest_categories (guest_id, category_id)
      SELECT p_guest_id, unnest(p_category_ids);
    END IF;
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;


-- ------------------------------------------------------------
-- 3. process_guest_scan
--    Looks up a guest by invitation_guid, checks for a
--    duplicate scan today, logs the scan, and returns the
--    guest data + updated today stats — all in one round-trip.
--    Replaces 3 sequential calls + 1 stats refresh.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.process_guest_scan(
  p_invitation_guid  uuid,
  p_event_type       text,
  p_scanned_by       uuid
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
  -- Find guest by invitation GUID
  SELECT id, first_name, last_name, status
  INTO   v_guest_id, v_first_name, v_last_name, v_status
  FROM   public.guests
  WHERE  invitation_guid = p_invitation_guid;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('found', false);
  END IF;

  -- Check for a non-duplicate scan today for the same event
  SELECT EXISTS (
    SELECT 1
    FROM   public.scan_logs
    WHERE  guest_id     = v_guest_id
      AND  event_type   = p_event_type
      AND  is_duplicate = false
      AND  scanned_at::date = current_date
  ) INTO v_is_duplicate;

  -- Log this scan
  INSERT INTO public.scan_logs (guest_id, scanned_by, event_type, is_duplicate)
  VALUES (v_guest_id, p_scanned_by, p_event_type, v_is_duplicate);

  -- Compute today's unique check-ins (after the insert above)
  SELECT COUNT(DISTINCT guest_id) INTO v_ceremony_count
  FROM   public.scan_logs
  WHERE  event_type = 'ceremony' AND is_duplicate = false AND scanned_at::date = current_date;

  SELECT COUNT(DISTINCT guest_id) INTO v_reception_count
  FROM   public.scan_logs
  WHERE  event_type = 'reception' AND is_duplicate = false AND scanned_at::date = current_date;

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
