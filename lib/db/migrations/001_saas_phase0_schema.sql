-- ================================================================
-- MIGRATION 001: SaaS Multi-tenant Phase 0
-- Wedding List → Multi-tenant SaaS
--
-- Idempotent — safe to re-run. Wrapped in a single transaction.
--
-- Sections:
--   A. Platform RBAC tables (platform_roles, platform_permissions, …)
--   B. Tenant / Plan / Billing tables (plans, features, tenants, subscriptions, payments, …)
--   C. Event hierarchy tables (events, event_sessions, statuses, tenant_members, event_members)
--   D. Alter existing tables — add nullable columns
--   E. Seed global data (sessions, statuses, plans, features, permissions, roles)
--   F. Default tenant + event (production data migration — skipped if tenants already exist)
--   G. Populate new FK columns from existing data
--   H. Migrate user_roles → tenant_members (supplement)
--   I. Migrate is_super_admin → platform_user_roles
--   J. RLS policies on all new tables
--
--   --- SECTION K is commented out ---
--   K. Phase 0b constraints: run AFTER Phase 1 app code is deployed
--      (NOT NULL enforcement, updated UNIQUE indices, drop old columns)
-- ================================================================

BEGIN;

-- ================================================================
-- SECTION A: Platform RBAC tables
-- Independent of tenant data — create first.
-- ================================================================

