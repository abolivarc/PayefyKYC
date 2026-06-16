import { createClient as createAdminClient } from "@supabase/supabase-js"
import { Badge } from "@/components/ui/badge"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"
import { NewLeadForm } from "@/components/admin/new-lead-form"
import Link from "next/link"

type LeadStatus = "invitado" | "registrado" | "en_proceso"

function deriveLeadStatus(
  companyStatus: string,
  hasMembers: boolean,
  hasActiveApps: boolean
): LeadStatus {
  if (companyStatus === "lead") return "invitado"
  if (!hasMembers) return "invitado"
  if (hasActiveApps) return "en_proceso"
  return "registrado"
}

const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  invitado: "Invitado",
  registrado: "Registrado",
  en_proceso: "En proceso",
}

const LEAD_STATUS_VARIANT: Record<LeadStatus, "pending" | "warning" | "success"> = {
  invitado: "pending",
  registrado: "warning",
  en_proceso: "success",
}

export default async function LeadsPage() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  const admin = createAdminClient(url, key)

  const { data: leads } = await admin
    .from("companies")
    .select(
      `id, legal_name, tax_id, contact_email, lead_product_code, status,
       lead_invited_at,
       assigned_agent:assigned_agent_id(full_name),
       company_users(user_id),
       applications(id, status)`
    )
    .not("lead_invited_at", "is", null)
    .order("lead_invited_at", { ascending: false })

  const { data: agents } = await admin
    .from("profiles")
    .select("id, full_name")
    .neq("role", "client")
    .eq("is_active", true)
    .order("full_name")

  const leadList = leads ?? []

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100%" }}>
      {/* ── Topbar ── */}
      <header style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, padding: "24px 32px 16px", flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 800, letterSpacing: "-.02em", lineHeight: 1.1, color: "var(--admin-text, #0F1B2A)" }}>
            Leads
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--admin-text-muted, #5A6B7B)" }}>
            <b style={{ color: "var(--admin-text, #0F1B2A)", fontWeight: 600 }}>{leadList.length}</b>{" "}
            empresas con invitación enviada
          </p>
        </div>
        <NewLeadForm agents={agents ?? []} />
      </header>

      {/* ── Content ── */}
      <div style={{ padding: "0 32px 32px" }}>
        {leadList.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--admin-text-muted, #5A6B7B)", margin: 0 }}>
            Aún no hay leads. Usa &ldquo;Nuevo lead&rdquo; para crear el primero.
          </p>
        ) : (
          <div style={{ background: "var(--admin-surface, #fff)", border: "1px solid var(--admin-border, #E7ECF1)", borderRadius: 16, boxShadow: "0 1px 2px rgba(16,30,45,.05)", overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "var(--admin-surface-2, #FBFCFD)", borderBottom: "1px solid var(--admin-border, #E7ECF1)" }}>
                    {["Empresa", "Correo", "Producto", "Agente", "Estado", "Invitado", ""].map((h) => (
                      <th
                        key={h}
                        style={{ textAlign: "left", padding: "12px 20px", fontSize: 11, fontWeight: 600, letterSpacing: ".05em", textTransform: "uppercase", color: "var(--admin-text-subtle, #8A99A8)", whiteSpace: "nowrap" }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {leadList.map((lead) => {
                    const members = (lead.company_users as { user_id: string }[]) ?? []
                    const apps = (lead.applications as { id: string; status: string }[]) ?? []
                    const hasActiveApps = apps.some((a) => a.status !== "draft")
                    const leadStatus = deriveLeadStatus(lead.status, members.length > 0, hasActiveApps)
                    const agent = (lead.assigned_agent as unknown as { full_name: string } | null)
                    const firstApp = apps[0]

                    return (
                      <tr key={lead.id} className="table-row-hover" style={{ borderBottom: "1px solid var(--admin-border, #E7ECF1)" }}>
                        <td style={{ padding: "14px 20px", verticalAlign: "middle" }}>
                          <span style={{ fontWeight: 600, fontSize: 14, color: "var(--admin-text, #0F1B2A)", letterSpacing: "-.01em", display: "block" }}>
                            {lead.legal_name}
                          </span>
                          {lead.tax_id && (
                            <span style={{ fontSize: 12, color: "var(--admin-text-subtle, #8A99A8)", fontFamily: "var(--font-mono)", letterSpacing: ".02em", display: "block", marginTop: 2 }}>
                              {lead.tax_id}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: "14px 20px", verticalAlign: "middle", fontSize: 13, color: "var(--admin-text-muted, #5A6B7B)" }}>
                          {lead.contact_email ?? "—"}
                        </td>
                        <td style={{ padding: "14px 20px", verticalAlign: "middle" }}>
                          <Badge variant="outline" className="text-xs">
                            {lead.lead_product_code === "cards"
                              ? "Tarjeta Payefy"
                              : lead.lead_product_code === "terminals"
                              ? "Terminal TPV"
                              : (lead.lead_product_code ?? "—")}
                          </Badge>
                        </td>
                        <td style={{ padding: "14px 20px", verticalAlign: "middle", fontSize: 13, color: "var(--admin-text-muted, #5A6B7B)" }}>
                          {agent?.full_name ?? "—"}
                        </td>
                        <td style={{ padding: "14px 20px", verticalAlign: "middle" }}>
                          <Badge variant={LEAD_STATUS_VARIANT[leadStatus]}>
                            {LEAD_STATUS_LABELS[leadStatus]}
                          </Badge>
                        </td>
                        <td style={{ padding: "14px 20px", verticalAlign: "middle", fontSize: 13, color: "var(--admin-text-muted, #5A6B7B)" }}>
                          {lead.lead_invited_at
                            ? formatDistanceToNow(new Date(lead.lead_invited_at), { addSuffix: true, locale: es })
                            : "—"}
                        </td>
                        <td style={{ padding: "14px 20px", verticalAlign: "middle", textAlign: "right" }}>
                          {firstApp && (
                            <Link
                              href={`/admin/applications/${firstApp.id}/review`}
                              style={{ fontSize: 13, fontWeight: 600, color: "var(--admin-brand-strong, #0B7A44)", textDecoration: "none" }}
                              onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
                              onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
                            >
                              Ver expediente
                            </Link>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
