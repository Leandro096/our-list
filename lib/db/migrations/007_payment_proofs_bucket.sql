-- ============================================================
-- Wedding List — Migration 007: payment-proofs storage bucket
-- Idempotent. Safe to re-run.
--
-- Creates the private bucket used by the bank-transfer flow to store payment
-- proofs. The RLS policies on storage.objects were added in migration 003;
-- this guarantees the bucket itself exists so uploads don't fail.
-- ============================================================

BEGIN;

INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-proofs', 'payment-proofs', false)
ON CONFLICT (id) DO NOTHING;

COMMIT;
