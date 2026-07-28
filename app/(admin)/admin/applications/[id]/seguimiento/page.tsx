import { notFound } from "next/navigation"
import Link from "next/link"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { getStaffContext } from "@/lib/auth/staff"

export const metadata = { title: "Seguimiento | Payefy Admin" }

const STATUS_LABELS: Record<string, string> = {
  draft: "Borrador",
  documents_pending: "Documentos pendientes",
  in_compliance_review: "En revisión de compliance",
  changes_requested: "Cambios solicitados",
  approved_compliance: "Aprobado por compliance",
  in_provider_review: "En revisión del proveedor",
  provider_changes_requested: "Cambios solicitados por proveedor",
  approved_provider: "Aprobado por proveedor",
  contracts_pending: "Contratos pendientes",
  contracts_signed: "Contratos firmados",
  activation_pending: "Activación pendiente",
  activated: "Activo ✓",
  rejected: "Rechazado",
  archived: "Archivado",
}

const DOC_STATUS: Record<string, { label: string; bg: string; color: string; border: string }> = {
  pending_upload:    { label: "Pendiente",      bg: "#F3F7F4", color: "#5B7168", border: "#E4ECE7" },
  pending_review:    { label: "En revisión",    bg: "#EFF4FF", color: "#1D4ED8", border: "#DBE5FF" },
  approved:          { label: "Aprobado",       bg: "#E7F8EF", color: "#047857", border: "#CBEFDB" },
  rejected:          { label: "Rechazado",      bg: "#FEF2F2", color: "#B91C1C", border: "#FBDADA" },
  changes_requested: { label: "Observaciones",  bg: "#FFF7ED", color: "#92400E", border: "#FCEBD2" },
}

