# Plan de migración a SaaS multi-tenant — Wedding List

> **Documento de trabajo.** Marca cada checkbox `[ ]` → `[x]` a medida que se implementa y verifica cada feature.
> Última actualización: 2026-06-12 · Rama: `feat/saas-multi-tenant` (base `origin/main`) · Fase 0 ✅ · Fase 1 ✅ · Fase 2 ✅ · Fase 3 ✅ · Fase 4 ✅

---

## 1. Contexto y objetivo

### 1.1. Qué es hoy la aplicación

Wedding List es una app **single-tenant**: toda la base de datos representa **una sola boda**. No existe ningún concepto de cuenta, organización ni proyecto. Stack:

- **Backend:** Supabase (PostgreSQL + Auth + Storage + Realtime).
- **Frontend:** Next.js 16 (App Router) + Server Actions + Server Components.
- **Autorización:** RBAC propio (`roles`, `permissions`, `role_permissions`, `user_roles`) resuelto en `lib/server-auth.ts`; el `PermissionGuard` del cliente es solo UI.
- **Datos de dominio:** `guests`, `categories`, `guest_categories`, `event_attendance`, `tables`, `seating_assignments`, `scan_logs`.

### 1.2. Limitaciones que bloquean el SaaS

| #   | Limitación actual                                                                    | Ubicación                                                          | Estado                                 |
| --- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------ | -------------------------------------- |
| L1  | Ninguna tabla tiene `tenant_id` ni `event_id` → no hay aislamiento de datos          | todo `lib/db/schema.sql`                                           | **Resuelto en Fase 0**                 |
| L2  | Estados de invitado hardcodeados en `CHECK` (`pending/confirmed/declined/tentative`) | `schema.sql` `guests.status`                                       | **Resuelto en Fase 0**                 |
| L3  | Tipos de evento hardcodeados en `CHECK` (`ceremony/reception/both`)                  | `schema.sql` `event_attendance.event_type`, `scan_logs.event_type` | **Resuelto en Fase 0**                 |
| L4  | `UNIQUE` globales (`categories.name`, `tables.number`) rompen con multi-tenant       | `schema.sql`                                                       | Pendiente Fase 0b                      |
| L5  | RBAC global (un solo set de roles para todos los usuarios)                           | `user_roles`, `lib/server-auth.ts`                                 | **Resuelto en Fase 0**                 |
| L6  | `permissions` no tiene columna `name` (solo `scope` + `description`)                 | `schema.sql` `permissions`                                         | **Resuelto en Fase 0**                 |
| L7  | `is_super_admin` es un booleano suelto, sin roles de plataforma                      | `schema.sql` `users`                                               | **Resuelto en Fase 0**                 |
| L8  | Funciones `SECURITY DEFINER` no filtran por tenant/evento → fuga de datos            | `lib/db/functions.sql`                                             | **Resuelto en Fase 1** (migración 002) |
| L9  | Tipos TS con uniones literales para status/event_type                                | `lib/types.ts`                                                     | **Resuelto en Fase 0**                 |

### 1.3. Objetivo

Convertir la app en un **SaaS multi-tenant** con:

- Cuentas **individuales** (workspace personal, 1 owner, one-time por evento, sin tier gratis) y de **organización** (multi-usuario, nº de miembros según plan, suscripción recurrente).
- Jerarquía **tenant → evento (proyecto) → sesión (ceremonia/recepción/…)**.
- **Estados y sesiones dinámicos** por tenant/evento, con un conjunto **global** sembrado por la plataforma.
- **Planes con límites por evento** (máx. eventos, máx. invitados por evento, máx. miembros, nº de cambios de fecha gratis).
- **Portal de administración del SaaS** (`/admin`) con su propio RBAC independiente.
- **Billing con confirmación manual de pago** (transferencia bancaria + comprobante optimizado con `sharp`), preparado para Stripe en Fase 4.

### 1.4. Decisiones confirmadas

| Tema                | Decisión                                                                                                                                                                      |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Concepto "evento"   | **Dos niveles**: proyecto (boda, con `event_date`) → sesiones dinámicas. El límite 1-2 aplica a _proyectos_.                                                                  |
| Límite de invitados | **Por evento** (`max_guests_per_event`).                                                                                                                                      |
| Individual          | One-time por evento; datos **persisten en solo-lectura** tras pasar `event_date` (`is_locked=true`). Sin tier gratis. Para otro evento se paga de nuevo o se convierte a org. |
| Organización        | Multi-usuario; seats según plan; **un rol por tenant** en `tenant_members`; asignación a eventos solo controla visibilidad.                                                   |
| Billing (Fases 0-3) | Confirmación manual por admin de plataforma con rol de cobros; soporta **transferencia bancaria** con comprobante subido a Supabase Storage (optimizado con `sharp`).         |
| Stripe              | Fase 4, sobre el mismo modelo de datos; guardar **todos** los payloads de webhooks en `payment_events`.                                                                       |
| Portal de admin     | Backoffice `/admin` con RBAC de plataforma independiente del RBAC de tenant.                                                                                                  |
| Permisos            | Siempre con `scope` + `name` + `description`, en ambos niveles. Granulares hasta el botón (`module.resource.action`).                                                         |
| Subdominio wildcard | `org.dominio.com` para el plan máximo de org (`org_elite`), gateado por feature `custom_subdomain`. Vía `middleware.ts` + DNS wildcard en Vercel.                             |
| Datos existentes    | **Hay datos en producción** → migrar a un tenant + evento por defecto, sin pérdida.                                                                                           |

