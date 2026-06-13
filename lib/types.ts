// Database types for the wedding guest management platform

export type Locale = 'en' | 'es';

// ================================================================
// EXISTING TYPES (backward-compatible — kept for Phase 0)
// Phase 1 will migrate status/event_type references to FK-based types.
// ================================================================

export interface User {
  id: string;
  email: string;
  display_name: string | null;
  /** @deprecated Replaced by platform_user_roles in Phase 0b */
  is_super_admin: boolean;
  theme_preference: 'light' | 'dark' | 'system';
  created_at: string;
  updated_at: string;
}

export interface Permission {
  id: string;
  scope: string;
  name: string | null;
  description: string | null;
  created_at: string;
}

export interface Role {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  permissions?: string[];
}

export interface RolePermission {
  id: string;
  role_id: string;
  permission_id: string;
  created_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role_id: string;
  assigned_at: string;
  assigned_by: string | null;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  description: string | null;
  /** Scoped to an event after Phase 0 data migration */
  event_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Guest {
  id: string;
  invitation_guid: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  /** Legacy text column — still populated. Use status_id after Phase 1. */
  status: 'pending' | 'confirmed' | 'declined' | 'tentative';
  /** FK to statuses.id — populated after Phase 0 migration */
  status_id: string | null;
  /** FK to events.id — populated after Phase 0 migration */
  event_id: string | null;
  dietary_restrictions: string | null;
  notes: string | null;
  is_plus_one: boolean;
  parent_guest_id: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface GuestCategory {
  id: string;
  guest_id: string;
  category_id: string;
  created_at: string;
}

export interface EventAttendance {
  id: string;
  guest_id: string;
  /** Legacy text column — still populated. Use session_id after Phase 1. */
  event_type: 'ceremony' | 'reception';
  /** FK to event_sessions.id — populated after Phase 0 migration */
  session_id: string | null;
  attending: boolean | null;
  created_at: string;
  updated_at: string;
}

export interface Table {
  id: string;
  name: string;
  number: string;
  category: string | null;
  notes: string | null;
  capacity: number;
  /** Scoped to an event after Phase 0 data migration */
  event_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SeatingAssignment {
  id: string;
  guest_id: string;
  table_id: string;
  created_at: string;
  updated_at: string;
}

export interface ScanLog {
  id: string;
  guest_id: string;
  scanned_by: string;
  scanned_at: string;
  /** Legacy text column — still populated. Use session_id after Phase 1. */
  event_type: 'ceremony' | 'reception';
  /** FK to event_sessions.id — populated after Phase 0 migration */
  session_id: string | null;
  /** FK to events.id — populated after Phase 0 migration */
  event_id: string | null;
  is_duplicate: boolean;
  notes: string | null;
}

// Extended types with relations
export interface GuestWithRelations extends Guest {
  categories?: Category[];
  event_attendance?: EventAttendance[];
  seating_assignment?: SeatingAssignment;
  scan_logs?: ScanLog[];
  plus_ones?: Guest[];
  parent_guest?: Guest;
}

export interface UserWithRoles extends User {
  roles?: Role[];
  permissions?: string[];
  /** Resolved server-side by getInitialProfile — the tenant the user currently operates in. */
  active_tenant_id?: string | null;
  /** Resolved server-side by getInitialProfile — the first active event for the active tenant. */
  active_event_id?: string | null;
}

export type RecentActivityItem = ScanLog & {
  guests: { first_name: string; last_name: string } | null;
  users: { display_name: string } | null;
};

export interface DashboardStats {
  totalGuests: number;
  justCeremony: number;
  justReception: number;
  confirmedGuests: number;
  pendingGuests: number;
  declinedGuests: number;
  checkedInCeremony: number;
  checkedInReception: number;
  guestsByCategory: { name: string; count: number; color: string }[];
  guestsByStatus: { status: string; count: number }[];
  recentActivity: RecentActivityItem[];
}

// ================================================================
// NEW TYPES — SaaS multi-tenant entities (Phase 0+)
// ================================================================

// ---- Plans & Features ----

export type BillingType = 'one_time' | 'recurring';
export type PlanScope = 'individual' | 'organization';

export interface Plan {
  id: string;
  code: string;
  name: string;
  description: string | null;
  scope: PlanScope;
  billing_type: BillingType;
  max_events: number;
  max_guests_per_event: number;
  max_members: number;
  max_free_date_changes: number;
  price_amount: number;
  price_currency: string;
  stripe_price_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Feature {
  id: string;
  key: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface PlanFeature {
  plan_id: string;
  feature_id: string;
  enabled: boolean;
}

export interface PlanWithFeatures extends Plan {
  features?: Feature[];
}

// ---- Tenants ----

export type TenantType = 'individual' | 'organization';
export type TenantStatus = 'active' | 'suspended' | 'cancelled';

export interface Tenant {
  id: string;
  type: TenantType;
  name: string;
  owner_id: string;
  subdomain: string | null;
  status: TenantStatus;
  created_at: string;
  updated_at: string;
}

// ---- Subscriptions ----

export type SubscriptionStatus = 'pending' | 'active' | 'past_due' | 'canceled' | 'expired';

export interface Subscription {
  id: string;
  tenant_id: string;
  plan_id: string;
  billing_type: BillingType;
  status: SubscriptionStatus;
  current_period_start: string;
  current_period_end: string | null;
  stripe_subscription_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionWithPlan extends Subscription {
  plan?: Plan;
}

// ---- Payments ----

export type PaymentMethod = 'bank_transfer' | 'card' | 'manual';
export type PaymentStatus = 'pending' | 'confirmed' | 'rejected';

export interface Payment {
  id: string;
  tenant_id: string;
  subscription_id: string | null;
  plan_id: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  status: PaymentStatus;
  proof_url: string | null;
  reference: string | null;
  submitted_by: string | null;
  submitted_at: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  notes: string | null;
  stripe_payment_intent_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentEvent {
  id: string;
  payment_id: string | null;
  tenant_id: string;
  source: 'stripe' | 'manual';
  event_type: string;
  raw_payload: Record<string, unknown> | null;
  created_at: string;
}

// ---- Tenant Members ----

export type TenantMemberStatus = 'invited' | 'active';

export interface TenantMember {
  id: string;
  tenant_id: string;
  user_id: string;
  role_id: string;
  invited_by: string | null;
  status: TenantMemberStatus;
  created_at: string;
  updated_at: string;
}

export interface TenantMemberWithUser extends TenantMember {
  user?: User;
  role?: Role;
}

// ---- Events (projects) ----

export type EventStatus = 'active' | 'archived' | 'cancelled';

export interface WeddingEvent {
  id: string;
  tenant_id: string;
  name: string;
  event_date: string | null;
  date_changes_used: number;
  is_locked: boolean;
  status: EventStatus;
  subscription_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface EventMember {
  id: string;
  event_id: string;
  tenant_member_id: string;
  created_by: string | null;
  created_at: string;
}

// ---- Event Sessions (ceremony, reception, etc.) ----

export interface EventSession {
  id: string;
  event_id: string | null;
  key: string;
  label: string;
  sort_order: number;
  is_global: boolean;
  created_at: string;
}

// ---- Statuses (dynamic, replaces guests.status text column) ----

export interface GuestStatus {
  id: string;
  tenant_id: string | null;
  event_id: string | null;
  key: string;
  label: string;
  color: string;
  sort_order: number;
  is_global: boolean;
  created_at: string;
  updated_at: string;
}

// ---- Platform RBAC ----

export interface PlatformRole {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlatformPermission {
  id: string;
  scope: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface PlatformRolePermission {
  id: string;
  role_id: string;
  permission_id: string;
  created_at: string;
}

export interface PlatformUserRole {
  id: string;
  user_id: string;
  role_id: string;
  assigned_by: string | null;
  assigned_at: string;
}

// ---- Enriched / context types ----

/** Active tenant context resolved by server-auth in Phase 1 */
export interface TenantContext {
  tenantId: string;
  tenantType: TenantType;
  role: string;
  permissions: string[];
  activeEventId: string | null;
}

/** Platform admin context (Phase 1) */
export interface PlatformContext {
  userId: string;
  platformPermissions: string[];
}