CREATE TABLE IF NOT EXISTS public.platform_roles (
  id          uuid        NOT NULL DEFAULT uuid_generate_v4(),
  name        text        NOT NULL UNIQUE,
  description text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT platform_roles_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.platform_permissions (
  id          uuid        NOT NULL DEFAULT uuid_generate_v4(),
  scope       text        NOT NULL UNIQUE,
  name        text        NOT NULL,
  description text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT platform_permissions_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.platform_role_permissions (
  id            uuid        NOT NULL DEFAULT uuid_generate_v4(),
  role_id       uuid        NOT NULL REFERENCES public.platform_roles(id)       ON DELETE CASCADE,
  permission_id uuid        NOT NULL REFERENCES public.platform_permissions(id) ON DELETE CASCADE,
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT platform_role_permissions_pkey        PRIMARY KEY (id),
  CONSTRAINT platform_role_permissions_unique       UNIQUE (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS public.platform_user_roles (
  id          uuid        NOT NULL DEFAULT uuid_generate_v4(),
  user_id     uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role_id     uuid        NOT NULL REFERENCES public.platform_roles(id) ON DELETE CASCADE,
  assigned_by uuid        REFERENCES public.users(id),
  assigned_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT platform_user_roles_pkey   PRIMARY KEY (id),
  CONSTRAINT platform_user_roles_unique UNIQUE (user_id, role_id)
);

-- ================================================================
-- SECTION B: Tenant / Plan / Billing tables
-- Order: plans → features → plan_features → tenants → subscriptions → payments → payment_events
-- ================================================================

CREATE TABLE IF NOT EXISTS public.plans (
  id                    uuid        NOT NULL DEFAULT uuid_generate_v4(),
  code                  text        NOT NULL UNIQUE,
  name                  text        NOT NULL,
  description           text,
  scope                 text        NOT NULL CHECK (scope IN ('individual', 'organization')),
  billing_type          text        NOT NULL CHECK (billing_type IN ('one_time', 'recurring')),
  max_events            integer     NOT NULL DEFAULT 1,
  max_guests_per_event  integer     NOT NULL DEFAULT 150,
  max_members           integer     NOT NULL DEFAULT 1,
  max_free_date_changes integer     NOT NULL DEFAULT 1,
  price_amount          numeric(10,2) NOT NULL DEFAULT 0,
  price_currency        text        NOT NULL DEFAULT 'USD',
  stripe_price_id       text,
  is_active             boolean     NOT NULL DEFAULT true,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT plans_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.features (
  id          uuid        NOT NULL DEFAULT uuid_generate_v4(),
  key         text        NOT NULL UNIQUE,
  name        text        NOT NULL,
  description text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT features_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.plan_features (
  plan_id    uuid    NOT NULL REFERENCES public.plans(id)    ON DELETE CASCADE,
  feature_id uuid    NOT NULL REFERENCES public.features(id) ON DELETE CASCADE,
  enabled    boolean NOT NULL DEFAULT true,
  CONSTRAINT plan_features_pkey PRIMARY KEY (plan_id, feature_id)
);

CREATE TABLE IF NOT EXISTS public.tenants (
  id         uuid        NOT NULL DEFAULT uuid_generate_v4(),
  type       text        NOT NULL CHECK (type IN ('individual', 'organization')),
  name       text        NOT NULL,
  owner_id   uuid        NOT NULL REFERENCES public.users(id),
  subdomain  text        UNIQUE,
  status     text        NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tenants_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id                     uuid        NOT NULL DEFAULT uuid_generate_v4(),
  tenant_id              uuid        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  plan_id                uuid        NOT NULL REFERENCES public.plans(id),
  billing_type           text        NOT NULL CHECK (billing_type IN ('one_time', 'recurring')),
  status                 text        NOT NULL DEFAULT 'pending'
                           CHECK (status IN ('pending', 'active', 'past_due', 'canceled', 'expired')),
  current_period_start   timestamptz NOT NULL DEFAULT now(),
  current_period_end     timestamptz,
  stripe_subscription_id text        UNIQUE,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT subscriptions_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.payments (
  id                       uuid           NOT NULL DEFAULT uuid_generate_v4(),
  tenant_id                uuid           NOT NULL REFERENCES public.tenants(id)       ON DELETE CASCADE,
  subscription_id          uuid           REFERENCES public.subscriptions(id),
  plan_id                  uuid           NOT NULL REFERENCES public.plans(id),
  amount                   numeric(10,2)  NOT NULL,
  currency                 text           NOT NULL DEFAULT 'USD',
  method                   text           NOT NULL DEFAULT 'bank_transfer'
                             CHECK (method IN ('bank_transfer', 'card', 'manual')),
  status                   text           NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('pending', 'confirmed', 'rejected')),
  proof_url                text,
  reference                text,
  submitted_by             uuid           REFERENCES public.users(id),
  submitted_at             timestamptz,
  reviewed_by              uuid           REFERENCES public.users(id),
  reviewed_at              timestamptz,
  notes                    text,
  stripe_payment_intent_id text,
  created_at               timestamptz    NOT NULL DEFAULT now(),
  updated_at               timestamptz    NOT NULL DEFAULT now(),
  CONSTRAINT payments_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.payment_events (
  id          uuid        NOT NULL DEFAULT uuid_generate_v4(),
  payment_id  uuid        REFERENCES public.payments(id),
  tenant_id   uuid        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  source      text        NOT NULL CHECK (source IN ('stripe', 'manual')),
  event_type  text        NOT NULL,
  raw_payload jsonb,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT payment_events_pkey PRIMARY KEY (id)
);

-- ================================================================
-- SECTION C: Event hierarchy tables
-- Order: events → event_sessions / statuses → tenant_members → event_members
-- ================================================================

CREATE TABLE IF NOT EXISTS public.events (
  id               uuid        NOT NULL DEFAULT uuid_generate_v4(),
  tenant_id        uuid        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name             text        NOT NULL,
  event_date       date,
  date_changes_used integer    NOT NULL DEFAULT 0,
  is_locked        boolean     NOT NULL DEFAULT false,
  status           text        NOT NULL DEFAULT 'active'
                     CHECK (status IN ('active', 'archived', 'cancelled')),
  subscription_id  uuid        REFERENCES public.subscriptions(id),
  created_by       uuid        REFERENCES public.users(id),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT events_pkey PRIMARY KEY (id)
);

-- event_sessions: global rows have event_id IS NULL + is_global = true
CREATE TABLE IF NOT EXISTS public.event_sessions (
  id         uuid        NOT NULL DEFAULT uuid_generate_v4(),
  event_id   uuid        REFERENCES public.events(id) ON DELETE CASCADE,
  key        text        NOT NULL,
  label      text        NOT NULL,
  sort_order integer     NOT NULL DEFAULT 0,
  is_global  boolean     NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT event_sessions_pkey PRIMARY KEY (id)
);

-- Global sessions: unique by key when is_global = true
CREATE UNIQUE INDEX IF NOT EXISTS event_sessions_global_key_unique
  ON public.event_sessions(key) WHERE is_global = true;

-- Per-event sessions: unique by (event_id, key)
CREATE UNIQUE INDEX IF NOT EXISTS event_sessions_event_key_unique
  ON public.event_sessions(event_id, key) WHERE is_global = false;

-- statuses: global rows have tenant_id IS NULL + event_id IS NULL + is_global = true
CREATE TABLE IF NOT EXISTS public.statuses (
  id         uuid        NOT NULL DEFAULT uuid_generate_v4(),
  tenant_id  uuid        REFERENCES public.tenants(id) ON DELETE CASCADE,
  event_id   uuid        REFERENCES public.events(id)  ON DELETE CASCADE,
  key        text        NOT NULL,
  label      text        NOT NULL,
  color      text        NOT NULL DEFAULT '#6B7280',
  sort_order integer     NOT NULL DEFAULT 0,
  is_global  boolean     NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT statuses_pkey PRIMARY KEY (id)
);

CREATE UNIQUE INDEX IF NOT EXISTS statuses_global_key_unique
  ON public.statuses(key) WHERE is_global = true;

-- tenant_members: one row per (tenant, user); single role per tenant
CREATE TABLE IF NOT EXISTS public.tenant_members (
  id         uuid        NOT NULL DEFAULT uuid_generate_v4(),
  tenant_id  uuid        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id    uuid        NOT NULL REFERENCES public.users(id)   ON DELETE CASCADE,
  role_id    uuid        NOT NULL REFERENCES public.roles(id),
  invited_by uuid        REFERENCES public.users(id),
  status     text        NOT NULL DEFAULT 'active'
               CHECK (status IN ('invited', 'active')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tenant_members_pkey              PRIMARY KEY (id),
  CONSTRAINT tenant_members_tenant_user_unique UNIQUE (tenant_id, user_id)
);

-- event_members: controls event visibility for non-admin tenant members
CREATE TABLE IF NOT EXISTS public.event_members (
  id               uuid        NOT NULL DEFAULT uuid_generate_v4(),
  event_id         uuid        NOT NULL REFERENCES public.events(id)          ON DELETE CASCADE,
  tenant_member_id uuid        NOT NULL REFERENCES public.tenant_members(id)  ON DELETE CASCADE,
  created_by       uuid        REFERENCES public.users(id),
  created_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT event_members_pkey         PRIMARY KEY (id),
  CONSTRAINT event_members_event_member_unique UNIQUE (event_id, tenant_member_id)
);

-- ================================================================
-- SECTION D: Alter existing tables — add nullable columns
-- All new columns are nullable so existing code continues to work
-- until Phase 1 switches the app to the new columns.
-- ================================================================

-- permissions: add name (used in new granular seed; backward-compatible)
ALTER TABLE public.permissions
  ADD COLUMN IF NOT EXISTS name text;

-- guests: add event_id + status_id (nullable until Phase 0b)
ALTER TABLE public.guests
  ADD COLUMN IF NOT EXISTS event_id  uuid REFERENCES public.events(id),
  ADD COLUMN IF NOT EXISTS status_id uuid REFERENCES public.statuses(id);

-- categories: add event_id (nullable until Phase 0b)
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS event_id uuid REFERENCES public.events(id);

-- tables: add event_id (nullable until Phase 0b)
ALTER TABLE public.tables
  ADD COLUMN IF NOT EXISTS event_id uuid REFERENCES public.events(id);

-- event_attendance: add session_id (replaces event_type text in Phase 0b)
ALTER TABLE public.event_attendance
  ADD COLUMN IF NOT EXISTS session_id uuid REFERENCES public.event_sessions(id);

-- scan_logs: add event_id + session_id (nullable until Phase 0b)
ALTER TABLE public.scan_logs
  ADD COLUMN IF NOT EXISTS event_id   uuid REFERENCES public.events(id),
  ADD COLUMN IF NOT EXISTS session_id uuid REFERENCES public.event_sessions(id);

-- ================================================================
-- SECTION E: Seed global data
-- All inserts are ON CONFLICT DO NOTHING — safe to re-run.
-- ================================================================

-- ---- Global event sessions ----
INSERT INTO public.event_sessions (key, label, sort_order, is_global)
VALUES
  ('ceremony',  'Ceremony',  1, true),
  ('reception', 'Reception', 2, true)
ON CONFLICT DO NOTHING;

-- ---- Global statuses ----
INSERT INTO public.statuses (key, label, color, sort_order, is_global)
VALUES
  ('pending',   'Pending',   '#F59E0B', 1, true),
  ('confirmed', 'Confirmed', '#22C55E', 2, true),
  ('declined',  'Declined',  '#EF4444', 3, true),
  ('tentative', 'Tentative', '#6B7280', 4, true)
ON CONFLICT DO NOTHING;

-- ---- Plans ----
INSERT INTO public.plans
  (code, name, description, scope, billing_type, max_events, max_guests_per_event, max_members, max_free_date_changes, price_amount, price_currency, is_active)
VALUES
  ('individual',  'Individual',  'One-time plan for a single event',                'individual',   'one_time',  1,   150,   1,  1, 49.00,  'USD', true),
  ('org_starter', 'Org Starter', 'For small planning teams (up to 5 members)',      'organization', 'recurring', 3,   200,   5,  2, 29.00,  'USD', true),
  ('org_pro',     'Org Pro',     'For professional planners (up to 20 members)',    'organization', 'recurring', 10,  500,  20,  3, 79.00,  'USD', true),
  ('org_elite',   'Org Elite',   'Unlimited events, custom subdomain, white label', 'organization', 'recurring', 999, 1000, 100, 5, 149.00, 'USD', true)
ON CONFLICT (code) DO NOTHING;

-- ---- Features (boolean flags) ----
INSERT INTO public.features (key, name, description)
VALUES
  ('custom_subdomain', 'Custom Subdomain', 'Access the platform via org.yourdomain.com'),
  ('excel_export',     'Excel Export',     'Export guest lists and reports to Excel/CSV'),
  ('white_label',      'White Label',      'Remove Wedding List branding from the interface'),
  ('priority_support', 'Priority Support', 'Priority email and chat support channel')
ON CONFLICT (key) DO NOTHING;

-- ---- Plan → Feature mapping ----
INSERT INTO public.plan_features (plan_id, feature_id, enabled)
SELECT p.id, f.id, true
FROM public.plans p
JOIN public.features f ON (
  (p.code = 'org_starter' AND f.key IN ('excel_export'))
  OR (p.code = 'org_pro'     AND f.key IN ('excel_export', 'white_label', 'priority_support'))
  OR (p.code = 'org_elite'   AND f.key IN ('excel_export', 'white_label', 'priority_support', 'custom_subdomain'))
)
ON CONFLICT DO NOTHING;

-- ---- Tenant-level permissions (granular) ----
INSERT INTO public.permissions (scope, name, description)
VALUES
  -- Dashboard
  ('dashboard.view',                'View Dashboard',          'Access the main dashboard page'),
  ('dashboard.stats',               'View Dashboard Stats',    'See aggregated statistics on the dashboard'),
  -- Guest list
  ('guests.list.view',              'View Guest List',         'View the paginated guest list'),
  ('guests.list.filters',           'Use Guest Filters',       'Apply search and filters on the guest list'),
  ('guests.list.create',            'Create Guest',            'Add a new guest to the list'),
  ('guests.list.export',            'Export Guests',           'Export the guest list to Excel/CSV'),
  -- Guest detail
  ('guests.detail.view',            'View Guest Detail',       'Open and view a guest''s detail panel'),
  ('guests.detail.edit',            'Edit Guest',              'Edit guest information'),
  ('guests.detail.delete',          'Delete Guest',            'Permanently delete a guest'),
  ('guests.detail.qr',              'Generate Guest QR',       'View and download the QR code for a guest'),
  -- Seating
  ('seating.board.view',            'View Seating Board',      'Access the seating arrangement board'),
  ('seating.board.assign',          'Assign Seating',          'Drag and drop guests to assign seats'),
  ('seating.tables.create',         'Create Tables',           'Add new tables to the seating layout'),
  -- Scanner
  ('scanner.scan.use',              'Use Scanner',             'Scan QR codes to check guests in'),
  ('scanner.history.view',          'View Scan History',       'View the check-in scan history log'),
  -- Categories
  ('categories.manage.create',      'Create Categories',       'Create new guest categories'),
  ('categories.manage.edit',        'Edit Categories',         'Edit existing guest category names and colors'),
  ('categories.manage.delete',      'Delete Categories',       'Delete guest categories'),
  -- Statuses
  ('statuses.manage.create',        'Create Statuses',         'Create custom guest statuses for this event'),
  ('statuses.manage.edit',          'Edit Statuses',           'Edit existing custom guest statuses'),
  ('statuses.manage.delete',        'Delete Statuses',         'Delete custom guest statuses'),
  -- Sessions
  ('sessions.manage.create',        'Create Event Sessions',   'Create new event sessions (e.g. cocktail hour)'),
  ('sessions.manage.edit',          'Edit Event Sessions',     'Rename and reorder event sessions'),
  ('sessions.manage.delete',        'Delete Event Sessions',   'Delete custom event sessions'),
  -- Events / projects
  ('events.create',                 'Create Events',           'Create a new event / wedding project'),
  ('events.edit.date',              'Edit Event Date',         'Change the scheduled date of an event'),
  ('events.members.assign',         'Assign Event Members',    'Add or remove tenant members from an event'),
  -- Settings
  ('settings.members.invite',       'Invite Members',          'Send invitations to new tenant members'),
  ('settings.roles.edit',           'Edit Roles',              'Manage tenant roles and permission assignments'),
  ('settings.billing.view',         'View Billing',            'View subscription and billing history'),
  ('settings.billing.submit_proof', 'Submit Payment Proof',    'Upload a bank transfer proof for manual billing')
ON CONFLICT (scope) DO NOTHING;

-- ---- Platform permissions ----
INSERT INTO public.platform_permissions (scope, name, description)
VALUES
  ('platform.tenants.view',    'View Tenants',          'List and view all tenant accounts'),
  ('platform.tenants.manage',  'Manage Tenants',        'Create, edit, suspend, and cancel tenant accounts'),
  ('platform.plans.manage',    'Manage Plans',          'Create, edit, and deactivate subscription plans'),
  ('platform.features.manage', 'Manage Features',       'Manage feature flags and their plan assignments'),
  ('platform.billing.view',    'View All Billing',      'View all pending and historical payment records'),
  ('platform.billing.confirm', 'Confirm Payments',      'Confirm manual bank transfer payment submissions'),
  ('platform.billing.reject',  'Reject Payments',       'Reject invalid or fraudulent payment submissions'),
  ('platform.globals.manage',  'Manage Global Data',    'Edit global statuses and event session templates'),
  ('platform.roles.manage',    'Manage Platform Roles', 'Manage platform-level roles and permission grants'),
  ('platform.users.manage',    'Manage Users',          'View and administrate all registered platform users')
ON CONFLICT (scope) DO NOTHING;

-- ---- Platform roles ----
INSERT INTO public.platform_roles (name, description)
VALUES
  ('platform_superadmin', 'Full access to all platform administration capabilities'),
  ('platform_billing',    'Can review, confirm, and reject manual payment submissions'),
  ('platform_support',    'Read-only access to tenant and user data for support purposes')
ON CONFLICT (name) DO NOTHING;

-- Assign ALL platform permissions to platform_superadmin
INSERT INTO public.platform_role_permissions (role_id, permission_id)
SELECT pr.id, pp.id
FROM public.platform_roles pr
CROSS JOIN public.platform_permissions pp
WHERE pr.name = 'platform_superadmin'
ON CONFLICT DO NOTHING;

-- Billing role: billing + tenant view
INSERT INTO public.platform_role_permissions (role_id, permission_id)
SELECT pr.id, pp.id
FROM public.platform_roles pr
JOIN public.platform_permissions pp ON pp.scope IN (
  'platform.billing.view', 'platform.billing.confirm', 'platform.billing.reject',
  'platform.tenants.view'
)
WHERE pr.name = 'platform_billing'
ON CONFLICT DO NOTHING;

-- Support role: tenant + user view
INSERT INTO public.platform_role_permissions (role_id, permission_id)
SELECT pr.id, pp.id
FROM public.platform_roles pr
JOIN public.platform_permissions pp ON pp.scope IN (
  'platform.tenants.view', 'platform.users.manage'
)
WHERE pr.name = 'platform_support'
ON CONFLICT DO NOTHING;

-- ---- Tenant roles (add to existing roles table) ----
INSERT INTO public.roles (name, description)
VALUES
  ('owner',       'Full access to all tenant features and settings'),
  ('admin',       'Manage guests, seating, scanner, categories, sessions, and members'),
  ('coordinator', 'Manage guests, seating, and scanner; read-only on settings'),
  ('viewer',      'Read-only access to guests and dashboard')
ON CONFLICT (name) DO NOTHING;

-- ---- Seed permissions.name from scope for backward compat ----
UPDATE public.permissions
SET name = scope
WHERE name IS NULL;

-- ================================================================
-- SECTION F: Default tenant + event (production data migration)
-- Skipped automatically if any tenants already exist.
-- ================================================================

DO $$
DECLARE
  v_owner_id        uuid;
  v_tenant_id       uuid;
  v_plan_id         uuid;
  v_subscription_id uuid;
  v_event_id        uuid;
  v_owner_role_id   uuid;
  v_admin_role_id   uuid;
BEGIN
  -- Skip if tenants already exist (idempotent guard)
  IF (SELECT COUNT(*) FROM public.tenants) > 0 THEN
    RAISE NOTICE 'Tenants already exist — skipping default tenant creation.';
    RETURN;
  END IF;

  -- Prefer the first super-admin; fall back to the first registered user
  SELECT id INTO v_owner_id
  FROM public.users
  WHERE is_super_admin = true
  ORDER BY created_at
  LIMIT 1;

  IF v_owner_id IS NULL THEN
    SELECT id INTO v_owner_id FROM public.users ORDER BY created_at LIMIT 1;
  END IF;

  IF v_owner_id IS NULL THEN
    RAISE NOTICE 'No users found — skipping default tenant creation.';
    RETURN;
  END IF;

  -- Use the org_pro plan for the default migrated tenant
  SELECT id INTO v_plan_id FROM public.plans WHERE code = 'org_pro' LIMIT 1;

  SELECT id INTO v_owner_role_id FROM public.roles WHERE name = 'owner' LIMIT 1;
  SELECT id INTO v_admin_role_id  FROM public.roles WHERE name = 'admin' LIMIT 1;

  -- Create the default tenant
  INSERT INTO public.tenants (type, name, owner_id, status)
  VALUES ('organization', 'Mi Boda', v_owner_id, 'active')
  RETURNING id INTO v_tenant_id;

  -- Create an active subscription (no billing needed for migrated data)
  INSERT INTO public.subscriptions (tenant_id, plan_id, billing_type, status, current_period_start)
  VALUES (v_tenant_id, v_plan_id, 'recurring', 'active', now())
  RETURNING id INTO v_subscription_id;

  -- Create the default event
  -- event_date is set to 1 year out as a placeholder — admin should update it
  INSERT INTO public.events (tenant_id, name, event_date, status, subscription_id, created_by)
  VALUES (v_tenant_id, 'Mi Boda', (CURRENT_DATE + interval '1 year')::date, 'active', v_subscription_id, v_owner_id)
  RETURNING id INTO v_event_id;

  -- Add all existing users as tenant members
  -- Super-admins → owner role; all others → admin role
  INSERT INTO public.tenant_members (tenant_id, user_id, role_id, status)
  SELECT
    v_tenant_id,
    u.id,
    CASE WHEN u.is_super_admin THEN v_owner_role_id ELSE v_admin_role_id END,
    'active'
  FROM public.users u
  ON CONFLICT (tenant_id, user_id) DO NOTHING;

  RAISE NOTICE 'Default tenant created: id=%, event id=%, users migrated=%',
    v_tenant_id, v_event_id, (SELECT COUNT(*) FROM public.users);
END $$;

-- ================================================================
-- SECTION G: Populate new FK columns from existing data
-- ================================================================

-- ---- guests.event_id ----
UPDATE public.guests g
SET event_id = (
  SELECT e.id FROM public.events e ORDER BY e.created_at LIMIT 1
)
WHERE g.event_id IS NULL;

-- ---- guests.status_id (lookup from global statuses by text key) ----
UPDATE public.guests g
SET status_id = s.id
FROM public.statuses s
WHERE s.is_global = true
  AND s.key = g.status
  AND g.status_id IS NULL;

-- ---- categories.event_id ----
UPDATE public.categories c
SET event_id = (
  SELECT e.id FROM public.events e ORDER BY e.created_at LIMIT 1
)
WHERE c.event_id IS NULL;

-- ---- tables.event_id ----
UPDATE public.tables t
SET event_id = (
  SELECT e.id FROM public.events e ORDER BY e.created_at LIMIT 1
)
WHERE t.event_id IS NULL;

-- ---- scan_logs.event_id ----
UPDATE public.scan_logs sl
SET event_id = (
  SELECT e.id FROM public.events e ORDER BY e.created_at LIMIT 1
)
WHERE sl.event_id IS NULL;

-- ---- event_attendance: convert 'both' rows to separate ceremony + reception rows ----
DO $$
DECLARE
  rec            RECORD;
  v_ceremony_id  uuid;
  v_reception_id uuid;
BEGIN
  SELECT id INTO v_ceremony_id  FROM public.event_sessions WHERE is_global = true AND key = 'ceremony';
  SELECT id INTO v_reception_id FROM public.event_sessions WHERE is_global = true AND key = 'reception';

  IF v_ceremony_id IS NULL OR v_reception_id IS NULL THEN
    RAISE NOTICE 'Global sessions not found — skipping event_attendance migration.';
    RETURN;
  END IF;

  -- For each 'both' row: ensure a ceremony row exists for the guest,
  -- then convert the 'both' row itself to a reception row.
  FOR rec IN (
    SELECT id, guest_id, attending
    FROM public.event_attendance
    WHERE event_type = 'both' AND session_id IS NULL
  ) LOOP
    -- Insert ceremony row only if none already exists for this guest
    INSERT INTO public.event_attendance (guest_id, event_type, session_id, attending)
    SELECT rec.guest_id, 'ceremony', v_ceremony_id, rec.attending
    WHERE NOT EXISTS (
      SELECT 1 FROM public.event_attendance
      WHERE guest_id = rec.guest_id
        AND event_type = 'ceremony'
        AND id != rec.id
    );

    -- Rewrite the 'both' row as a reception row
    UPDATE public.event_attendance
    SET event_type = 'reception', session_id = v_reception_id
    WHERE id = rec.id;
  END LOOP;
END $$;

-- ---- event_attendance.session_id (ceremony / reception rows) ----
UPDATE public.event_attendance ea
SET session_id = es.id
FROM public.event_sessions es
WHERE es.is_global = true
  AND es.key = ea.event_type
  AND ea.session_id IS NULL;

-- ---- scan_logs.session_id ----
UPDATE public.scan_logs sl
SET session_id = es.id
FROM public.event_sessions es
WHERE es.is_global = true
  AND es.key = sl.event_type
  AND sl.session_id IS NULL;

-- ================================================================
-- SECTION H: Supplement tenant_members from user_roles
-- In case any user has a user_role entry but was not captured
-- in Section F (e.g. if tenants already existed before this run).
-- ================================================================

DO $$
DECLARE
  v_tenant_id uuid;
BEGIN
  -- Operate on the first (and currently only) tenant
  SELECT id INTO v_tenant_id FROM public.tenants ORDER BY created_at LIMIT 1;
  IF v_tenant_id IS NULL THEN RETURN; END IF;

  INSERT INTO public.tenant_members (tenant_id, user_id, role_id, status)
  SELECT DISTINCT
    v_tenant_id,
    ur.user_id,
    ur.role_id,
    'active'
  FROM public.user_roles ur
  WHERE NOT EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.user_id    = ur.user_id
      AND tm.tenant_id  = v_tenant_id
  )
  ON CONFLICT (tenant_id, user_id) DO UPDATE
    SET role_id = EXCLUDED.role_id;
END $$;

-- ================================================================
-- SECTION I: Migrate is_super_admin → platform_user_roles
-- ================================================================

INSERT INTO public.platform_user_roles (user_id, role_id)
SELECT u.id, pr.id
FROM public.users u
JOIN public.platform_roles pr ON pr.name = 'platform_superadmin'
WHERE u.is_super_admin = true
ON CONFLICT (user_id, role_id) DO NOTHING;

-- ================================================================
-- SECTION J: RLS on all new tables
-- ================================================================

ALTER TABLE public.tenants              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_events       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_members       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_members        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_sessions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.statuses             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.features             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_features        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_roles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_user_roles  ENABLE ROW LEVEL SECURITY;

-- ---- RLS helper functions ----

-- Returns true if the current user is an active member of the given tenant
CREATE OR REPLACE FUNCTION public.is_tenant_member(p_tenant_id uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_members
    WHERE tenant_id = p_tenant_id
      AND user_id   = auth.uid()
      AND status    = 'active'
  )
$$;

-- Returns true if the current user is an owner or admin of the given tenant
CREATE OR REPLACE FUNCTION public.is_tenant_admin(p_tenant_id uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.tenant_members tm
    JOIN public.roles r ON r.id = tm.role_id
    WHERE tm.tenant_id = p_tenant_id
      AND tm.user_id   = auth.uid()
      AND tm.status    = 'active'
      AND r.name IN ('owner', 'admin')
  )
$$;

-- Returns true if the current user has the given platform permission scope
CREATE OR REPLACE FUNCTION public.has_platform_permission(p_scope text)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.platform_user_roles pur
    JOIN public.platform_role_permissions prp ON prp.role_id       = pur.role_id
    JOIN public.platform_permissions      pp  ON pp.id             = prp.permission_id
    WHERE pur.user_id = auth.uid()
      AND pp.scope    = p_scope
  )
$$;

-- ---- tenants ----
DROP POLICY IF EXISTS "tenants_select" ON public.tenants;
CREATE POLICY "tenants_select" ON public.tenants
  FOR SELECT USING (
    public.is_tenant_member(id)
    OR public.has_platform_permission('platform.tenants.view')
  );

DROP POLICY IF EXISTS "tenants_insert" ON public.tenants;
CREATE POLICY "tenants_insert" ON public.tenants
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND owner_id = auth.uid()
  );

DROP POLICY IF EXISTS "tenants_update" ON public.tenants;
CREATE POLICY "tenants_update" ON public.tenants
  FOR UPDATE USING (
    public.is_tenant_admin(id)
    OR public.has_platform_permission('platform.tenants.manage')
  );

-- ---- subscriptions ----
DROP POLICY IF EXISTS "subscriptions_select" ON public.subscriptions;
CREATE POLICY "subscriptions_select" ON public.subscriptions
  FOR SELECT USING (
    public.is_tenant_member(tenant_id)
    OR public.has_platform_permission('platform.billing.view')
  );

-- ---- events ----
DROP POLICY IF EXISTS "events_select" ON public.events;
CREATE POLICY "events_select" ON public.events
  FOR SELECT USING (
    -- owners/admins see all events in their tenant
    public.is_tenant_admin(tenant_id)
    OR
    -- coordinators/viewers only see events they are assigned to
    EXISTS (
      SELECT 1
      FROM public.event_members em
      JOIN public.tenant_members tm ON tm.id = em.tenant_member_id
      WHERE em.event_id = events.id
        AND tm.user_id  = auth.uid()
        AND tm.status   = 'active'
    )
    OR public.has_platform_permission('platform.tenants.view')
  );

DROP POLICY IF EXISTS "events_insert" ON public.events;
CREATE POLICY "events_insert" ON public.events
  FOR INSERT WITH CHECK (public.is_tenant_admin(tenant_id));

DROP POLICY IF EXISTS "events_update" ON public.events;
CREATE POLICY "events_update" ON public.events
  FOR UPDATE USING (
    public.is_tenant_admin(tenant_id)
    AND NOT is_locked
  );

-- ---- event_sessions ----
DROP POLICY IF EXISTS "event_sessions_select" ON public.event_sessions;
CREATE POLICY "event_sessions_select" ON public.event_sessions
  FOR SELECT USING (
    is_global = true
    OR EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_sessions.event_id
        AND public.is_tenant_member(e.tenant_id)
    )
  );

DROP POLICY IF EXISTS "event_sessions_insert" ON public.event_sessions;
CREATE POLICY "event_sessions_insert" ON public.event_sessions
  FOR INSERT WITH CHECK (
    is_global = false
    AND EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_sessions.event_id
        AND public.is_tenant_admin(e.tenant_id)
    )
  );

-- ---- statuses ----
DROP POLICY IF EXISTS "statuses_select" ON public.statuses;
CREATE POLICY "statuses_select" ON public.statuses
  FOR SELECT USING (
    is_global = true
    OR public.is_tenant_member(tenant_id)
    OR EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = statuses.event_id
        AND public.is_tenant_member(e.tenant_id)
    )
  );

DROP POLICY IF EXISTS "statuses_insert" ON public.statuses;
CREATE POLICY "statuses_insert" ON public.statuses
  FOR INSERT WITH CHECK (
    is_global = false
    AND (
      (tenant_id IS NOT NULL AND public.is_tenant_admin(tenant_id))
      OR (event_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.events e
        WHERE e.id = statuses.event_id AND public.is_tenant_admin(e.tenant_id)
      ))
    )
  );

-- ---- tenant_members ----
DROP POLICY IF EXISTS "tenant_members_select" ON public.tenant_members;
CREATE POLICY "tenant_members_select" ON public.tenant_members
  FOR SELECT USING (
    public.is_tenant_member(tenant_id)
    OR public.has_platform_permission('platform.tenants.view')
  );

DROP POLICY IF EXISTS "tenant_members_insert" ON public.tenant_members;
CREATE POLICY "tenant_members_insert" ON public.tenant_members
  FOR INSERT WITH CHECK (public.is_tenant_admin(tenant_id));

DROP POLICY IF EXISTS "tenant_members_update" ON public.tenant_members;
CREATE POLICY "tenant_members_update" ON public.tenant_members
  FOR UPDATE USING (public.is_tenant_admin(tenant_id));

-- ---- event_members ----
DROP POLICY IF EXISTS "event_members_select" ON public.event_members;
CREATE POLICY "event_members_select" ON public.event_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_members.event_id
        AND public.is_tenant_member(e.tenant_id)
    )
  );