---

## 2. Arquitectura objetivo

### 2.1. Jerarquía de entidades

```
tenant  (type: 'individual' | 'organization', subdomain?)
 ├── subscription ──> plan  (billing_type: one_time|recurring; columnas de límite)
 │                     └── plan_features ──> features  (flags booleanos)
 ├── payments ── payment_events  (auditoría manual y Stripe)
 ├── tenant_members  (usuario ↔ tenant ↔ role)         ← seats limitados por plan
 └── events  (proyecto: boda; event_date, date_changes_used, is_locked)
       ├── event_members  (event ↔ tenant_member)       ← visibilidad por evento
       ├── event_sessions  (ceremony/reception/… — dinámicas; is_global)
       ├── statuses  (estados; globales ∪ propios del tenant/evento; is_global)
       ├── guests  (+ event_id, status_id)
       │     ├── guest_categories ──> categories (por evento)
       │     ├── event_attendance ──> event_sessions
       │     └── seating_assignments ──> tables (por evento)
       ├── tables  (por evento)
       └── scan_logs  (+ event_id) ──> event_sessions
```

### 2.2. Dos niveles de RBAC (no mezclar)

| Nivel          | Para qué                                                    | Tablas                                                                                       |
| -------------- | ----------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| **Plataforma** | Administrar todo el SaaS (tenants, planes, pagos, globales) | `platform_roles`, `platform_permissions`, `platform_role_permissions`, `platform_user_roles` |
| **Tenant**     | Cada org/individual administra su workspace                 | `roles`, `permissions`, `role_permissions`, `tenant_members`                                 |

`users.is_super_admin` se sustituye por el rol de plataforma `platform_superadmin` sembrado por defecto.

### 2.3. Bloqueo de eventos individuales

Evento individual queda `is_locked=true` cuando pasa `event_date` (o periodo de gracia configurable). Org (recurring) permanece editable mientras la subscription esté activa. `lib/limits.ts` y las políticas RLS respetan `is_locked` en mutaciones.

---

## 3. Modelo de datos detallado

### 3.1. Tablas nuevas

| Tabla                       | Descripción                                                                                                                                                                                                                                           |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `plans`                     | `id, code (unique), name, description, scope (individual\|organization), billing_type (one_time\|recurring), max_events, max_guests_per_event, max_members, max_free_date_changes, price_amount, price_currency, stripe_price_id nullable, is_active` |
| `features`                  | Catálogo de flags booleanos: `id, key (unique), name, description`. Ejemplos: `custom_subdomain`, `excel_export`, `white_label`, `priority_support`.                                                                                                  |
| `plan_features`             | `(plan_id, feature_id, enabled)` — qué flags incluye cada plan.                                                                                                                                                                                       |
| `tenants`                   | `id, type (individual\|organization), name, owner_id→users, subdomain unique nullable, status (active\|suspended\|cancelled), timestamps`                                                                                                             |
| `subscriptions`             | `id, tenant_id, plan_id, billing_type, status (pending\|active\|past_due\|canceled\|expired), current_period_start, current_period_end nullable, stripe_subscription_id nullable`                                                                     |
| `payments`                  | Ver §3.4.                                                                                                                                                                                                                                             |
| `payment_events`            | `id, payment_id nullable, tenant_id, source (stripe\|manual), event_type, raw_payload jsonb, created_at` — auditoría total de webhooks Stripe y acciones manuales.                                                                                    |
| `tenant_members`            | `id, tenant_id, user_id, role_id→roles, invited_by, status (invited\|active), timestamps` — reemplaza `user_roles` para el dominio de tenant.                                                                                                         |
| `event_members`             | `id, event_id, tenant_member_id, created_by, created_at` — restringe visibilidad; owners/admins ven todos los eventos.                                                                                                                                |
| `events`                    | `id, tenant_id, name, event_date date, date_changes_used int default 0, is_locked bool default false, status, subscription_id→subscriptions, created_by, timestamps`                                                                                  |
| `event_sessions`            | `id, event_id nullable, key, label, sort_order, is_global bool`. `event_id IS NULL + is_global=true` → globales de plataforma.                                                                                                                        |
| `statuses`                  | `id, tenant_id nullable, event_id nullable, key, label, color, sort_order, is_global bool`. Mismo patrón que `event_sessions`.                                                                                                                        |
| `platform_roles`            | `id, name (unique), description, timestamps`                                                                                                                                                                                                          |
| `platform_permissions`      | `id, scope (unique), name, description, created_at`                                                                                                                                                                                                   |
| `platform_role_permissions` | `(role_id, permission_id)`                                                                                                                                                                                                                            |
| `platform_user_roles`       | `(user_id, role_id, assigned_by, assigned_at)`                                                                                                                                                                                                        |

### 3.2. Tablas modificadas

| Tabla              | Cambio                                                                                                     | Estado                                          |
| ------------------ | ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| `guests`           | `+event_id` (nullable → NOT NULL en 0b); `status text` → `+status_id→statuses` (nullable → NOT NULL en 0b) | Columnas añadidas ✓; NOT NULL pendiente Fase 0b |
| `categories`       | `+event_id`; `UNIQUE(name)` → `UNIQUE(event_id, name)`                                                     | Columna añadida ✓; UNIQUE pendiente Fase 0b     |
| `tables`           | `+event_id`; `UNIQUE(number)` → `UNIQUE(event_id, number)`                                                 | Columna añadida ✓; UNIQUE pendiente Fase 0b     |
| `event_attendance` | `event_type text` → `+session_id→event_sessions`; filas 'both' divididas en ceremony+reception             | Columna añadida y datos migrados ✓              |
| `scan_logs`        | `+event_id`; `event_type text` → `+session_id→event_sessions`                                              | Columnas añadidas ✓                             |
| `permissions`      | `+name text` (NOT NULL en 0b)                                                                              | Columna añadida y poblada ✓                     |
| `users`            | Deprecar `is_super_admin` (migrado a `platform_user_roles`)                                                | Migrado ✓; columna aún presente hasta Fase 0b   |

