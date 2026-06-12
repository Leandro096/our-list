-- ============================================================
-- Wedding List — Phase 2: is_locked trigger + billing helpers
-- Run AFTER deploying Phase 2 app code.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- A. auto-lock events when event_date passes
--
-- lock_past_events() can be called:
--   1. Via Supabase Scheduled Function (pg_cron or Edge Cron) once a day.
--   2. Manually from the admin panel.
--
-- The AFTER INSERT OR UPDATE trigger also locks an event
-- immediately if it's saved with a past event_date.
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.lock_past_events()
RETURNS void
LANGUAGE sql
SECURITY INVOKER
AS $$
  UPDATE public.events
  SET    is_locked  = true,
         updated_at = now()
  WHERE  is_locked  = false
    AND  event_date IS NOT NULL
    AND  event_date < CURRENT_DATE;
$$;

GRANT EXECUTE ON FUNCTION public.lock_past_events() TO service_role;

CREATE OR REPLACE FUNCTION public._auto_lock_event_on_date()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  IF NEW.event_date IS NOT NULL AND NEW.event_date < CURRENT_DATE THEN
    NEW.is_locked  := true;
    NEW.updated_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_lock_event ON public.events;

CREATE TRIGGER trg_auto_lock_event
  BEFORE INSERT OR UPDATE OF event_date ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public._auto_lock_event_on_date();


