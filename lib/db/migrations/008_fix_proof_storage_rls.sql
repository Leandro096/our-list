-- ============================================================
-- Wedding List — Migration 008: fix payment-proofs storage RLS
-- Idempotent. Safe to re-run.
--
-- Migration 003's tenant_upload_own_proof / tenant_read_own_proof policies
-- checked (storage.foldername(name))[1] = auth.uid() — but the actual
-- upload path used by submitPaymentProofAction is
-- `payment-proofs/{tenant_id}/{filename}`, not `{auth.uid()}/{filename}`.
-- That mismatch meant a regular tenant member could never upload or read
-- their own proof (the policy folder check always failed), only owners
-- whose auth.uid() happened to equal the tenant id — never true in
-- practice. Replace both policies to check tenant membership of the
-- folder via is_tenant_member(), matching the real path layout.
-- ============================================================

BEGIN;

DROP POLICY IF EXISTS tenant_upload_own_proof ON storage.objects;
DROP POLICY IF EXISTS tenant_read_own_proof ON storage.objects;

CREATE POLICY tenant_upload_own_proof
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'payment-proofs'
    AND public.is_tenant_member(((storage.foldername(name))[1])::uuid)
  );

CREATE POLICY tenant_read_own_proof
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'payment-proofs'
    AND public.is_tenant_member(((storage.foldername(name))[1])::uuid)
  );

COMMIT;