### 3.3. Estados y sesiones dinámicos + globales

`tenant_id IS NULL AND event_id IS NULL` → **global** sembrado por la plataforma (no editable por tenants):

- Statuses globales: `pending`, `confirmed`, `declined`, `tentative`.
- Sessions globales: `ceremony`, `reception`.

Con `tenant_id` o `event_id` → personalizado del tenant/evento. Cada evento ve **globales ∪ propios**.

### 3.4. Flujo de billing manual (Fases 2-3)

```
payments(
  id, tenant_id, subscription_id, plan_id,
  amount, currency,
  method  ('bank_transfer' | 'card' | 'manual'),
  status  ('pending' | 'confirmed' | 'rejected'),
  proof_url,                   -- objeto en Supabase Storage (bucket 'payment-proofs')
  reference,                   -- nº de transferencia bancaria
  submitted_by, submitted_at,
  reviewed_by, reviewed_at,    -- admin de plataforma con platform.billing.confirm
  notes,
  stripe_payment_intent_id     -- nullable, Fase 4
)
```

**Flujo transferencia bancaria:**

1. Tenant elige plan → sube comprobante optimizado con `sharp` + referencia → `payment.status = 'pending'`, `subscription.status = 'pending'`.
2. Admin de plataforma con `platform.billing.confirm` revisa en `/admin/billing`.
3. **Confirma** → activa subscription, fija `current_period_end`; o **Rechaza** con nota.
4. (Fase 4) el webhook de Stripe hace automáticamente lo que el admin hace aquí.

### 3.5. Storage de comprobantes

- Bucket privado `payment-proofs` en Supabase Storage con RLS.
- Optimización previa a subir: imágenes recomprimidas/redimensionadas con `sharp`; PDFs validados por tamaño y tipo.
- `payments.proof_url` apunta al objeto del bucket.

---

## 4. Seguridad y aislamiento (RLS)

- **RLS por tenant** en todas las tablas scopeadas, basada en pertenencia vía `is_tenant_member()` helper.
- Visibilidad de `events`: owners/admins del tenant ven todos; miembros con otros roles solo los que tienen en `event_members`.
- **RLS de plataforma** en `platform_*`, `plans`, `features`, y operaciones admin de `payments`/`tenants`.
- **Funciones helper** en SQL: `is_tenant_member(p_tenant_id)`, `is_tenant_admin(p_tenant_id)`, `has_platform_permission(p_scope)` — todas `SECURITY DEFINER STABLE`.
- **Funciones `SECURITY DEFINER` auditadas** (`get_guests_paginated`, `get_dashboard_stats`, `create_guest_full`, `process_guest_scan`): todas aceptan `p_event_id` y filtran los datos al evento activo. ✅ **Resuelto en Fase 1** (migración `002`).
- Ruta pública RSVP (`app/rsvp`, `app/guest`) y `createAdminClient` (service-role): lookup por `invitation_guid` es globalmente único (seguro); `scan_logs` ya incluye `event_id`. Pendiente revisión exhaustiva antes de Fase 2.

---

## 5. Catálogo de permisos

Convención: `modulo.recurso.accion[.subaccion]` — wildcards soportados en todos los niveles.

### 5.1. Permisos de tenant (`lib/permissions.ts` → `PERMISSIONS`)

- [x] `dashboard.view` — Ver Dashboard — Acceder al dashboard principal.
- [x] `dashboard.stats` — Ver estadísticas — Ver métricas agregadas del evento.
- [x] `guests.list.view` — Ver lista de invitados — Ver la lista paginada.
- [x] `guests.list.filters` — Usar filtros — Aplicar búsqueda y filtros en la lista.
- [x] `guests.list.create` — Crear invitado — Añadir un nuevo invitado.
- [x] `guests.list.export` — Exportar invitados — Descargar a Excel/CSV.
- [x] `guests.detail.view` — Ver detalle de invitado — Abrir el panel de detalle.
- [x] `guests.detail.edit` — Editar invitado — Modificar datos del invitado.
- [x] `guests.detail.delete` — Eliminar invitado — Borrar un invitado.
- [x] `guests.detail.qr` — QR del invitado — Ver y descargar el QR de invitación.
- [x] `seating.board.view` — Ver distribución — Acceder al tablero de mesas.
- [x] `seating.board.assign` — Asignar asientos — Arrastrar invitados a mesas.
- [x] `seating.tables.create` — Crear mesas — Añadir mesas al layout.
- [x] `scanner.scan.use` — Usar escáner — Escanear QRs para registrar entradas.
- [x] `scanner.history.view` — Historial de escaneos — Ver el log de check-ins.
- [x] `categories.manage.create` — Crear categorías — Crear nuevas categorías.
- [x] `categories.manage.edit` — Editar categorías — Editar nombre y color.
- [x] `categories.manage.delete` — Eliminar categorías — Borrar categorías.
- [x] `statuses.manage.create` — Crear estados — Crear estados personalizados.
- [x] `statuses.manage.edit` — Editar estados — Editar estados existentes.
- [x] `statuses.manage.delete` — Eliminar estados — Borrar estados personalizados.
- [x] `sessions.manage.create` — Crear sesiones — Crear sesiones de evento.
- [x] `sessions.manage.edit` — Editar sesiones — Renombrar y reordenar sesiones.
- [x] `sessions.manage.delete` — Eliminar sesiones — Borrar sesiones personalizadas.
- [x] `events.create` — Crear eventos — Crear nuevos proyectos/bodas.
- [x] `events.edit.date` — Cambiar fecha del evento — Modificar `event_date`.
- [x] `events.members.assign` — Asignar miembros — Añadir/quitar miembros de un evento.
- [x] `settings.members.invite` — Invitar miembros — Enviar invitaciones al tenant.
- [x] `settings.roles.edit` — Editar roles — Gestionar roles y permisos del tenant.
- [x] `settings.billing.view` — Ver facturación — Ver suscripción e historial de pagos.
- [x] `settings.billing.submit_proof` — Enviar comprobante — Subir prueba de transferencia.

