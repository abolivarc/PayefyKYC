import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { FileText, Clock, CheckCircle, AlertCircle, KanbanSquare, Building2 } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"
import { Badge } from "@/components/ui/badge"

const STATUS_LABELS: Record<string, string> = {
  draft: "Borrador",
  documents_pending: "Pendiente de documentos",
  in_compliance_review: "En revisión",
  changes_requested: "Cambios solicitados",
  approved_compliance: "Aprobado compliance",
  in_provider_review: "En revisión proveedor",
  provider_changes_requested: "Cambios proveedor",
  approved_provider: "Aprobado proveedor",
  contracts_pending: "Contratos pendientes",
  contracts_signed: "Contratos firmados",
  activation_pending: "Activación pendiente",
  activated: "Activo ✓",
  rejected: "Rechazado",
  archived: "Archivado",
}

const STATUS_VARIANT: Record<
  string,
  "default" | "success" | "warning" | "destructive" | "pending"
> = {
  draft: "pending",
  documents_pending: "warning",
  in_compliance_review: "warning",
  changes_requested: "destructive",
  approved_compliance: "success",
  in_provider_review: "warning",
  approved_provider: "success",
  contracts_pending: "warning",
  contracts_signed: "success",
  activation_pending: "warning",
  activated: "success",
  rejected: "destructive",
  archived: "pending",
}

const PRODUCT_VARIANT: Record<string, "default" | "warning"> = {
  cards: "default",
  terminals: "warning",
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return "Buenos días"
  if (hour < 18) return "Buenas tardes"
  return "Buenas noches"
}

