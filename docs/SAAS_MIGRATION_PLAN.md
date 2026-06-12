# Plan de migración a SaaS multi-tenant — Wedding List

> **Documento de trabajo.** Marca cada checkbox `[ ]` → `[x]` a medida que se implementa y verifica cada feature.
> Última actualización: 2026-06-07 · Rama base: `main`

---

## 1. Contexto y objetivo

### 1.1. Qué es hoy la aplicación
Wedding List es una app **single-tenant**: toda la base de datos representa **una sola boda**. No existe ningún concepto de cuenta, organización ni proyecto. Stack:

- **Backend:** Supabase (PostgreSQL + Auth + Storage + Realtime).
- **Frontend:** Next.js (App Router) + Server Actions + Server Components.
- **Autorización:** RBAC propio (`roles`, `permissions`, `role_permissions`, `user_roles`) resuelto en `lib/server-auth.ts`; el `PermissionGuard` del cliente es solo UI.
- **Datos de dominio:** `guests`, `categories`, `guest_categories`, `event_attendance`, `tables`, `seating_assignments`, `scan_logs`.

### 1.2. Limitaciones que bloquean el SaaS
| # | Limitación actual | Ubicación |
|---|---|---|
| L1 | Ninguna tabla tiene `tenant_id` ni `event_id` → no hay aislamiento de datos | todo `lib/db/schema.sql` |
| L2 | Estados de invitado hardcodeados en `CHECK` (`pending/confirmed/declined/tentative`) | `schema.sql` `guests.status` |
| L3 | Tipos de evento hardcodeados en `CHECK` (`ceremony/reception/both`) | `schema.sql` `event_attendance.event_type`, `scan_logs.event_type` |
| L4 | `UNIQUE` globales (`categories.name`, `tables.number`) rompen con multi-tenant | `schema.sql` |
| L5 | RBAC global (un solo set de roles para todos los usuarios) | `user_roles`, `lib/server-auth.ts` |
| L6 | `permissions` no tiene columna `name` (solo `scope` + `description`) | `schema.sql` `permissions` |
| L7 | `is_super_admin` es un booleano suelto, sin roles de plataforma | `schema.sql` `users` |
| L8 | Funciones `SECURITY DEFINER` (`get_guests_paginated`, `get_dashboard_stats`) no filtran por tenant/evento → riesgo de fuga de datos entre tenants | `lib/db/functions.sql` |
| L9 | Tipos TS con uniones literales para status/event_type | `lib/types.ts` |

### 1.3. Objetivo
Convertir la app en un **SaaS multi-tenant** con:
- Cuentas **individuales** (workspace personal, 1 owner) y de **organización** (multi-usuario, nº de miembros según plan).
- Jerarquía **tenant → evento (proyecto) → sesión (ceremonia/recepción/…)**.
- **Estados y sesiones dinámicos** por tenant/evento, con un conjunto **global** sembrado por la plataforma.
- **Planes con límites por evento** (máx. eventos, máx. invitados por evento, máx. miembros, nº de cambios de fecha gratis).
- **Portal de administración del SaaS** (backoffice de plataforma) con su propio RBAC.
- **Billing con confirmación manual de pago** (incluye transferencia bancaria), preparado para Stripe en fase posterior.

### 1.4. Decisiones tomadas (confirmadas con el cliente)
| Tema | Decisión |
|---|---|
| Concepto "evento" | **Dos niveles**: proyecto (boda, con fecha y lista propia) → sesiones. El límite 1-2 aplica a *proyectos*. |
| Límite de invitados | **Por evento** (`max_guests_per_event`). |
| Modelo de organización | Tenant multi-usuario con RBAC scopeado; nº de miembros (seats) según el plan. Individual = workspace de 1 owner. |
| Billing (esta fase) | **Confirmación manual por un admin con rol de cobros**; soporta **transferencia bancaria** con comprobante. Stripe en fase posterior, sobre el mismo modelo de datos. |
| Portal de admin | Backoffice de plataforma `/admin` con RBAC de plataforma independiente del RBAC de tenant. |
| Permisos | Siempre con `scope` + `name` + `description`, en ambos niveles (tenant y plataforma). |
| Datos existentes | **Hay datos en producción** → migrar a un tenant + evento por defecto, sin pérdida. |