### 5.2. Permisos de plataforma (`lib/permissions.ts` → `PLATFORM_PERMISSIONS`)

- [x] `platform.tenants.view` — Ver tenants — Listar y consultar cuentas.
- [x] `platform.tenants.manage` — Gestionar tenants — Suspender/reactivar, cambiar plan.
- [x] `platform.plans.manage` — Gestionar planes — Crear/editar el catálogo de planes.
- [x] `platform.features.manage` — Gestionar features — Editar flags y asignaciones a planes.
- [x] `platform.billing.view` — Ver cobros — Listar pagos y comprobantes.
- [x] `platform.billing.confirm` — Confirmar pagos — Aprobar y activar suscripciones.
- [x] `platform.billing.reject` — Rechazar pagos — Rechazar con nota.
- [x] `platform.globals.manage` — Gestionar globales — Editar statuses/sessions globales.
- [x] `platform.roles.manage` — Roles de plataforma — Crear/editar roles y permisos de plataforma.
- [x] `platform.users.manage` — Admins de plataforma — Asignar roles de plataforma.

### 5.3. Roles sembrados

| Tipo       | Rol                   | Permisos                                                             |
| ---------- | --------------------- | -------------------------------------------------------------------- |
| Plataforma | `platform_superadmin` | Todos los `platform.*`                                               |
| Plataforma | `platform_billing`    | `platform.billing.*` + `platform.tenants.view`                       |
| Plataforma | `platform_support`    | `platform.tenants.view` + `platform.users.manage`                    |
| Tenant     | `owner`               | Todo (`*`)                                                           |
| Tenant     | `admin`               | Invitados, seating, scanner, categorías, sesiones, estados, miembros |
| Tenant     | `coordinator`         | Invitados, seating, scanner (sin configuración)                      |
| Tenant     | `viewer`              | Solo lectura                                                         |

---

## 6. Planes disponibles

| Código        | Alcance      | Tipo      | Eventos | Invitados/evento | Miembros | Cambios de fecha | Precio   |
| ------------- | ------------ | --------- | ------- | ---------------- | -------- | ---------------- | -------- |
| `individual`  | individual   | one_time  | 1       | 150              | 1        | 1                | $49      |
| `org_starter` | organization | recurring | 3       | 200              | 5        | 2                | $29/mes  |
| `org_pro`     | organization | recurring | 10      | 500              | 20       | 3                | $79/mes  |
| `org_elite`   | organization | recurring | ∞       | 1000             | 100      | 5                | $149/mes |

**Features por plan:**

- `org_starter`: `excel_export`
- `org_pro`: `excel_export`, `white_label`, `priority_support`
- `org_elite`: todos + `custom_subdomain`

---

## 7. Subdominio wildcard

- `tenants.subdomain` (unique), gateada por feature `custom_subdomain` en `plan_features`.
- **Nuevo `middleware.ts`** (aún no existe): resuelve tenant por `host` (`org.dominio.com`), inyecta tenant en headers/cookies, mantiene refresh de sesión Supabase SSR.
- Hosting: DNS wildcard `*.dominio.com` en Vercel via wildcard domain.
- Modelo preparado para dominios propios futuros (campo opcional), sin implementarlo en esta fase.

---

## 8. Fases de implementación (checklist)

### Fase 0 — Esquema y migración de datos ✅

**Objetivo:** nuevo esquema completo + datos existentes migrados sin tocar la UI.
**Archivo:** `lib/db/migrations/001_saas_phase0_schema.sql` (idempotente, transaccional)

#### A — Tablas nuevas

- [x] Tablas de plataforma: `platform_roles`, `platform_permissions`, `platform_role_permissions`, `platform_user_roles`.
- [x] Tablas de plan/billing: `plans`, `features`, `plan_features`, `tenants`, `subscriptions`, `payments`, `payment_events`.
- [x] Jerarquía de eventos: `events`, `event_sessions`, `statuses`, `tenant_members`, `event_members`.

#### B — Columnas en tablas existentes (nullable)

- [x] `permissions.name` (se pobla con `scope` si es NULL).
- [x] `guests.event_id`, `guests.status_id`.
- [x] `categories.event_id`.
- [x] `tables.event_id`.
- [x] `event_attendance.session_id`.
- [x] `scan_logs.event_id`, `scan_logs.session_id`.

#### C — Seed de datos globales

