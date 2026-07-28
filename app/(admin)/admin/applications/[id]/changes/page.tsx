import { notFound } from "next/navigation"
import Link from "next/link"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { format, formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"

export const metadata = { title: "Cambios solicitados | Payefy Admin" }

const ACTION_LABELS: Record<string, string> = {
  document_changes_requested: "Cambios solicitados",
  document_rejected: "Documento rechazado",
}

const DOC_STATUS: Record<string, { label: string; bg: string; color: string; border: string }> = {
  changes_requested: { label: "Pendiente de corregir", bg: "#FFF7ED", color: "#92400E", border: "#FCEBD2" },
  rejected:          { label: "Rechazado",             bg: "#FEF2F2", color: "#B91C1C", border: "#FBDADA" },
  pending_review:    { label: "Corregido · en revisión", bg: "#EFF4FF", color: "#1D4ED8", border: "#DBE5FF" },
  approved:          { label: "Resuelto · aprobado",    bg: "#E7F8EF", color: "#047857", border: "#CBEFDB" },
  pending_upload:    { label: "Esperando al cliente",   bg: "#F1F5F9", color: "#334155", border: "#E2E8F0" },
}

export default async function ChangesPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: appId } = await params

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: app } = await admin
    .from("applications")
    .select("id, companies(legal_name), products(name)")
    .eq("id", appId)
    .single()
  if (!app) return notFound()

  // Los eventos de documento se registran con entity_id = documento y
  // metadata.application_id = solicitud, por eso se filtra por metadata.
  const { data: logs } = await admin
    .from("audit_logs")
    .select("id, action, created_at, entity_id, metadata, profiles(full_name, email)")
    .in("action", ["document_changes_requested", "document_rejected"])
    .filter("metadata->>application_id", "eq", appId)
    .order("created_at", { ascending: false })

  const rows = (logs ?? []) as unknown as {
    id: string
    action: string
    created_at: string
    entity_id: string
    metadata: { notes?: string } | null
    profiles: { full_name: string | null; email: string | null } | null
  }[]

  // Estado actual de cada documento observado
  const docIds = Array.from(new Set(rows.map((r) => r.entity_id)))
  const { data: docs } = docIds.length
    ? await admin
        .from("documents")
        .select("id, status, document_templates(name)")
        .in("id", docIds)
    : { data: [] }

  const docInfo = new Map<string, { name: string; status: string }>()
  for (const d of (docs ?? []) as unknown as {
    id: string
    status: string
    document_templates: { name: string } | null
  }[]) {
    docInfo.set(d.id, {
      name: d.document_templates?.name ?? "Documento",
      status: d.status,
    })
  }

  const company = (app.companies as unknown) as { legal_name: string } | null
  const product = (app.products as unknown) as { name: string } | null

  const pendientes = rows.filter((r) => {
    const st = docInfo.get(r.entity_id)?.status
    return st === "changes_requested" || st === "rejected"
  }).length

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100%" }}>
      <header style={{ padding: "24px 32px 16px" }}>
        <Link
          href={`/admin/applications/${appId}/review`}
          className="hover:text-[#0F1B2A] transition-colors"
          style={{ fontSize: 13, color: "var(--admin-text-muted, #5A6B7B)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 8 }}
        >
          ← Volver a revisión
        </Link>
        <h1 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 800, letterSpacing: "-.02em", lineHeight: 1.1, color: "var(--admin-text, #0F1B2A)" }}>
          Cambios solicitados
        </h1>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--admin-text-muted, #5A6B7B)" }}>
          {company?.legal_name ?? "Empresa"}
          {product?.name ? ` · ${product.name}` : ""}
          {rows.length > 0 && (
            <>
              {" · "}
              <b style={{ color: "var(--admin-text, #0F1B2A)", fontWeight: 600 }}>{rows.length}</b>{" "}
              {rows.length === 1 ? "observación" : "observaciones"}
              {pendientes > 0 && (
                <span style={{ color: "#92400E", fontWeight: 600 }}>
                  {" "}· {pendientes} sin corregir
                </span>
              )}
            </>
          )}
        </p>
      </header>

      <div style={{ padding: "0 32px 40px", maxWidth: 860 }}>
        {rows.length === 0 ? (
          <div style={{ background: "var(--admin-surface, #fff)", border: "1px solid var(--admin-border, #E7ECF1)", borderRadius: 16, padding: 32, textAlign: "center" }}>
            <p style={{ margin: 0, fontSize: 14, color: "var(--admin-text-muted, #5A6B7B)" }}>
              No se han solicitado cambios en este expediente.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map((log) => {
              const info = docInfo.get(log.entity_id)
              const st = DOC_STATUS[info?.status ?? ""] ?? DOC_STATUS.pending_upload
              const isRejection = log.action === "document_rejected"
              const stripe = isRejection ? "#B91C1C" : "#c9772f"
              const dateStr = format(new Date(log.created_at), "d 'de' MMMM yyyy, HH:mm", { locale: es })
              const timeAgo = formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: es })

              return (
                <div
                  key={log.id}
                  style={{
                    position: "relative",
                    background: "var(--admin-surface, #fff)",
                    border: "1px solid var(--admin-border, #E7ECF1)",
                    borderRadius: 14,
                    padding: "14px 18px 14px 20px",
                    boxShadow: "0 1px 2px rgba(16,30,45,.05)",
                    overflow: "hidden",
                  }}
                >
                  <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4, background: stripe }} />

                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: "var(--admin-text, #0F1B2A)" }}>
                        {info?.name ?? "Documento"}
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: stripe, background: isRejection ? "#FEF2F2" : "#FDF1E6", borderRadius: 999, padding: "2px 8px" }}>
                        {ACTION_LABELS[log.action] ?? log.action}
                      </span>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, background: st.bg, color: st.color, border: `1px solid ${st.border}`, borderRadius: 999, padding: "3px 10px", whiteSpace: "nowrap" }}>
                      {st.label}
                    </span>
                  </div>

                  {log.metadata?.notes && (
                    <p
                      style={{
                        margin: "0 0 10px",
                        fontSize: 13,
                        lineHeight: 1.55,
                        color: "var(--admin-text, #0F1B2A)",
                        background: "#FBFCFD",
                        border: "1px solid var(--admin-border, #E7ECF1)",
                        borderRadius: 10,
                        padding: "10px 12px",
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {log.metadata.notes}
                    </p>
                  )}

                  <p style={{ margin: 0, fontSize: 12, color: "var(--admin-text-subtle, #8A99A8)" }}>
                    {log.profiles?.full_name ?? log.profiles?.email ?? "Sistema"} · {dateStr} ({timeAgo})
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