---

## 2. Arquitectura objetivo

### 2.1. Jerarquía de entidades
```
tenant  (type: 'individual' | 'organization')
 ├── subscription ──> plan  (límites por evento)
 ├── payments      (confirmación manual / transferencia / Stripe)
 ├── tenant_members  (usuario ↔ tenant ↔ role)         ← seats limitados por plan
 └── events  (proyecto: boda; event_date, date_changes_used)
       ├── event_sessions  (ceremonia, recepción, … — dinámicas)
       ├── statuses        (estados; globales ∪ propios del evento/tenant)
       ├── guests          (+ status_id)
       │     ├── guest_categories ──> categories (por evento)
       │     ├── event_attendance  ──> event_sessions
       │     └── seating_assignments ──> tables (por evento)
       ├── tables
       └── scan_logs        ──> event_sessions
```

### 2.2. Dos niveles de RBAC (no mezclar)
| Nivel | Para qué | Tablas |
|---|---|---|
| **Plataforma** | Administrar todo el SaaS (tenants, planes, pagos, globales) | `platform_roles`, `platform_permissions`, `platform_role_permissions`, `platform_user_roles` |
| **Tenant** | Cada org/individual administra su workspace | `roles`, `permissions`, `role_permissions`, `tenant_members` |

`users.is_super_admin` se sustituye por el rol de plataforma **"Super Admin"** sembrado por defecto.

---

## 3. Modelo de datos detallado

### 3.1. Tablas nuevas
- **`tenants`** — `id, type ('individual'|'organization'), name, owner_id (→users), status ('active'|'suspended'), created_at, updated_at`.
- **`plans`** — `id, code (unique), name, description, scope ('individual'|'organization'), max_events, max_guests_per_event, max_members, max_free_date_changes, price_amount, price_currency, stripe_price_id (nullable), is_active`.
- **`subscriptions`** — `id, tenant_id, plan_id, status ('pending'|'active'|'past_due'|'canceled'), current_period_start, current_period_end, stripe_subscription_id (nullable)`. 1 activa por tenant.
- **`payments`** — ver §3.4.
- **`tenant_members`** — `id, tenant_id, user_id, role_id (→roles), invited_by, status ('invited'|'active'), created_at`. Sustituye a `user_roles` para el dominio de tenant.
- **`events`** — `id, tenant_id, name, event_date (date), date_changes_used (int default 0), status, created_by, created_at, updated_at`.
- **`event_sessions`** — `id, event_id, key, label, sort_order, is_global (bool)`. Reemplaza ceremony/reception hardcodeados.
- **`statuses`** — `id, tenant_id (nullable), event_id (nullable), key, label, color, sort_order, is_global (bool)`. Ver §3.3.
- **`platform_roles`** / **`platform_permissions`** / **`platform_role_permissions`** / **`platform_user_roles`** — espejo de las tablas de tenant para el backoffice.

### 3.2. Tablas modificadas
- `guests` → **+`event_id`** (NOT NULL tras migración), `status` (texto) → **`status_id` (→statuses)**.
- `categories` → **+`event_id`**; quitar `UNIQUE(name)` global → **`UNIQUE(event_id, name)`**.
- `tables` → **+`event_id`**; quitar `UNIQUE(number)` global → **`UNIQUE(event_id, number)`**.
- `seating_assignments`, `guest_categories` → heredan scope vía `guest_id`/`table_id` (validar coherencia de `event_id`).
- `event_attendance` → `event_type` (texto) → **`session_id` (→event_sessions)**.
- `scan_logs` → `event_type` (texto) → **`session_id` (→event_sessions)**; **+`event_id`** para consultas directas.
- `permissions` y `platform_permissions` → **+`name` NOT NULL**.
- `users` → eliminar/deprecar `is_super_admin` tras migrar a `platform_user_roles`.