- [x] Sessions globales: `ceremony`, `reception`.
- [x] Statuses globales: `pending`, `confirmed`, `declined`, `tentative`.
- [x] Planes: `individual`, `org_starter`, `org_pro`, `org_elite`.
- [x] Features: `custom_subdomain`, `excel_export`, `white_label`, `priority_support`.
- [x] Asignaciones plan → feature.
- [x] Permisos de tenant (granulares, §5.1) y de plataforma (§5.2).
- [x] Roles de plataforma y tenant (§5.3) con sus asignaciones de permisos.

#### D — Migración de datos de producción

- [x] Tenant + subscription por defecto (org_pro, activa) para los datos existentes.
- [x] Evento por defecto (`Mi Boda`, fecha = hoy + 1 año como placeholder).
- [x] Todos los usuarios existentes → `tenant_members` (super_admin → rol owner; resto → admin).
- [x] `guests.event_id` y `guests.status_id` poblados desde el evento por defecto y los statuses globales.
- [x] `categories.event_id`, `tables.event_id`, `scan_logs.event_id` poblados.
- [x] `event_attendance` filas 'both' divididas en ceremony + reception.
- [x] `event_attendance.session_id` y `scan_logs.session_id` poblados.
- [x] `user_roles` → `tenant_members` (suplemento para cualquier user_role existente).
- [x] `is_super_admin = true` → `platform_user_roles` rol `platform_superadmin`.

#### E — RLS

- [x] RLS habilitada en las 16 tablas nuevas.
- [x] Funciones helper: `is_tenant_member()`, `is_tenant_admin()`, `has_platform_permission()`.
- [x] Políticas SELECT/INSERT/UPDATE para `tenants`, `subscriptions`, `events`, `event_sessions`, `statuses`, `tenant_members`, `event_members`, `payments`, `payment_events`, `plans`, `features`, `plan_features`, tablas de plataforma.

#### F — Tipos TypeScript y permisos

- [x] `lib/types.ts`: todas las nuevas interfaces (`Tenant`, `Plan`, `Feature`, `Subscription`, `Payment`, `WeddingEvent`, `EventSession`, `GuestStatus`, `TenantMember`, `EventMember`, tipos de plataforma, `TenantContext`, `PlatformContext`). Tipos existentes backward-compatible.
- [x] `lib/permissions.ts`: convención granular `module.resource.action`; `PLATFORM_PERMISSIONS`; `hasPlatformPermission()`; aliases legacy mantenidos.
- [x] `lib/excel/guest-excel.ts`: fix TS error por remoción de `'both'` en la unión `EventAttendance.event_type`.

#### G — Verificación de Fase 0

- [ ] Ejecutar `001_saas_phase0_schema.sql` en una copia de la BD de producción.
- [ ] Verificar conteos idénticos pre/post para `guests`, `categories`, `scan_logs`.
- [ ] Confirmar que `status_id` resuelve a los statuses globales correctos.
- [ ] Confirmar que `session_id` resuelve a las sessions globales correctas.
- [ ] Confirmar que la app actual sigue leyendo todos los datos (las columnas antiguas aún existen).
- [ ] `pnpm build` sin errores en la rama.

---

### Fase 0b — Constraints (ejecutar DESPUÉS de desplegar Fase 1) 🔒

> **Solo ejecutar cuando el código de Fase 1 esté desplegado** y todas las lecturas/escrituras usen las nuevas columnas FK.

- [ ] `ALTER TABLE guests ALTER COLUMN event_id SET NOT NULL`.
- [ ] `ALTER TABLE guests ALTER COLUMN status_id SET NOT NULL`.
- [ ] `ALTER TABLE categories ALTER COLUMN event_id SET NOT NULL`.
- [ ] `ALTER TABLE tables ALTER COLUMN event_id SET NOT NULL`.
- [ ] `ALTER TABLE scan_logs ALTER COLUMN event_id SET NOT NULL`.
- [ ] `ALTER TABLE scan_logs ALTER COLUMN session_id SET NOT NULL`.
- [ ] `ALTER TABLE permissions ALTER COLUMN name SET NOT NULL`.
- [ ] `DROP CONSTRAINT categories_name_key` → `CREATE UNIQUE INDEX categories_event_name_unique ON categories(event_id, name)`.
- [ ] `DROP CONSTRAINT tables_number_key` → `CREATE UNIQUE INDEX tables_event_number_unique ON tables(event_id, number)`.
- [ ] `ALTER TABLE guests DROP COLUMN status` (tras confirmar que ningún código lee la columna).
- [ ] `ALTER TABLE event_attendance DROP COLUMN event_type`.
- [ ] `ALTER TABLE scan_logs DROP COLUMN event_type`.

---

### Fase 1 — Scoping del backend ✅

**Objetivo:** la app funciona sobre el tenant/evento activo; funciones SQL seguras por tenant.

#### server-auth.ts

- [x] `getActiveContext(supabase)`: resuelve `{ userId, tenantId, eventId, permissions }` desde `tenant_members` + `events`.
- [x] `getServerPermissions(supabase)`: kept for backward compat; reads from `user_roles`.
- [x] `getPlatformContext(supabase)`: resuelve permisos de plataforma desde `platform_user_roles`.
- [x] `requireTenantPermission(supabase, scope)`: combina auth + tenant scope check; lanza `ForbiddenError`.
- [x] `requirePlatformPermission(supabase, scope)`: para acciones de backoffice `/admin`.

#### lib/limits.ts (nuevo)

