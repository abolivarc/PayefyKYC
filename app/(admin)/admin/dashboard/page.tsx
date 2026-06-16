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

  const { data: allApps } = await supabase
    .from("applications")
    .select("id, status, created_at, updated_at, products(code)")

  const { data: pendingDocs } = await supabase
    .from("documents")
    .select(
      "id, application_id, document_templates(name), applications(companies(legal_name))"
    )
    .eq("status", "pending_review")
    .order("uploaded_at", { ascending: true })
    .limit(8)

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
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100%" }}>
      {/* ── Topbar ── */}
      <header style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, padding: "24px 32px 16px", flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 800, letterSpacing: "-.02em", lineHeight: 1.1, color: "var(--admin-text, #0F1B2A)" }}>
            {greeting}, {name.split(" ")[0]}
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--admin-text-muted, #5A6B7B)", textTransform: "capitalize" }}>
            {today}
          </p>
        </div>
      </header>

      {/* ── Content ── */}
      <div style={{ padding: "0 32px 32px", flex: 1 }}>
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left column */}
          <div className="lg:col-span-2 space-y-5">
            {/* Stat cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard
                label="Total solicitudes"
                value={total}
                sub="desde el inicio"
                icon={<FileText size={16} style={{ color: "var(--admin-text-subtle, #8A99A8)" }} />}
              />
              <StatCard
                label="En revisión"
                value={pending}
                sub="requieren atención"
                icon={<Clock size={16} color={pending > 0 ? "#D97706" : "var(--admin-text-subtle, #8A99A8)"} />}
                highlight={pending > 0 ? "amber" : undefined}
              />
              <StatCard
                label="Activadas"
                value={approved}
                sub="completadas"
                icon={<CheckCircle size={16} color="#059669" />}
                highlight={approved > 0 ? "emerald" : undefined}
              />
              <StatCard
                label="Cambios solicitados"
                value={changesRequested}
                sub="esperando al cliente"
                icon={<AlertCircle size={16} color={changesRequested > 0 ? "#DC2626" : "var(--admin-text-subtle, #8A99A8)"} />}
                highlight={changesRequested > 0 ? "red" : undefined}
              />
            </div>

            {/* Recent apps table */}
            <div style={{ background: "var(--admin-surface, #fff)", border: "1px solid var(--admin-border, #E7ECF1)", borderRadius: 16, boxShadow: "0 1px 2px rgba(16,30,45,.05)", overflow: "hidden" }}>
              <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--admin-border, #E7ECF1)", background: "var(--admin-surface-2, #FBFCFD)" }}>
                <h2 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 600, color: "var(--admin-text, #0F1B2A)" }}>
                  Solicitudes recientes
                </h2>
              </div>
              {!recentApps?.length ? (
                <p style={{ padding: "20px", fontSize: 13, color: "var(--admin-text-muted, #5A6B7B)", margin: 0 }}>
                  Aún no hay solicitudes registradas.
                </p>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: "var(--admin-surface-2, #FBFCFD)", borderBottom: "1px solid var(--admin-border, #E7ECF1)" }}>
                        {[["Empresa", "20px"], ["Producto", "12px"], ["Estado", "12px"], ["Actualizado", "12px"]].map(([h, pl]) => (
                          <th key={h} style={{ textAlign: "left", padding: `12px ${pl}`, fontSize: 11, fontWeight: 600, letterSpacing: ".05em", textTransform: "uppercase", color: "var(--admin-text-subtle, #8A99A8)", whiteSpace: "nowrap" }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(recentApps ?? []).map((app) => {
                        const company = (app.companies as unknown) as { legal_name: string } | null
                        const product = (app.products as unknown) as { name: string; code: string } | null
                        const timeAgo = formatDistanceToNow(new Date(app.updated_at), { addSuffix: true, locale: es })
                        return (
                          <tr key={app.id} className="table-row-hover" style={{ borderBottom: "1px solid var(--admin-border, #E7ECF1)" }}>
                            <td style={{ padding: "14px 20px", verticalAlign: "middle" }}>
                              <Link
                                href={`/admin/applications/${app.id}/review`}
                                style={{ fontWeight: 600, fontSize: 14, color: "var(--admin-text, #0F1B2A)", textDecoration: "none", letterSpacing: "-.01em" }}
                              >
                                {company?.legal_name ?? "—"}
                              </Link>
                            </td>
                            <td style={{ padding: "14px 12px", verticalAlign: "middle" }}>
                              <Badge variant={PRODUCT_VARIANT[product?.code ?? ""] ?? "outline"} className="text-xs">
                                {product?.name ?? "—"}
                              </Badge>
                            </td>
                            <td style={{ padding: "14px 12px", verticalAlign: "middle" }}>
                              <Badge variant={STATUS_VARIANT[app.status] ?? "pending"} className="text-xs">
                                {STATUS_LABELS[app.status] ?? app.status}
                              </Badge>
                            </td>
                            <td style={{ padding: "14px 12px", verticalAlign: "middle", fontSize: 13, color: "var(--admin-text-muted, #5A6B7B)" }}>
                              {timeAgo}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-5">
            {/* Pending docs */}
            <div style={{ background: "var(--admin-surface, #fff)", border: "1px solid var(--admin-border, #E7ECF1)", borderRadius: 16, boxShadow: "0 1px 2px rgba(16,30,45,.05)", overflow: "hidden" }}>
              <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--admin-border, #E7ECF1)", background: "var(--admin-surface-2, #FBFCFD)" }}>
                <h2 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 600, color: "var(--admin-text, #0F1B2A)" }}>
                  Documentos por revisar
                </h2>
              </div>
              <div style={{ padding: "12px 16px" }}>
                {!pendingDocs?.length ? (
                  <p style={{ fontSize: 13, fontWeight: 600, color: "var(--admin-brand-strong, #0B7A44)", margin: 0 }}>
                    ✓ Sin documentos pendientes
                  </p>
                ) : (
                  pendingDocs.map((doc) => {
                    const template = (doc.document_templates as unknown) as { name: string } | null
                    const appData = (doc.applications as unknown) as { companies: { legal_name: string } | null } | null
                    const companyName = appData?.companies?.legal_name
                    return (
                      <Link
                        key={doc.id}
                        href={`/admin/applications/${doc.application_id}/review`}
                        style={{ display: "block", padding: "10px 8px", borderRadius: 8, textDecoration: "none", transition: "background .12s" }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--admin-bg, #F6F8FA)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                      >
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: "var(--admin-text, #0F1B2A)", lineHeight: 1.3 }}>
                          {template?.name ?? "Documento"}
                        </p>
                        {companyName && (
                          <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--admin-text-muted, #5A6B7B)" }}>
                            {companyName}
                          </p>
                        )}
                      </Link>
                    )
                  })
                )}
              </div>
            </div>

            {/* Quick links */}
            <div style={{ background: "var(--admin-surface, #fff)", border: "1px solid var(--admin-border, #E7ECF1)", borderRadius: 16, boxShadow: "0 1px 2px rgba(16,30,45,.05)", overflow: "hidden" }}>
              <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--admin-border, #E7ECF1)", background: "var(--admin-surface-2, #FBFCFD)" }}>
                <h2 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 600, color: "var(--admin-text, #0F1B2A)" }}>
                  Accesos rápidos
                </h2>
              </div>
              <div style={{ padding: "8px 12px" }}>
                {[
                  { href: "/admin/kanban", Icon: KanbanSquare, label: "Ver Kanban completo" },
                  { href: "/admin/clients", Icon: Building2, label: "Ver todos los clientes" },
                ].map(({ href, Icon, label }) => (
                  <Link
                    key={href}
                    href={href}
                    style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 8px", borderRadius: 8, textDecoration: "none", transition: "background .12s" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--admin-bg, #F6F8FA)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                  >
                    <Icon size={16} style={{ color: "var(--admin-text-subtle, #8A99A8)", flexShrink: 0 }} />
                    <span style={{ fontSize: 14, fontWeight: 500, color: "var(--admin-text, #0F1B2A)" }}>{label}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
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
    highlight === "amber" ? "#D97706"
    : highlight === "emerald" ? "#059669"
    : highlight === "red" ? "#DC2626"
    : "var(--admin-text, #0F1B2A)"

  return (
    <div style={{ background: "var(--admin-surface, #fff)", border: "1px solid var(--admin-border, #E7ECF1)", borderRadius: 11, boxShadow: "0 1px 2px rgba(16,30,45,.05)", padding: "14px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 10 }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 500, color: "var(--admin-text-muted, #5A6B7B)", lineHeight: 1.3 }}>{label}</p>
        {icon}
      </div>
      <p style={{ margin: "0 0 4px", fontSize: 28, fontWeight: 800, fontFamily: "var(--font-display)", color: valueColor, lineHeight: 1 }}>
        {value}
      </p>
      <p style={{ margin: 0, fontSize: 12, color: "var(--admin-text-subtle, #8A99A8)" }}>{sub}</p>
    </div>
  )
}