### 3.3. Estados y sesiones dinámicos + globales
Tabla `statuses` (mismo patrón para `event_sessions`):
- `tenant_id IS NULL AND event_id IS NULL` → **global** sembrado por la plataforma (`pending/confirmed/declined/tentative`); visible para todos, no editable por tenants.
- `tenant_id` o `event_id` no nulos → **personalizado** del tenant/evento.
- Un evento ve **globales ∪ propios**. `guests.status_id` puede apuntar a cualquiera.

### 3.4. Tabla `payments` (billing manual + transferencia)
```sql
payments(
  id, tenant_id, subscription_id, plan_id,
  amount, currency,
  method ('bank_transfer' | 'card' | 'manual'),
  status ('pending' | 'confirmed' | 'rejected'),
  proof_url,                  -- comprobante (Supabase Storage)
  reference,                  -- nº de referencia bancaria
  submitted_by, submitted_at,
  reviewed_by, reviewed_at,   -- admin de plataforma que confirma/rechaza
  notes,
  stripe_payment_intent_id    -- nullable, fase Stripe
)
```
**Flujo transferencia bancaria:**
1. El tenant elige plan → sube comprobante + referencia → `payment` en `pending`, `subscription` en `pending`.
2. Admin de plataforma con permiso `billing.confirm` revisa en `/admin`.
3. **Confirma** → activa `subscription`, fija `current_period_end`; o **rechaza** con nota.
4. (Fase Stripe) el webhook de tarjeta hace automáticamente lo que el admin hace aquí.

---

## 4. Seguridad y aislamiento (RLS)

- **RLS por tenant** en todas las tablas scopeadas, basada en pertenencia vía `tenant_members`.
- **RLS de plataforma** en las tablas `platform_*`, `plans`, y operaciones de `payments`/`tenants` de admin.
- Helper `getActiveTenant(supabase)` en `lib/server-auth.ts`; `getServerPermissions` lee roles vía `tenant_members` (no `user_roles` global).
- Helper `getPlatformPermissions(supabase)` para el backoffice.
- **Auditar todas las funciones `SECURITY DEFINER`**: añadir y validar `p_event_id`/`p_tenant_id`; revisar rutas públicas que usan `createAdminClient` (service-role) en RSVP para que no salten el aislamiento.

---

## 5. Catálogo de permisos (scope · name · description)

> Sembrar en la migración. Completar/ajustar antes de aplicar `NOT NULL` en `name`.

### 5.1. Permisos de **tenant** (ampliar `lib/permissions.ts`)
- [ ] `guests.view` — Ver invitados — Listar y consultar invitados del evento.
- [ ] `guests.create` — Crear invitados — Añadir e importar invitados.
- [ ] `guests.edit` — Editar invitados — Modificar datos de invitados.
- [ ] `guests.delete` — Eliminar invitados — Borrar invitados.
- [ ] `guests.export` — Exportar invitados — Descargar la lista a Excel.
- [ ] `guests.qr` — Códigos QR — Generar/ver QR de invitación.
- [ ] `scanner.use` — Usar escáner — Registrar check-ins.
- [ ] `scanner.history` — Historial de escaneos — Ver el log de escaneos.
- [ ] `seating.view` — Ver distribución — Consultar mesas y asignaciones.
- [ ] `seating.edit` — Editar distribución — Crear mesas y asignar invitados.
- [ ] `categories.view` — Ver categorías — Consultar categorías del evento.
- [ ] `categories.manage` — Gestionar categorías — Crear/editar/eliminar categorías.
- [ ] `statuses.manage` — Gestionar estados — Crear/editar estados personalizados del evento.
- [ ] `sessions.manage` — Gestionar sesiones — Crear/editar sesiones del evento.
- [ ] `events.create` — Crear eventos — Crear nuevos eventos (sujeto a límite del plan).
- [ ] `events.edit` — Editar eventos — Modificar evento, incl. cambio de fecha.
- [ ] `events.delete` — Eliminar eventos — Borrar eventos.
- [ ] `settings.members` — Gestionar miembros — Invitar/eliminar miembros del tenant.
- [ ] `settings.roles` — Gestionar roles — Crear/editar roles del tenant.
- [ ] `settings.billing` — Ver facturación — Ver plan, uso y enviar comprobantes de pago.