- [x] `assertCanCreateEvent(supabase, tenantId)`: valida `max_events` del plan.
- [x] `assertGuestQuota(supabase, eventId)`: valida `max_guests_per_event`.
- [x] `assertCanAddMember(supabase, tenantId)`: valida `max_members`.
- [x] `assertCanChangeEventDate(supabase, eventId)`: valida `date_changes_used` vs `max_free_date_changes`.
- [x] `assertEventEditable(supabase, eventId)`: lanza `LimitError` si `is_locked = true` o `status ≠ active`.

#### Funciones SQL — migración `002_saas_phase1_functions.sql`

- [x] `get_guests_paginated`: `+p_event_id DEFAULT NULL`; filtrar `filtered` CTE por `guests.event_id`.
- [x] `get_dashboard_stats`: `+p_event_id DEFAULT NULL`; todos los conteos y recentActivity filtrados.
- [x] `create_guest_full`: `+p_event_id DEFAULT NULL`, `+p_created_by DEFAULT NULL`; insertar con `event_id`.
- [x] `process_guest_scan`: `+p_event_id DEFAULT NULL`; duplicate-check y today-stats scoped al evento.
- [ ] `update_guest_with_categories`: sin cambios requeridos (updates by id, event_id no relevante).
- [ ] Revisar `SECURITY DEFINER` → `SECURITY INVOKER` donde sea posible (backlog Fase 1b).

#### Services y Server Actions

- [x] `guest.service.ts`: `GuestListParams.eventId`, `p_event_id` en RPC, `event_id` en `createGuest`.
- [x] `seating.service.ts`: `getSeatingDataWithFamily(eventId)`, `CreateTableInput.event_id`.
- [x] `scanner.service.ts`: `getTodayStats(eventId)`, `getScanHistory(eventId)`, `processGuestScanByFamily(eventId)`.
- [x] `category.service.ts`: `getCategories(eventId)`, `getCategoriesWithGuestCount(eventId)`, `createCategory(event_id)`.
- [x] `dashboard.service.ts`: `getDashboardStats(eventId)` → `p_event_id`.
- [x] `user.service.ts`: `getInitialProfile` resuelve `active_tenant_id` + `active_event_id` en paralelo.
- [x] Nuevos services: `tenant.service.ts`, `event.service.ts` (plan/billing pendiente Fase 2).
- [x] Server Actions guests: `requireTenantPermission` + `assertGuestQuota` + `assertEventEditable`.
- [x] Server Actions seating: `requireTenantPermission` + `assertEventEditable`.

#### Auth Context

- [x] `UserWithRoles.active_tenant_id` + `UserWithRoles.active_event_id` (lib/types.ts).
- [x] `AuthProvider`: expone `activeEventId` y `activeTenantId` derivados del profile SSR.
- [x] Dashboard pages (dashboard, guests, seating): usan `getActiveContext` para scoping.

#### Rutas públicas

- [ ] Revisar `app/rsvp` y `app/guest` con `createAdminClient` (service-role): confirmar que no exponen datos de otros tenants.
- [x] Lookup por `invitation_guid` es único globalmente → ok; `processGuestScanByFamily` ahora incluye `event_id` en los inserts de `scan_logs`.

---

### Fase 2 — Planes, límites y billing manual ✅ (backend)

#### Limits ya integrados (Fase 1)

- [x] `assertGuestQuota` + `assertEventEditable` en `createGuestAction`, `updateGuestAction`, `importGuestsAction`.
- [x] `assertEventEditable` en todas las Server Actions de seating (`createTable`, `updateTable`, `deleteTable`, `assignSeat`, `removeSeat`).

#### Limits backend

- [x] `assertCanCreateEvent` implementado en `lib/limits.ts` (pendiente wiring en UI — Fase 3).
- [x] `assertCanChangeEventDate` + `updateEventDate` → llama a `increment_date_changes_used` RPC (atómico).
- [x] `assertCanAddMember` implementado en `lib/limits.ts` (pendiente wiring en UI — Fase 3).
- [x] Bloqueo automático `is_locked=true`: `lock_past_events()` + trigger `trg_auto_lock_event` en migración `003`.

#### Billing manual — SQL (migración `003_saas_phase2_billing.sql`)

- [x] `lock_past_events()` — lock manual/cron de eventos pasados.
- [x] Trigger `trg_auto_lock_event` — lock inmediato si `event_date < CURRENT_DATE` al insertar/actualizar.
- [x] `confirm_payment(payment_id, reviewed_by, notes)` — atómico: confirma pago + activa subscription + log.
- [x] `reject_payment(payment_id, reviewed_by, notes)` — marca rechazado + log en `payment_events`.
- [x] `increment_date_changes_used(event_id, new_date)` — atómico: actualiza fecha + incrementa contador.
- [x] Políticas RLS de Storage para bucket `payment-proofs` (3 políticas idempotentes).
- [ ] Crear bucket `payment-proofs` en Supabase Dashboard (paso manual, privado).

#### Billing manual — Services y Server Actions

- [x] `services/plan.service.ts`: `getPlans`, `getTenantPlan`, `getPlanWithFeatures`, `getAllPlansWithFeatures`.
- [x] `services/billing.service.ts`: `createPendingPayment`, `confirmPayment`, `rejectPayment`, `createPendingSubscription`, queries de pagos/subscriptions.
- [x] `app/dashboard/settings/billing/actions.ts` — `submitPaymentProofAction`: optimiza con `sharp`, sube a Storage, crea payment + subscription pending.
- [x] `app/admin/billing/actions.ts` — `confirmPaymentAction` + `rejectPaymentAction` (requieren `platform.billing.confirm` / `.reject`).
- [x] `lib/image-optimizer.ts` — validación + compresión JPEG con `sharp`; PDFs pass-through.
- [x] `sharp` instalado como dependencia de producción (`pnpm add sharp`).
- [x] `services/index.ts` exporta `plan.service` y `billing.service`.