-- ---- payments ----
DROP POLICY IF EXISTS "payments_select" ON public.payments;
CREATE POLICY "payments_select" ON public.payments
  FOR SELECT USING (
    public.is_tenant_member(tenant_id)
    OR public.has_platform_permission('platform.billing.view')
  );

DROP POLICY IF EXISTS "payments_insert" ON public.payments;
CREATE POLICY "payments_insert" ON public.payments
  FOR INSERT WITH CHECK (public.is_tenant_member(tenant_id));

-- ---- payment_events ----
DROP POLICY IF EXISTS "payment_events_select" ON public.payment_events;
CREATE POLICY "payment_events_select" ON public.payment_events
  FOR SELECT USING (
    public.is_tenant_member(tenant_id)
    OR public.has_platform_permission('platform.billing.view')
  );

-- ---- plans: publicly readable (active only); platform can see all ----
DROP POLICY IF EXISTS "plans_select" ON public.plans;
CREATE POLICY "plans_select" ON public.plans
  FOR SELECT USING (
    is_active = true
    OR public.has_platform_permission('platform.plans.manage')
  );

-- ---- features + plan_features: publicly readable ----
DROP POLICY IF EXISTS "features_select" ON public.features;
CREATE POLICY "features_select" ON public.features FOR SELECT USING (true);