### 5.2. Permisos de **plataforma** (nuevo `PLATFORM_PERMISSIONS`)
- [ ] `platform.tenants.view` — Ver tenants — Listar y consultar cuentas.
- [ ] `platform.tenants.manage` — Gestionar tenants — Suspender/reactivar, cambiar plan.
- [ ] `platform.plans.manage` — Gestionar planes — Crear/editar el catálogo de planes y límites.
- [ ] `platform.billing.view` — Ver cobros — Listar pagos y comprobantes.
- [ ] `platform.billing.confirm` — Confirmar pagos — Aprobar pagos y activar suscripciones.
- [ ] `platform.billing.reject` — Rechazar pagos — Rechazar pagos con nota.
- [ ] `platform.globals.manage` — Gestionar globales — Editar estados/sesiones globales.
- [ ] `platform.roles.manage` — Roles de plataforma — Crear/editar roles y permisos de plataforma.
- [ ] `platform.users.manage` — Admins de plataforma — Asignar roles de plataforma a usuarios.

---

## 6. Fases de implementación (checklist)

### Fase 0 — Esquema y migración de datos
**Objetivo:** nuevo esquema completo + datos existentes migrados, sin tocar UI todavía.
- [ ] Crear carpeta de migraciones versionadas (`lib/db/migrations/` o equivalente).
- [ ] Definir tablas nuevas: `tenants`, `plans`, `subscriptions`, `payments`, `tenant_members`, `events`, `event_sessions`, `statuses`.
- [ ] Definir tablas de plataforma: `platform_roles`, `platform_permissions`, `platform_role_permissions`, `platform_user_roles`.
- [ ] Añadir `name` a `permissions`; crear `platform_permissions` con `scope/name/description`.
- [ ] Añadir `event_id`/`tenant_id` a `guests`, `categories`, `tables`, `scan_logs`.
- [ ] Convertir `guests.status` → `status_id`; `event_attendance.event_type` → `session_id`; `scan_logs.event_type` → `session_id`.
- [ ] Reemplazar `UNIQUE` globales por `UNIQUE(event_id, …)`.
- [ ] **Script de migración de datos** (idempotente y transaccional):
  - [ ] Crear tenant + plan + subscription por defecto.
  - [ ] Crear evento por defecto con la fecha actual de la boda.
  - [ ] Sembrar `statuses` y `event_sessions` globales.
  - [ ] Asignar `tenant_id`/`event_id` a todas las filas existentes.
  - [ ] Migrar `user_roles` → `tenant_members`.
  - [ ] Convertir `status`/`event_type` a sus FKs.
  - [ ] Migrar `is_super_admin=true` → rol de plataforma "Super Admin".
- [ ] Aplicar `NOT NULL` + FKs + `UNIQUE` nuevos tras la migración.
- [ ] Seed del catálogo de permisos (tenant §5.1 + plataforma §5.2) y roles por defecto.
- [ ] **RLS**: políticas por tenant y de plataforma en todas las tablas.
- [ ] Verificar que la app actual sigue leyendo los datos migrados.