---

### Fase 3 — UI multi-tenant + portal `/admin` ✅ (parcial)

#### Onboarding y autenticación

- [x] `app/auth/sign-up`: wizard 2 pasos — credenciales → tipo de cuenta (individual/organización) + nombre del workspace (`sign-up-client.tsx`).
- [x] Provisión automática de tenant + evento por defecto en `app/auth/callback/route.ts` al primer login (lee `user_metadata.tenant_type` y `workspace_name`).

#### Contexto de tenant/evento

- [ ] Selector de tenant activo en `app/dashboard/layout.tsx` (si el usuario pertenece a varios tenants).
- [ ] Selector de evento activo (si el tenant tiene más de un evento).
- [x] Contexto de servidor del tenant activo en todo el layout del dashboard (`getActiveContext` en cada page/action).

#### Gestión del tenant

- [x] Pantalla de miembros `/dashboard/settings/members`: invitar por email (`inviteUserByEmail`), asignar rol, revocar acceso; validación de seats pendiente de wiring con `assertCanAddMember`.
- [ ] Asignación de miembros a eventos (`event_members`).
- [x] Pantalla de plan/uso `/dashboard/settings/billing`: barras de progreso `max_guests_per_event`, `max_events`, `max_members`.
- [x] Pantalla de billing: plan actual, historial de pagos, formulario de comprobante bancario + selector de planes Stripe.
- [ ] Gestión de estados personalizados del evento.
- [ ] Gestión de sesiones personalizadas del evento.

#### Navegación del dashboard

- [x] `components/dashboard/header.tsx`: enlace **Miembros** y **Facturación** en menú de ajustes; enlace **Portal Admin** visible solo para `is_super_admin`.

#### Portal de plataforma `/admin`

- [x] Protección de ruta: `requirePlatformPermission('platform.tenants.view')` en `app/admin/layout.tsx`.
- [x] `/admin/tenants`: listado de todos los tenants con badge de tipo, estado y plan activo. Acciones: suspender, reactivar, cambiar plan.
- [x] `/admin/plans`: toggle activo/inactivo + editar `stripe_price_id` por plan.
- [x] `/admin/billing`: bandeja de pagos pendientes; confirmar (activa subscription) / rechazar con nota; enlace al comprobante en bucket.
- [x] `/admin/globals`: CRUD de statuses y sessions globales (key, label, color, sort_order).
- [x] `/admin/roles`: catálogo de roles de plataforma + asignar/revocar rol a usuario por UUID.

#### Middleware de subdominio

- [ ] `middleware.ts`: si `host` coincide con `*.dominio.com`, resolver tenant por `subdomain` e inyectar en headers.
- [ ] Mantener refresh de sesión Supabase SSR dentro del mismo middleware.
- [ ] Configurar wildcard domain en Vercel + DNS `*.dominio.com`.

##### Fase 3b — Completado ✅

- [x] `assertCanAddMember` conectado en `inviteMemberAction` (quota enforcement).
- [x] `services/status.service.ts`, `services/session.service.ts`, `services/platform.service.ts` creados.
- [x] `services/index.ts` exporta los tres nuevos servicios.
- [x] `/admin/tenants` acciones: suspender, reactivar, cambiar plan (`TenantActions` component).
- [x] `/admin/plans`: toggle active + editar stripe_price_id (`PlanRowActions` component).
- [x] `/admin/globals`: CRUD global statuses + sessions (`GlobalsManager` component).
- [x] `/admin/roles`: catálogo de roles + asignar/revocar a usuario (`RolesManager` component).
- [x] `/dashboard/settings/event`: CRUD custom statuses + sessions por evento (`EventConfig` component).
- [x] Admin layout nav: enlaces a Plans, Globals, Roles con guards de permiso.
- [x] Dashboard sidebar: enlace **Config. Evento** en grupo Settings.

##### Pendiente (próxima iteración)

- [ ] Selector de tenant/evento activo en el header del dashboard.
- [ ] Asignación de miembros a eventos (`event_members`).
- [ ] Middleware de subdominio para multi-tenant por URL.

---

### Fase 4 — Stripe ✅

- [x] `lib/stripe.ts`: singleton `Stripe` con `apiVersion` fijada; usa `STRIPE_SECRET_KEY`.
- [x] `lib/db/migrations/004_saas_phase4_stripe.sql`: `ALTER TABLE tenants ADD COLUMN stripe_customer_id TEXT UNIQUE` (idempotente).
- [x] `lib/types.ts`: `Tenant.stripe_customer_id` añadido.
- [x] `services/billing.service.ts`: `getStripeCustomerId`, `saveStripeCustomerId`, `activateSubscriptionFromStripe`, `createStripePayment`, `logStripeEvent`.
- [x] `createCheckoutSessionAction(planId)`: crea/recupera Customer de Stripe, crea Checkout Session (`payment` o `subscription` según `billing_type`); pasa `metadata.{tenant_id, plan_id, user_id}`.
- [x] `createPortalSessionAction()`: crea sesión del Customer Portal de Stripe (gestión de upgrade/downgrade/cancelación/método de pago).
- [x] `app/api/stripe/webhook/route.ts`: verifica firma con `STRIPE_WEBHOOK_SECRET`; maneja:
  - `checkout.session.completed` → activa subscription + crea payment confirmado.
  - `invoice.payment_succeeded` → actualiza `current_period_end`.
  - `invoice.payment_failed` → `subscription.status = 'past_due'`.
  - `customer.subscription.updated` → sincroniza status y `current_period_end`.
  - `customer.subscription.deleted` → `subscription.status = 'canceled'`.
  - Todos los eventos se loguean en `payment_events` con `raw_payload` completo.