-- ------------------------------------------------------------
-- B. record_payment_event(payment_id, tenant_id, event_type, payload)
--    Convenience function used by billing Server Actions to log
--    every state transition into payment_events atomically.
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.record_payment_event(
  p_payment_id  UUID,
  p_tenant_id   UUID,
  p_event_type  TEXT,
  p_payload     JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE sql
SECURITY INVOKER
AS $$
  INSERT INTO public.payment_events
    (payment_id, tenant_id, source, event_type, raw_payload)
  VALUES
    (p_payment_id, p_tenant_id, 'manual', p_event_type, p_payload)
  RETURNING id;
$$;

GRANT EXECUTE ON FUNCTION public.record_payment_event(UUID, UUID, TEXT, JSONB)
  TO authenticated;


-- ------------------------------------------------------------
-- C. confirm_payment(payment_id, reviewed_by, notes)
--    Atomically:
--      1. Updates payment → confirmed
--      2. Activates the linked subscription
--      3. Logs to payment_events
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.confirm_payment(
  p_payment_id   UUID,
  p_reviewed_by  UUID,
  p_notes        TEXT DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_tenant_id        UUID;
  v_subscription_id  UUID;
  v_plan_id          UUID;
  v_billing_type     TEXT;
  v_period_months    INT;
BEGIN
  -- Lock the payment row
  SELECT tenant_id, subscription_id, plan_id
  INTO   v_tenant_id, v_subscription_id, v_plan_id
  FROM   public.payments
  WHERE  id = p_payment_id AND status = 'pending'
  FOR    UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Payment not found or already processed');
  END IF;

  -- Confirm the payment
  UPDATE public.payments
  SET    status      = 'confirmed',
         reviewed_by = p_reviewed_by,
         reviewed_at = now(),
         notes       = COALESCE(p_notes, notes),
         updated_at  = now()
  WHERE  id = p_payment_id;

  -- Determine billing_type to set period_end correctly
  SELECT billing_type
  INTO   v_billing_type
  FROM   public.subscriptions
  WHERE  id = v_subscription_id;

  -- one_time: period_end = NULL (never expires, locks on event_date)
  -- recurring: period_end = now() + 1 month (simplified; Stripe handles this in Phase 4)
  v_period_months := CASE WHEN v_billing_type = 'recurring' THEN 1 ELSE NULL::int END;

  -- Activate subscription
  UPDATE public.subscriptions
  SET    status                = 'active',
         current_period_start  = now(),
         current_period_end    = CASE
                                   WHEN v_period_months IS NOT NULL
                                     THEN now() + (v_period_months || ' months')::interval
                                   ELSE NULL
                                 END,
         updated_at            = now()
  WHERE  id = v_subscription_id;

  -- Audit log
  PERFORM public.record_payment_event(
    p_payment_id,
    v_tenant_id,
    'payment.confirmed',
    jsonb_build_object(
      'reviewed_by',      p_reviewed_by,
      'subscription_id',  v_subscription_id,
      'notes',            p_notes
    )
  );

  RETURN jsonb_build_object('ok', true, 'subscription_id', v_subscription_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.confirm_payment(UUID, UUID, TEXT) TO authenticated;


-- ------------------------------------------------------------
-- D. reject_payment(payment_id, reviewed_by, notes)
--    Marks payment as rejected and logs to payment_events.
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.reject_payment(
  p_payment_id   UUID,
  p_reviewed_by  UUID,
  p_notes        TEXT DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  SELECT tenant_id
  INTO   v_tenant_id
  FROM   public.payments
  WHERE  id = p_payment_id AND status = 'pending'
  FOR    UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Payment not found or already processed');
  END IF;

  UPDATE public.payments
  SET    status      = 'rejected',
         reviewed_by = p_reviewed_by,
         reviewed_at = now(),
         notes       = p_notes,
         updated_at  = now()
  WHERE  id = p_payment_id;

  PERFORM public.record_payment_event(
    p_payment_id,
    v_tenant_id,
    'payment.rejected',
    jsonb_build_object('reviewed_by', p_reviewed_by, 'notes', p_notes)
  );

  RETURN jsonb_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.reject_payment(UUID, UUID, TEXT) TO authenticated;


-- ------------------------------------------------------------
-- E. Storage bucket policy (run once in Supabase dashboard OR here)
--
-- Creates the `payment-proofs` bucket (private) and RLS policies
-- so tenants can upload their own proof; platform billing admins
-- can read any proof; owners/admins can read their own.
--
-- NOTE: bucket creation via SQL requires pg_graphql or the
-- Supabase management API. Use the Supabase Dashboard Storage
-- section to create the bucket manually with "Private" toggle,
-- then these policies will apply once the bucket exists.
-- ------------------------------------------------------------

-- Allow authenticated users to INSERT into their own tenant folder:
--   storage/payment-proofs/{tenant_id}/{filename}
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE polname = 'tenant_upload_own_proof'
      AND tablename = 'objects'
      AND schemaname = 'storage'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY tenant_upload_own_proof
        ON storage.objects FOR INSERT
        TO authenticated
        WITH CHECK (
          bucket_id = 'payment-proofs'
          AND (storage.foldername(name))[1] = (auth.uid())::text
        )
    $pol$;
  END IF;
END $$;

-- Allow tenants to read their own proof files:
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE polname = 'tenant_read_own_proof'
      AND tablename = 'objects'
      AND schemaname = 'storage'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY tenant_read_own_proof
        ON storage.objects FOR SELECT
        TO authenticated
        USING (
          bucket_id = 'payment-proofs'
          AND (storage.foldername(name))[1] = (auth.uid())::text
        )
    $pol$;
  END IF;
END $$;

-- Allow platform billing role to read all proof files:
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE polname = 'platform_billing_read_all_proofs'
      AND tablename = 'objects'
      AND schemaname = 'storage'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY platform_billing_read_all_proofs
        ON storage.objects FOR SELECT
        TO authenticated
        USING (
          bucket_id = 'payment-proofs'
          AND public.has_platform_permission('platform.billing.view')
        )
    $pol$;
  END IF;
END $$;

-- ------------------------------------------------------------
-- F. increment_date_changes_used(event_id, new_date)
--    Atomically sets event_date and increments date_changes_used.
--    Called by updateEventDate() in event.service.ts AFTER the
--    limit check (assertCanChangeEventDate) passes.
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.increment_date_changes_used(
  p_event_id UUID,
  p_new_date DATE
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_new_count INT;
BEGIN
  UPDATE public.events
  SET    event_date        = p_new_date,
         date_changes_used = date_changes_used + 1,
         updated_at        = now()
  WHERE  id = p_event_id
  RETURNING date_changes_used INTO v_new_count;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event not found: %', p_event_id;
  END IF;

  RETURN jsonb_build_object('date_changes_used', v_new_count);
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_date_changes_used(UUID, DATE) TO authenticated;

COMMIT;