DROP POLICY IF EXISTS "plan_features_select" ON public.plan_features;
CREATE POLICY "plan_features_select" ON public.plan_features FOR SELECT USING (true);

-- ---- platform tables: platform admin only ----
DROP POLICY IF EXISTS "platform_roles_select" ON public.platform_roles;
CREATE POLICY "platform_roles_select" ON public.platform_roles
  FOR SELECT USING (public.has_platform_permission('platform.roles.manage'));

DROP POLICY IF EXISTS "platform_permissions_select" ON public.platform_permissions;
CREATE POLICY "platform_permissions_select" ON public.platform_permissions
  FOR SELECT USING (public.has_platform_permission('platform.roles.manage'));

DROP POLICY IF EXISTS "platform_role_permissions_select" ON public.platform_role_permissions;
CREATE POLICY "platform_role_permissions_select" ON public.platform_role_permissions
  FOR SELECT USING (public.has_platform_permission('platform.roles.manage'));

DROP POLICY IF EXISTS "platform_user_roles_select" ON public.platform_user_roles;
CREATE POLICY "platform_user_roles_select" ON public.platform_user_roles
  FOR SELECT USING (
    user_id = auth.uid()
    OR public.has_platform_permission('platform.roles.manage')
  );

-- Grant execute on new helper functions to authenticated users
GRANT EXECUTE ON FUNCTION public.is_tenant_member(uuid)        TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_tenant_admin(uuid)         TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_platform_permission(text) TO authenticated;