- [x] `components/settings/stripe-plan-selector.tsx`: tarjetas por plan con precio, límites y features; plan activo resaltado; botón "Seleccionar" → Checkout; botón "Gestionar suscripción" → Customer Portal (visible si ya hay `stripe_customer_id`).
- [x] `app/dashboard/settings/billing/page.tsx`: integra `StripePlanSelector` + filtra planes por tipo de tenant.
- [x] `.env.example` documentado con `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.

##### Pendiente para producción

- [ ] Crear productos y precios en el dashboard de Stripe y actualizar `plans.stripe_price_id` en Supabase.
- [ ] Configurar Customer Portal en Stripe Dashboard (qué acciones se permiten).
- [ ] Registrar el webhook en Stripe Dashboard apuntando a `https://dominio.com/api/stripe/webhook`.
- [ ] Activar `invoice.payment_failed` → notificación por email al tenant.

---

## 9. Verificación por fase

### Fase 0

- [ ] Ejecutar script en una copia de la BD de producción; conteos de `guests`, `categories`, `scan_logs` idénticos antes y después.
- [ ] `status_id` / `session_id` resuelven a las globales correctas en todas las filas.
- [ ] La app actual sigue funcionando (columnas legacy aún presentes).
- [ ] `pnpm build` pasa sin errores en la rama.

### Fase 1 — Aislamiento (RLS)

- [ ] Con 2 tenants de prueba, las funciones `SECURITY DEFINER` y los services NO devuelven datos del otro tenant.
- [ ] Miembro sin entrada en `event_members` no puede ver el evento.
- [ ] RSVP público (`invitation_guid`) funciona sin exponer otros tenants.

### Fase 2 — Límites y billing

- [ ] Superar `max_guests_per_event` → bloqueado con mensaje claro.
- [ ] Crear evento extra en plan individual → bloqueado.
- [ ] Exceder `max_free_date_changes` → bloqueado o redirigido a compra.
- [ ] Subir comprobante → imagen optimizada en bucket, tamaño razonable.
- [ ] Confirmar pago como admin → subscription activa, evento utilizable.
- [ ] Rechazar pago → subscription sigue `pending`.

### Fase 3 — RBAC granular y subdominio

- [ ] Usuario con subset de scopes ve/oculta los botones correctos (`anyPermission`/`allPermission`).
- [ ] Admin de plataforma accede a `/admin`; tenant normal obtiene 403.
- [ ] `org.dominio.local` resuelve al tenant correcto vía middleware.
- [ ] Tenant sin feature `custom_subdomain` no tiene entrada en `tenants.subdomain`.

### Regresión continua

- [ ] Flujos existentes (RSVP, scanner, seating) funcionan sobre el evento activo.
- [ ] `pnpm build` y `eslint` pasan en cada fase antes de hacer PR.

---

## 10. Riesgos y puntos críticos

| #   | Riesgo                                                                                                            | Mitigación                                                                                                         |
| --- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| R1  | ~~**Fuga de datos entre tenants** vía funciones `SECURITY DEFINER` sin filtro de `event_id`~~ **RESUELTO Fase 1** | Migración `002` añade `p_event_id` a las 4 funciones críticas; `getActiveContext` siempre pasa el `eventId` activo |
| R2  | Migración status/event_type text→FK — pérdida de datos si la transacción falla                                    | Migración idempotente y transaccional; verificar conteos antes y después                                           |
| R3  | RLS mal configurada rompe funciones `SECURITY DEFINER` o el RSVP público                                          | Testear con 2 tenants + usuario anónimo antes de pasar a Fase 2                                                    |
| R4  | Mezcla de permisos de plataforma con permisos de tenant                                                           | Dos catálogos separados; `requirePlatformPermission` nunca lee `tenant_members`                                    |
| R5  | Coherencia event_id: guest sentado en mesa de otro evento                                                         | Validar en service/action que `table.event_id = guest.event_id`                                                    |
| R6  | Phase 0b ejecutada antes de que el código lea las nuevas columnas                                                 | Sección K comentada en el SQL; requiere despliegue explícito de Fase 1 primero                                     |

---

## 11. Glosario

| Término                | Definición                                                                                                             |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **Tenant / workspace** | Cuenta (individual u organización) que aísla todos los datos.                                                          |
| **Evento (proyecto)**  | Una boda/celebración con su propia lista, fecha y configuración. Límite 1-2 en plan individual.                        |
| **Sesión**             | Sub-evento dentro de un proyecto (ceremonia, recepción, cocktail…); dinámico y configurable.                           |
| **Estado**             | Estado de un invitado (confirmed, pending…); global de plataforma o personalizado por tenant/evento.                   |
| **Plan**               | Define los límites por evento y número de miembros; puede ser `one_time` o `recurring`.                                |
| **Feature**            | Flag booleano adicional al plan (subdominio, white label, etc.); asignado en `plan_features`.                          |
| **Plataforma**         | El SaaS en sí; su backoffice `/admin` y su RBAC propio (tablas `platform_*`).                                          |
| **Fase 0b**            | Bloque de constraints diferido (NOT NULL, UNIQUE scoped, drop columnas viejas); solo se ejecuta tras desplegar Fase 1. |