export default async function SeguimientoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: appId } = await params

  const ctx = await getStaffContext()
  if (!ctx) return notFound()

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: app } = await admin
    .from("applications")
    .select("id, status, company_id, companies(legal_name, tax_id, assigned_agent_id), products(name, code)")
    .eq("id", appId)
    .single()
  if (!app) return notFound()

  const company = (app.companies as unknown) as {
    legal_name: string
    tax_id: string | null
    assigned_agent_id: string | null
  } | null
  const product = (app.products as unknown) as { name: string } | null

  // El agente solo ve los clientes que él dio de alta
  if (ctx.isAgent && company?.assigned_agent_id !== ctx.userId) return notFound()

  const { data: docs } = await admin
    .from("documents")
    .select("id, status, file_name, storage_path, reviewer_notes, uploaded_at, document_templates(name, is_required, sort_order)")
    .eq("application_id", appId)

  const docRows = ((docs ?? []) as unknown as {
    id: string
    status: string
    file_name: string | null
    storage_path: string | null
    reviewer_notes: string | null
    uploaded_at: string | null
    document_templates: { name: string; is_required: boolean; sort_order: number } | null
  }[]).sort(
    (a, b) =>
      (a.document_templates?.sort_order ?? 999) - (b.document_templates?.sort_order ?? 999)
  )

  const required = docRows.filter((d) => d.document_templates?.is_required)
  const satisfied = required.filter((d) =>
    ["approved", "pending_review"].includes(d.status)
  ).length
  const pct = required.length ? Math.round((satisfied / required.length) * 100) : 0
  const conObservaciones = docRows.filter((d) =>
    ["changes_requested", "rejected"].includes(d.status)
  )

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100%" }}>
      <header style={{ padding: "24px 32px 16px" }}>
        <Link
          href="/admin/clients"
          className="hover:text-[#0F1B2A] transition-colors"
          style={{ fontSize: 13, color: "var(--admin-text-muted, #5A6B7B)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 10 }}
        >
          ← Mis clientes
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
          <h1 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 800, letterSpacing: "-.02em", color: "var(--admin-text, #0F1B2A)" }}>
            {company?.legal_name ?? "Empresa"}
          </h1>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 999, background: "#EDFBEA", color: "#0B7A44", border: "1px solid #CBEFDB" }}>
            {pct}% · {satisfied}/{required.length}
          </span>
          <span style={{ fontSize: 12, fontWeight: 600, padding: "3px 10px", borderRadius: 999, background: "#EFF4FF", color: "#1D4ED8", border: "1px solid #DBE5FF" }}>
            {STATUS_LABELS[app.status] ?? app.status}
          </span>
        </div>
        <p style={{ margin: 0, fontSize: 13, color: "var(--admin-text-muted, #5A6B7B)" }}>
          {company?.tax_id && (
            <span style={{ fontFamily: "var(--font-mono)", color: "var(--admin-text, #0F1B2A)", fontWeight: 500 }}>{company.tax_id}</span>
          )}
          {product?.name && <span> · {product.name}</span>}
          <span> · Vista de seguimiento (solo lectura)</span>
        </p>
      </header>

      <div style={{ padding: "0 32px 40px", maxWidth: 900 }} className="space-y-5">
        {/* Observaciones de compliance */}
        {conObservaciones.length > 0 && (
          <div style={{ background: "#FFFBF5", border: "1px solid #FCEBD2", borderRadius: 16, padding: "16px 20px" }}>
            <h2 style={{ margin: "0 0 10px", fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 700, color: "#92400E" }}>
              Cambios que pidió compliance ({conObservaciones.length})
            </h2>
            <div className="space-y-2">
              {conObservaciones.map((d) => (
                <div key={d.id} style={{ background: "#fff", border: "1px solid #FCEBD2", borderRadius: 10, padding: "10px 14px" }}>
                  <p style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 700, color: "var(--admin-text, #0F1B2A)" }}>
                    {d.document_templates?.name ?? "Documento"}
                  </p>
                  {d.reviewer_notes && (
                    <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: "#5A6B7B", whiteSpace: "pre-wrap" }}>
                      {d.reviewer_notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
            <p style={{ margin: "10px 0 0", fontSize: 12, color: "#92400E" }}>
              Tu cliente ya recibió estas observaciones por correo. Puedes darle
              seguimiento para que las atienda.
            </p>
          </div>
        )}

        {/* Checklist */}
        <div style={{ background: "var(--admin-surface, #fff)", border: "1px solid var(--admin-border, #E7ECF1)", borderRadius: 16, boxShadow: "0 1px 2px rgba(16,30,45,.05)", overflow: "hidden" }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--admin-border, #E7ECF1)", background: "var(--admin-surface-2, #FBFCFD)" }}>
            <h2 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 600, color: "var(--admin-text, #0F1B2A)" }}>
              Documentos del expediente
            </h2>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <tbody>
                {docRows.map((d) => {
                  const st = DOC_STATUS[d.status] ?? DOC_STATUS.pending_upload
                  return (
                    <tr key={d.id} style={{ borderBottom: "1px solid var(--admin-border, #E7ECF1)" }}>
                      <td style={{ padding: "12px 20px", verticalAlign: "middle" }}>
                        <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--admin-text, #0F1B2A)" }}>
                          {d.document_templates?.name ?? "Documento"}
                          {!d.document_templates?.is_required && (
                            <span style={{ fontSize: 11, fontWeight: 500, color: "var(--admin-text-subtle, #8A99A8)" }}> · opcional</span>
                          )}
                        </p>
                        {d.file_name && (
                          <p style={{ margin: 0, fontSize: 12, color: "var(--admin-text-subtle, #8A99A8)" }}>
                            {d.file_name}
                            {d.uploaded_at && (
                              <> · {format(new Date(d.uploaded_at), "d MMM yyyy", { locale: es })}</>
                            )}
                          </p>
                        )}
                      </td>
                      <td style={{ padding: "12px 14px", verticalAlign: "middle", whiteSpace: "nowrap" }}>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 999, background: st.bg, color: st.color, border: `1px solid ${st.border}` }}>
                          {st.label}
                        </span>
                      </td>
                      <td style={{ padding: "12px 20px", verticalAlign: "middle", textAlign: "right", whiteSpace: "nowrap" }}>
                        {d.storage_path && (
                          <a
                            href={`/api/documents/${d.id}/view`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline"
                            style={{ fontSize: 12, fontWeight: 700, color: "#0B7A44", textDecoration: "none" }}
                          >
                            Ver
                          </a>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