### Fase 1 — Scoping del backend
**Objetivo:** la app funciona sobre el tenant/evento activo.
- [ ] `lib/server-auth.ts`: `getActiveTenant()`, `getServerPermissions()` vía `tenant_members`, `getPlatformPermissions()`.
- [ ] Actualizar funciones SQL (`get_guests_paginated`, `get_dashboard_stats`, `create_guest_full`, etc.) con `p_event_id` y filtrado; revisar `SECURITY DEFINER`.
- [ ] Actualizar `lib/types.ts`: quitar uniones literales de status/event_type; añadir `Tenant`, `Plan`, `Subscription`, `Payment`, `Event`, `EventSession`, `Status`, `TenantMember`, tipos de plataforma.
- [ ] Inyectar `event_id`/`tenant_id` en todos los services y server actions de dominio.
- [ ] Revisar rutas públicas (RSVP) con `createAdminClient` para respetar aislamiento.

### Fase 2 — Planes, límites y billing manual
- [ ] `lib/limits.ts`: `assertCanCreateEvent`, `assertGuestQuota` (por evento), `assertCanAddMember`, `assertCanChangeEventDate`.
- [ ] Integrar checks de límite en los server actions antes de mutar.
- [ ] Implementar cambio de fecha con contador `date_changes_used` vs `max_free_date_changes`.
- [ ] Tabla/Storage para comprobantes de pago (`proof_url`).
- [ ] Server actions de billing: enviar comprobante (tenant), confirmar/rechazar (plataforma).
- [ ] Activación de `subscription` al confirmar pago.

### Fase 3 — UI multi-tenant + portal `/admin`
- [ ] Onboarding: elegir tipo de cuenta (individual/organización) al registrarse.
- [ ] Selector de tenant/evento activo en el dashboard.
- [ ] Pantalla de plan/uso/límites + envío de comprobante de pago.
- [ ] Gestión de miembros del tenant (sujeta a seats).
- [ ] Gestión de estados y sesiones personalizadas por evento.
- [ ] **Portal `/admin`** (protegido por permisos de plataforma):
  - [ ] Listado/gestión de tenants (suspender, cambiar plan).
  - [ ] Catálogo de planes.
  - [ ] Bandeja de cobros: revisar comprobantes, confirmar/rechazar.
  - [ ] Edición de estados/sesiones globales.
  - [ ] Gestión de roles/permisos de plataforma y admins.

### Fase 4 — Stripe (posterior)
- [ ] Checkout + Customer Portal.
- [ ] Webhooks → crear/actualizar `payments` y `subscriptions` (mismo modelo que el manual).
- [ ] Mapear `stripe_price_id`, `stripe_subscription_id`, `stripe_payment_intent_id`.

---

## 7. Riesgos y puntos críticos
- [ ] **Fuga de datos entre tenants** vía funciones `SECURITY DEFINER` sin filtro de `event_id`/`tenant_id`. (L8) — máxima prioridad de revisión.
- [ ] Migración `status`/`event_type` de texto a FK debe ser transaccional y verificada **antes** de borrar columnas viejas.
- [ ] RLS mal configurada puede romper funciones `SECURITY DEFINER` o el flujo público de RSVP (`createAdminClient`).
- [ ] No mezclar permisos de plataforma con permisos de tenant (dos catálogos separados).
- [ ] Coherencia de `event_id` entre `guests`/`tables`/`seating_assignments` (un invitado no debe sentarse en una mesa de otro evento).

---

## 8. Glosario
- **Tenant / workspace:** cuenta (individual u organización) que aísla todos los datos.
- **Evento (proyecto):** una boda/celebración con su propia lista, fecha y configuración. Límite 1-2 en individual.
- **Sesión:** sub-evento dentro de un evento (ceremonia, recepción, …); dinámico.
- **Estado:** estado de un invitado (confirmado, pendiente, …); global o personalizado.
- **Plan:** define los límites por evento y nº de miembros.
- **Plataforma:** el SaaS en sí; su backoffice `/admin` y su RBAC propio.
