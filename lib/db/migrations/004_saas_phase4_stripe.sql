-- ============================================================
-- Migration 004 — Stripe fields
-- Safe to run multiple times (idempotent via IF NOT EXISTS / IF EXISTS).
-- ============================================================

BEGIN;

-- Add Stripe customer ID to tenants so we can create/retrieve a Customer
-- in the Stripe dashboard that maps 1-to-1 with each tenant.
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT UNIQUE;

COMMIT;