-- ================================================================
-- SECTION K (PHASE 0b): Deferred constraints
--
-- Run this block ONLY AFTER Phase 1 app code has been deployed
-- and all reads/writes use event_id / status_id / session_id
-- instead of the legacy text columns.
-- ================================================================

/*
BEGIN;

-- NOT NULL on guests (all rows must be populated)
ALTER TABLE public.guests
  ALTER COLUMN event_id  SET NOT NULL,
  ALTER COLUMN status_id SET NOT NULL;

-- NOT NULL on categories, tables, scan_logs
ALTER TABLE public.categories ALTER COLUMN event_id  SET NOT NULL;
ALTER TABLE public.tables     ALTER COLUMN event_id  SET NOT NULL;
ALTER TABLE public.scan_logs
  ALTER COLUMN event_id   SET NOT NULL,
  ALTER COLUMN session_id SET NOT NULL;

-- Scoped UNIQUE: replace global UNIQUE on categories.name and tables.number
ALTER TABLE public.categories DROP CONSTRAINT IF EXISTS categories_name_key;
CREATE UNIQUE INDEX IF NOT EXISTS categories_event_name_unique
  ON public.categories(event_id, name);

ALTER TABLE public.tables DROP CONSTRAINT IF EXISTS tables_number_key;
CREATE UNIQUE INDEX IF NOT EXISTS tables_event_number_unique
  ON public.tables(event_id, number);

-- Add NOT NULL to permissions.name
ALTER TABLE public.permissions ALTER COLUMN name SET NOT NULL;

-- Drop legacy text columns (verify app code no longer reads them first)
-- ALTER TABLE public.guests          DROP COLUMN IF EXISTS status;
-- ALTER TABLE public.event_attendance DROP COLUMN IF EXISTS event_type;
-- ALTER TABLE public.scan_logs       DROP COLUMN IF EXISTS event_type;

COMMIT;
*/

COMMIT;