function formatDateEs(date: Date): string {
  return date.toLocaleDateString("es-MX", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

export default async function AdminDashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user?.id ?? "")
    .single()

  // 1. Métricas generales
  const { data: allApps } = await supabase
    .from("applications")
    .select("id, status, created_at, updated_at, products(code)")

  // 2. Documentos pendientes de revisión
  const { data: pendingDocs } = await supabase
    .from("documents")
    .select(
      "id, application_id, document_templates(name), applications(companies(legal_name))"
    )
    .eq("status", "pending_review")
    .order("uploaded_at", { ascending: true })
    .limit(8)

  // 3. Solicitudes recientes
  const { data: recentApps } = await supabase
    .from("applications")
    .select("id, status, updated_at, companies(legal_name), products(name, code)")
    .order("updated_at", { ascending: false })
    .limit(8)

  const apps = allApps ?? []
  const total = apps.length
  const pending = apps.filter((a) =>
    ["in_compliance_review", "in_provider_review"].includes(a.status)
  ).length
  const approved = apps.filter((a) => a.status === "activated").length
  const changesRequested = apps.filter((a) =>
    ["changes_requested", "provider_changes_requested"].includes(a.status)
  ).length

  const greeting = getGreeting()
  const name = profile?.full_name || user?.email || "Usuario"
  const today = formatDateEs(new Date())

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto">
      {/* Greeting */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">
          {greeting}, {name}
        </h1>
        <p className="text-sm text-slate-500 mt-1 capitalize">{today}</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* ── Columna izquierda (2/3) ── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Stat cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard
              label="Total solicitudes"
              value={total}
              sub="desde el inicio"
              icon={<FileText className="h-5 w-5 text-slate-400" />}
            />
            <StatCard
              label="Pendientes de revisión"
              value={pending}
              sub="requieren atención"
              icon={
                <Clock
                  className={`h-5 w-5 ${pending > 0 ? "text-amber-500" : "text-slate-400"}`}
                />
              }
              highlight={pending > 0 ? "amber" : undefined}
            />
            <StatCard
              label="Aprobadas"
              value={approved}
              sub="completadas"
              icon={<CheckCircle className="h-5 w-5 text-emerald-500" />}
              highlight={approved > 0 ? "emerald" : undefined}
            />
            <StatCard
              label="Con cambios solicitados"
              value={changesRequested}
              sub="esperando al cliente"
              icon={
                <AlertCircle
                  className={`h-5 w-5 ${changesRequested > 0 ? "text-red-500" : "text-slate-400"}`}
                />
              }
              highlight={changesRequested > 0 ? "red" : undefined}
            />
          </div>

          {/* Tabla solicitudes recientes */}
          <section className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-900">Solicitudes recientes</h2>
            </div>
            {!recentApps?.length ? (
              <p className="p-5 text-sm text-slate-500">
                Aún no hay solicitudes registradas.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      <th className="text-left px-5 py-3 font-medium text-slate-600 text-xs uppercase tracking-wide">
                        Empresa
                      </th>
                      <th className="text-left px-3 py-3 font-medium text-slate-600 text-xs uppercase tracking-wide">
                        Producto
                      </th>
                      <th className="text-left px-3 py-3 font-medium text-slate-600 text-xs uppercase tracking-wide">
                        Estado
                      </th>
                      <th className="text-left px-3 py-3 font-medium text-slate-600 text-xs uppercase tracking-wide">
                        Actualizado
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentApps.map((app) => {
                      const company = (app.companies as unknown) as {
                        legal_name: string
                      } | null
                      const product = (app.products as unknown) as {
                        name: string
                        code: string
                      } | null
                      const timeAgo = formatDistanceToNow(
                        new Date(app.updated_at),
                        { addSuffix: true, locale: es }
                      )
                      return (
                        <tr
                          key={app.id}
                          className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors"
                        >
                          <td className="px-5 py-3">
                            <Link
                              href={`/admin/applications/${app.id}/review`}
                              className="font-medium text-slate-800 hover:text-emerald-700 hover:underline"
                            >
                              {company?.legal_name ?? "—"}
                            </Link>
                          </td>
                          <td className="px-3 py-3">
                            <Badge
                              variant={
                                PRODUCT_VARIANT[product?.code ?? ""] ?? "outline"
                              }
                              className="text-xs"
                            >
                              {product?.name ?? "—"}
                            </Badge>
                          </td>
                          <td className="px-3 py-3">
                            <Badge
                              variant={STATUS_VARIANT[app.status] ?? "pending"}
                              className="text-xs"
                            >
                              {STATUS_LABELS[app.status] ?? app.status}
                            </Badge>
                          </td>
                          <td className="px-3 py-3 text-xs text-slate-500">
                            {timeAgo}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        {/* ── Columna derecha (1/3) ── */}
        <div className="space-y-6">
          {/* Documentos por revisar */}
          <section className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-900">Documentos por revisar</h2>
            </div>
            <div className="p-4 space-y-2">
              {!pendingDocs?.length ? (
                <p className="text-sm text-emerald-700 font-medium">
                  ✓ No hay documentos pendientes de revisión
                </p>
              ) : (
                pendingDocs.map((doc) => {
                  const template = (doc.document_templates as unknown) as {
                    name: string
                  } | null
                  const appData = (doc.applications as unknown) as {
                    companies: { legal_name: string } | null
                  } | null
                  const companyName = appData?.companies?.legal_name
                  return (
                    <Link
                      key={doc.id}
                      href={`/admin/applications/${doc.application_id}/review`}
                      className="block rounded-lg p-3 hover:bg-slate-50 transition-colors"
                    >
                      <p className="text-sm font-medium text-slate-800 leading-snug">
                        {template?.name ?? "Documento"}
                      </p>
                      {companyName && (
                        <p className="text-xs text-slate-500 mt-0.5">{companyName}</p>
                      )}
                    </Link>
                  )
                })
              )}
            </div>
          </section>

          {/* Accesos rápidos */}
          <section className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-900">Accesos rápidos</h2>
            </div>
            <div className="p-3 space-y-1">
              <Link
                href="/admin/kanban"
                className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-slate-100 transition-colors group"
              >
                <KanbanSquare className="h-5 w-5 text-slate-400 group-hover:text-emerald-700" />
                <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900">
                  Ver Kanban completo
                </span>
              </Link>
              <Link
                href="/admin/clients"
                className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-slate-100 transition-colors group"
              >
                <Building2 className="h-5 w-5 text-slate-400 group-hover:text-emerald-700" />
                <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900">
                  Ver todos los clientes
                </span>
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  sub,
  icon,
  highlight,
}: {
  label: string
  value: number
  sub: string
  icon: React.ReactNode
  highlight?: "amber" | "emerald" | "red"
}) {
  const valueColor =
    highlight === "amber"
      ? "text-amber-600"
      : highlight === "emerald"
      ? "text-emerald-600"
      : highlight === "red"
      ? "text-red-600"
      : "text-slate-900"

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-slate-600 leading-snug">{label}</p>
        {icon}
      </div>
      <p className={`text-3xl font-bold ${valueColor}`}>{value}</p>
      <p className="text-xs text-slate-400">{sub}</p>
    </div>
  )
}
