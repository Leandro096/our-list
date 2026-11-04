-- Short invitation links: /i/<short_code>
-- Run once in the Supabase SQL editor. Safe to re-run.

CREATE OR REPLACE FUNCTION public.generate_guest_short_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  -- No 0/o/1/l/i so codes survive being read aloud or retyped.
  alphabet constant text := 'abcdefghjkmnpqrstuvwxyz23456789';
  candidate text;
  i int;
BEGIN
  LOOP
    candidate := '';
    FOR i IN 1..6 LOOP
      candidate := candidate || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.guests WHERE short_code = candidate);
  END LOOP;
  RETURN candidate;
END;
$$;

ALTER TABLE public.guests
  ADD COLUMN IF NOT EXISTS short_code text,
  ADD COLUMN IF NOT EXISTS invitation_sent_at timestamptz;

UPDATE public.guests
SET short_code = public.generate_guest_short_code()
WHERE short_code IS NULL;

ALTER TABLE public.guests
  ALTER COLUMN short_code SET DEFAULT public.generate_guest_short_code(),
  ALTER COLUMN short_code SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS guests_short_code_key ON public.guests (short_code);
