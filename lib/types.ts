// Database types for the wedding guest management platform

export type Locale = "en" | "es"

export interface User {
  id: string
  email: string
  display_name: string | null
  is_super_admin: boolean
  theme_preference: 'light' | 'dark' | 'system'
  created_at: string
  updated_at: string
}

export interface Permission {
  id: string
  scope: string
  description: string | null
  created_at: string
}

export interface Role {
  id: string
  name: string
  description: string | null
  created_at: string
  updated_at: string
}

export interface RolePermission {
  id: string
  role_id: string
  permission_id: string
  created_at: string
}

export interface UserRole {
  id: string
  user_id: string
  role_id: string
  assigned_at: string
  assigned_by: string | null
}

export interface Category {
  id: string
  name: string
  color: string
  description: string | null
  created_at: string
  updated_at: string
}

export interface Guest {
  id: string
  invitation_guid: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  status: 'pending' | 'confirmed' | 'declined' | 'tentative'
  dietary_restrictions: string | null
  notes: string | null
  is_plus_one: boolean
  parent_guest_id: string | null
  created_at: string
  updated_at: string
  created_by: string | null
}

export interface GuestCategory {
  id: string
  guest_id: string
  category_id: string
  created_at: string
}

export interface EventAttendance {
  id: string
  guest_id: string
  event_type: 'ceremony' | 'reception' | 'both'
  attending: boolean | null
  created_at: string
  updated_at: string
}

export interface SeatingAssignment {
  id: string
  guest_id: string
  table_number: string
  seat_number: number | null
  created_at: string
  updated_at: string
}

export interface ScanLog {
  id: string
  guest_id: string
  scanned_by: string
  scanned_at: string
  event_type: 'ceremony' | 'reception'
  is_duplicate: boolean
  notes: string | null
}

// Extended types with relations
export interface GuestWithRelations extends Guest {
  categories?: Category[]
  event_attendance?: EventAttendance[]
  seating_assignment?: SeatingAssignment
  scan_logs?: ScanLog[]
  plus_ones?: Guest[]
  parent_guest?: Guest
}

export interface UserWithRoles extends User {
  roles?: Role[]
  permissions?: string[] // Resolved permission scopes
}

export interface RoleWithPermissions extends Role {
  permissions?: Permission[]
}

export type RecentActivityItem = ScanLog & {
  guests: { first_name: string; last_name: string } | null
  users: { display_name: string } | null
}

// Dashboard stats
export interface DashboardStats {
  totalGuests: number
  confirmedGuests: number
  pendingGuests: number
  declinedGuests: number
  checkedInCeremony: number
  checkedInReception: number
  guestsByCategory: { name: string; count: number; color: string }[]
  guestsByStatus: { status: string; count: number }[]
  recentActivity: RecentActivityItem[]
}
