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

const LEAD_STATUS_VARIANT: Record<
  LeadStatus,
  "pending" | "warning" | "success"
> = {
  invitado: "pending",
  registrado: "warning",
  en_proceso: "success",
}

export default async function LeadsPage() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  const admin = createAdminClient(url, key)

  // Leads: companies pre-creadas con lead_invited_at NOT NULL
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

  // Agentes: perfiles no-clientes para el selector del formulario
  const { data: agents } = await admin
    .from("profiles")
    .select("id, full_name")
    .neq("role", "client")
    .eq("is_active", true)
    .order("full_name")

  const leadList = leads ?? []

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Leads</h1>
          <p className="text-sm text-slate-500 mt-1">
            Empresas pre-creadas por el equipo comercial con invitación enviada al cliente.
          </p>
        </div>
        <NewLeadForm agents={agents ?? []} />
      </div>

      {leadList.length === 0 ? (
        <p className="text-sm text-slate-500">
          Aún no hay leads. Usa &ldquo;Nuevo lead&rdquo; para crear el primero.
        </p>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  {["Empresa", "Correo", "Producto", "Agente", "Estado", "Invitado", ""].map((h) => (
                    <th
                      key={h}
                      className="text-left px-4 py-3 text-xs font-medium text-slate-600 uppercase tracking-wide"
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
                    <tr
                      key={lead.id}
                      className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="px-4 py-3 font-medium text-slate-800">
                        {lead.legal_name}
                        {lead.tax_id && (
                          <span className="block text-xs text-slate-400 font-mono mt-0.5">
                            {lead.tax_id}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600 text-xs">
                        {lead.contact_email ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-xs">
                          {lead.lead_product_code === "cards"
                            ? "Tarjeta Payefy"
                            : lead.lead_product_code === "terminals"
                            ? "Terminal TPV"
                            : (lead.lead_product_code ?? "—")}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-slate-600 text-xs">
                        {agent?.full_name ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={LEAD_STATUS_VARIANT[leadStatus]}>
                          {LEAD_STATUS_LABELS[leadStatus]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {lead.lead_invited_at
                          ? formatDistanceToNow(new Date(lead.lead_invited_at), {
                              addSuffix: true,
                              locale: es,
                            })
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {firstApp && (
                          <Link
                            href={`/admin/applications/${firstApp.id}/review`}
                            className="text-xs text-emerald-700 hover:underline font-medium"
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
  )
}
