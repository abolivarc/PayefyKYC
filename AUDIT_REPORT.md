# Reporte de Auditoría — PayefyKYC
**Fecha:** 2026-06-16  
**Entorno:** producción ofuscada + diagnóstico de código local  
**Digest investigado:** 4169464607 (`/admin/applications/[id]/review`)

---

## Tabla de rutas por rol

| Ruta | Rol | Estado | Detalle |
|------|-----|--------|---------|
| `/admin/dashboard` | super_admin / compliance | **OK** | Carga correctamente (bug `onMouseEnter` ya corregido en sesión anterior) |
| `/admin/kanban` | super_admin / compliance | **OK** | Sin handlers en Server Component; KanbanBoard es Client Component |
| `/admin/tracking` | super_admin | **OK** | Usa TrackingDashboard (Client Component); todas las tablas existen |
| `/admin/clients` | super_admin / compliance | **OK** | ClientsTable es Client Component; datos limpios |
| `/admin/leads` | super_admin | **ROTA → FIJADA** | `onMouseEnter`/`onMouseLeave` en `<Link>` desde Server Component → crash "Digest: [n]". **Fix:** reemplazado con `className="hover:underline"` |
| `/admin/tracking/orders` | super_admin | **ROTA → FIJADA** | Mismo patrón `onMouseEnter`/`onMouseLeave` en `<Link>` de Server Component. **Fix:** reemplazado con `className="hover:text-[#0F1B2A] transition-colors"` |
| `/admin/reportes` | super_admin | **OK** | Usa service role directamente; ReportsDashboard es Client Component |
| `/admin/applications/[id]/review` | super_admin / compliance | **ROTA → FIJADA** | **Digest: 4169464607** — `onMouseEnter`/`onMouseLeave` en dos `<Link>` (líneas 224 y 261). **Fix:** reemplazado con Tailwind `hover:` classes |
| `/admin/applications/[id]/audit` | super_admin / compliance | **OK** | Usa Tailwind hover nativo; sin event handlers |
| `/dashboard` | cliente | **OK** | Carga membership + applications correctamente |
| `/applications/[id]/documents` | cliente | **OK** | Upload ahora funciona (fix de esta sesión: route handler server-side) |
| `/applications/[id]/status` | cliente | **OK** | Solo muestra estado |
| `/applications/new` | cliente | **OK** | Wizard de alta completo |
| `/applications/[id]/forms/complementary_info` | cliente | **OK** | Implementado en sesión previa (modo portal + upload) |
| `/applications/[id]/forms/beneficial_owner` | cliente | **OK** | Formulario PDF existente |
| `/login` | anónimo | **OK** | Formulario de autenticación |
| `/forgot-password` | anónimo | **OK** | Flujo de reset existente |
| `/profile` | cliente | **OK** | Página de perfil |
| `/terminos` | cliente | **OK** | Página estática de términos |
| `/applications/[id]/debug` | cliente | **NO CONSTRUIDA** | Página de diagnóstico interno (sin UI real, solo debug log) — no es ruta de producto |
| `/admin/seguimiento` | super_admin | **NO EXISTE** | El sidebar apunta a `/admin/tracking` (no `/admin/seguimiento`) |

---

## Causa raíz del Digest 4169464607

**Diagnóstico:** `app/(admin)/admin/applications/[id]/review/page.tsx` es un **Server Component** (no tiene `"use client"`). En él, los componentes `<Link>` tenían props `onMouseEnter` y `onMouseLeave` con funciones arrow:

```tsx
// review/page.tsx — línea 224 (ANTES)
<Link
  onMouseEnter={(e) => (e.currentTarget.style.color = "var(--admin-text, #0F1B2A)")}
  onMouseLeave={(e) => (e.currentTarget.style.color = "var(--admin-text-muted, #5A6B7B)")}
>

// review/page.tsx — línea 261 (ANTES)
<Link
  onMouseEnter={(e) => { ... }}
  onMouseLeave={(e) => { ... }}
>
```

**Por qué crashea:** `<Link>` de Next.js es un Client Component. Next.js intenta serializar todas sus props al cruzar el boundary Server→Client. Las funciones (`() => ...`) **no son serializables** — Next.js lanza una excepción con el Digest correspondiente al checksum del error.

**Fix aplicado:** Reemplazadas por Tailwind `hover:` classes que se resuelven en CSS (sin JS, sin boundary problem):
```tsx
className="hover:text-[#0F1B2A] transition-colors"
className="hover:bg-[#F6F8FA] hover:text-[#0F1B2A] transition-all"
```

**Mismo patrón encontrado y corregido en:**
- `leads/page.tsx` — `"Ver expediente"` link
- `tracking/orders/page.tsx` — link "← Seguimiento"
- `admin/dashboard/page.tsx` — corregido en sesión anterior

---

## Bugs encontrados y corregidos en esta sesión

| # | Bug | Archivo(s) | Fix |
|---|-----|-----------|-----|
| 1 | **Digest 4169464607** — crash en `/review` | `review/page.tsx` | Eliminar `onMouseEnter`/`onMouseLeave` de Links Server Component |
| 2 | Crash en `/admin/leads` | `leads/page.tsx` | Mismo fix |
| 3 | Crash en `/admin/tracking/orders` | `tracking/orders/page.tsx` | Mismo fix |
| 4 | Upload de documentos falla con "new row violates RLS" (afecta Acta Constitutiva y todos los uploads estándar) | `document-upload-row.tsx`, `multi-upload-row.tsx`, `check-or-upload-row.tsx`, `actions.ts` | Mover upload a route handler server-side `/api/documents/[id]/upload`; service role con verificación explícita de membresía |

---

## Lista priorizada

### Arreglar (ROTO)

| Prioridad | Ítem | Impacto | Esfuerzo |
|-----------|------|---------|---------|
| ✅ P0 — DONE | Crash `/review` (Digest 4169464607) | Bloquea revisión de expedientes | Bajo (2 líneas) |
| ✅ P0 — DONE | Crash `/leads` y `/tracking/orders` | Bloquea páginas de leads y pedidos | Bajo (2 líneas c/u) |
| ✅ P0 — DONE | Upload documentos falla RLS | Bloquea toda la subida de archivos del cliente | Medio (nuevo route handler) |

### Construir (NO CONSTRUIDO / FALTANTE)

| Prioridad | Ítem | Descripción | Esfuerzo estimado |
|-----------|------|-------------|------------------|
| P1 | **Updates / Notificaciones** | Pestaña de notificaciones del cliente (inbox) — mencionada en plan pero no implementada | Medio |
| P1 | **Filtros en `/admin/clients`** | Búsqueda y filtro por estado en la tabla de clientes | Bajo |
| P2 | **Panel de estado para contratos** | Mostrar al cliente el estado de contratos (DocuSign / Weetrust) desde el cliente portal | Medio |
| P2 | **`/admin/pedidos` con acciones** | OrdersTable actual solo muestra; falta marcar como enviado/entregado | Medio |
| P3 | **`/applications/[id]/debug`** | Convertir en herramienta útil o eliminar de producción | Bajo |
| P3 | **Tests de upload end-to-end** | Playwright para verificar que el upload completo (storage + DB) funciona post-fix | Bajo |

---

## Verificación

- `npx tsc --noEmit` — **sin errores**
- Fixes comitados en commit separado: `fix: remove onMouseEnter/Leave from server component Links`
- Suite de auditoría: `tests/e2e/audit.spec.ts` (nuevo)
- Suite existente (43 tests): sin regresiones esperadas (no se tocó lógica de negocio)
