-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.categories (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL UNIQUE,
  color text NOT NULL DEFAULT '#6B7280'::text,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT categories_pkey PRIMARY KEY (id)
);

CREATE TABLE public.users (
  id uuid NOT NULL,
  email text NOT NULL,
  display_name text,
  is_super_admin boolean DEFAULT false,
  theme_preference text DEFAULT 'system'::text CHECK (theme_preference = ANY (ARRAY['light'::text, 'dark'::text, 'system'::text])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);

CREATE TABLE public.guests (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  invitation_guid uuid NOT NULL DEFAULT uuid_generate_v4() UNIQUE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text,
  phone text,
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'declined'::text, 'tentative'::text])),
  dietary_restrictions text,
  notes text,
  is_plus_one boolean DEFAULT false,
  parent_guest_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid,
  CONSTRAINT guests_pkey PRIMARY KEY (id),
  CONSTRAINT guests_parent_guest_id_fkey FOREIGN KEY (parent_guest_id) REFERENCES public.guests(id),
  CONSTRAINT guests_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);

CREATE TABLE public.guest_categories (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  guest_id uuid NOT NULL,
  category_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT guest_categories_pkey PRIMARY KEY (id),
  CONSTRAINT guest_categories_guest_id_fkey FOREIGN KEY (guest_id) REFERENCES public.guests(id),
  CONSTRAINT guest_categories_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id)
);

CREATE TABLE public.event_attendance (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  guest_id uuid NOT NULL,
  event_type text NOT NULL CHECK (event_type = ANY (ARRAY['ceremony'::text, 'reception'::text, 'both'::text])),
  attending boolean,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT event_attendance_pkey PRIMARY KEY (id),
  CONSTRAINT event_attendance_guest_id_fkey FOREIGN KEY (guest_id) REFERENCES public.guests(id)
);

CREATE TABLE public.permissions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  scope text NOT NULL UNIQUE,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT permissions_pkey PRIMARY KEY (id)
);

CREATE TABLE public.roles (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL UNIQUE,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT roles_pkey PRIMARY KEY (id)
);

CREATE TABLE public.role_permissions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  role_id uuid NOT NULL,
  permission_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT role_permissions_pkey PRIMARY KEY (id),
  CONSTRAINT role_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id),
  CONSTRAINT role_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES public.permissions(id)
);

CREATE TABLE public.user_roles (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  role_id uuid NOT NULL,
  assigned_at timestamp with time zone DEFAULT now(),
  assigned_by uuid,
  CONSTRAINT user_roles_pkey PRIMARY KEY (id),
  CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT user_roles_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id),
  CONSTRAINT user_roles_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.users(id)
);

CREATE TABLE public.scan_logs (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  guest_id uuid NOT NULL,
  scanned_by uuid NOT NULL,
  scanned_at timestamp with time zone DEFAULT now(),
  event_type text NOT NULL CHECK (event_type = ANY (ARRAY['ceremony'::text, 'reception'::text])),
  is_duplicate boolean DEFAULT false,
  notes text,
  CONSTRAINT scan_logs_pkey PRIMARY KEY (id),
  CONSTRAINT scan_logs_guest_id_fkey FOREIGN KEY (guest_id) REFERENCES public.guests(id),
  CONSTRAINT scan_logs_scanned_by_fkey FOREIGN KEY (scanned_by) REFERENCES public.users(id)
);

CREATE TABLE public.seating_assignments (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  guest_id uuid NOT NULL UNIQUE,
  table_number text NOT NULL,
  seat_number integer,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT seating_assignments_pkey PRIMARY KEY (id),
  CONSTRAINT seating_assignments_guest_id_fkey FOREIGN KEY (guest_id) REFERENCES public.guests(id)
);