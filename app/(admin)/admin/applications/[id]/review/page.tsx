import { notFound } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { ReviewDocumentRow } from "@/components/documents/review-document-row"
import { StatusChangeForm } from "@/components/admin/status-change-form"
import { format } from "date-fns"
import { es } from "date-fns/locale"

const STATUS_LABELS: Record<string, string> = {
  draft: "Borrador",
  documents_pending: "Pendiente de documentos",
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

const STATUS_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  draft:                     { bg: "#F1F5F9", color: "#334155", border: "#E2E8F0" },
  documents_pending:         { bg: "#FFF7ED", color: "#92400E", border: "#FCEBD2" },
  in_compliance_review:      { bg: "#EFF4FF", color: "#1D4ED8", border: "#DBE5FF" },
  changes_requested:         { bg: "#FFF7ED", color: "#92400E", border: "#FCEBD2" },
  approved_compliance:       { bg: "#E7F8EF", color: "#047857", border: "#CBEFDB" },
  in_provider_review:        { bg: "#EFF4FF", color: "#1D4ED8", border: "#DBE5FF" },
  provider_changes_requested:{ bg: "#FFF7ED", color: "#92400E", border: "#FCEBD2" },
  approved_provider:         { bg: "#E7F8EF", color: "#047857", border: "#CBEFDB" },
  contracts_pending:         { bg: "#FFF7ED", color: "#92400E", border: "#FCEBD2" },
  contracts_signed:          { bg: "#E7F8EF", color: "#047857", border: "#CBEFDB" },
  activation_pending:        { bg: "#FFF7ED", color: "#92400E", border: "#FCEBD2" },
  activated:                 { bg: "#E7F8EF", color: "#047857", border: "#CBEFDB" },
  rejected:                  { bg: "#FEF2F2", color: "#B91C1C", border: "#FBDADA" },
  archived:                  { bg: "#F1F5F9", color: "#334155", border: "#E2E8F0" },
}

const VALID_TRANSITIONS: Record<string, string[]> = {
  documents_pending: ["in_compliance_review"],
  in_compliance_review: ["changes_requested", "approved_compliance", "rejected"],
  changes_requested: ["in_compliance_review"],
  approved_compliance: ["in_provider_review"],
  in_provider_review: ["provider_changes_requested", "approved_provider", "rejected"],
  provider_changes_requested: ["in_provider_review"],
  approved_provider: ["contracts_pending"],
  contracts_pending: ["contracts_signed"],
  contracts_signed: ["activation_pending"],
  activation_pending: ["activated"],
}

const CATEGORY_CODES: { title: string; codes: string[] }[] = [
  { title: "Formularios digitales", codes: ["complementary_info", "beneficial_owner"] },
  { title: "Documentos de la empresa", codes: ["incorporation_act", "incorporation_act_update", "efirma", "cif", "company_address_proof", "inscription_rpc", "pf_address_proof"] },
  { title: "Identidades y poderes", codes: ["power_of_attorney", "legal_rep_id", "legal_rep_selfie", "shareholder_id", "administrator_id", "pf_official_id"] },
  { title: "Documentos fiscales", codes: ["tax_situation_certificate", "tax_declaration", "sat_compliance", "pf_tax_situation"] },
  { title: "Estado de cuenta", codes: ["bank_statement", "pf_bank_statement"] },
  { title: "Adicionales", codes: ["business_photos", "website_url", "pf_business_photos", "pf_website_url"] },
]

const CONTRACT_DEFS = [
  { kind: "payefy_service",           label: "Contrato prestación de servicios · Payefy", hint: "DocuSign" },
  { kind: "transfer_increase_letter", label: "Carta de aumento · Transfer",                hint: "" },
  { kind: "transfer_contract",        label: "Contrato Transfer",                          hint: "weetrust" },
]

const BITACORA_LABELS: Record<string, string> = {
  application_submitted:      "Expediente enviado a revisión",
  status_changed:             "Estado actualizado",
  document_approved:          "Documento aprobado",
  document_changes_requested: "Cambios solicitados en documento",
  document_rejected:          "Documento rechazado",
  application_activated:      "Solicitud activada",
}

// ── Status icon ──────────────────────────────────────────────────────────────
function DocIcon({ status, isChecked, isCheckType }: { status: string; isChecked?: boolean; isCheckType?: boolean }) {
  if (isCheckType) {
    return isChecked ? (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <rect x="1" y="1" width="16" height="16" rx="4" fill="#E7F8EF" stroke="#00B36A" strokeWidth="1.5"/>
        <path d="M5 9l3 3 5-5" stroke="#00B36A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ) : (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <rect x="1" y="1" width="16" height="16" rx="4" fill="#F8FAFC" stroke="#CBD5E1" strokeWidth="1.5"/>
      </svg>
    )
  }
  if (status === "approved") return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <circle cx="9" cy="9" r="8" fill="#E7F8EF" stroke="#00B36A" strokeWidth="1.5"/>
      <path d="M5.5 9l2.5 2.5 4.5-4.5" stroke="#00B36A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
  if (status === "pending_review") return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <circle cx="9" cy="9" r="8" fill="#FFF7ED" stroke="#F59E0B" strokeWidth="1.5"/>
      <circle cx="9" cy="9" r="2.5" fill="#F59E0B"/>
    </svg>
  )
  if (status === "changes_requested") return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <circle cx="9" cy="9" r="8" fill="#FFF7ED" stroke="#F59E0B" strokeWidth="1.5"/>
      <path d="M9 5.5v4M9 12.5h.01" stroke="#F59E0B" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  )
  if (status === "rejected") return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <circle cx="9" cy="9" r="8" fill="#FEF2F2" stroke="#EF4444" strokeWidth="1.5"/>
      <path d="M6.5 6.5l5 5M11.5 6.5l-5 5" stroke="#EF4444" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  )
  // pending_upload
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <circle cx="9" cy="9" r="8" fill="#F8FAFC" stroke="#CBD5E1" strokeWidth="1.5"/>
    </svg>
  )
}

function contractIcon(status: string | null) {
  if (status === "signed") return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="0.5" y="0.5" width="15" height="15" rx="3.5" fill="#E7F8EF" stroke="#00B36A" strokeWidth="1"/>
      <path d="M4 8l2.5 2.5 5.5-5" stroke="#00B36A" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="0.5" y="0.5" width="15" height="15" rx="3.5" fill="#F8FAFC" stroke="#CBD5E1" strokeWidth="1"/>
    </svg>
  )
}

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: appId } = await params
  const supabase = await createClient()
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Parallel data fetching
  const [appResult, docsResult, contractsResult, logsResult] = await Promise.all([
    supabase
      .from("applications")
      .select("id, status, rejection_reason, company_id, companies(legal_name, tax_id, contact_email, person_type), products(name, code)")
      .eq("id", appId)
      .single(),
    supabase
      .from("documents")
      .select(`id, status, storage_path, reviewer_notes, template_id, uploaded_at, is_checked,
               document_templates(id, code, name, is_form, is_required, sort_order, field_type)`)
      .eq("application_id", appId),
    admin
      .from("application_contracts")
      .select("kind, status")
      .eq("application_id", appId),
    admin
      .from("audit_logs")
      .select("id, action, created_at, changes, metadata, profiles(full_name)")
      .eq("entity_id", appId)
      .not("action", "like", "cron_%")
      .order("created_at", { ascending: false })
      .limit(6),
  ])

  if (!appResult.data) return notFound()

  const app = appResult.data
  const company = (app.companies as unknown) as { legal_name: string; tax_id: string; contact_email?: string; person_type?: string } | null
  const product = (app.products as unknown) as { name: string; code: string } | null

  const docs = (docsResult.data ?? []).map((d) => ({
    ...d,
    uploaded_at: (d as unknown as { uploaded_at?: string | null }).uploaded_at ?? null,
    is_checked: (d as unknown as { is_checked?: boolean }).is_checked ?? false,
    template: (d.document_templates as unknown) as {
      id: string; code: string; name: string; is_form: boolean;
      is_required: boolean; sort_order: number; field_type?: string
    } | null,
  }))

  const contractMap = new Map<string, string>()
  for (const c of contractsResult.data ?? []) contractMap.set(c.kind, c.status)

  const logs = (logsResult.data ?? []).map((l) => ({
    ...l,
    actor: (l.profiles as unknown) as { full_name: string } | null,
  }))

  // Stats
  const uploadDocs = docs.filter((d) => d.template && !d.template.is_form && d.template.field_type !== "check_or_upload")
  const checkDocs  = docs.filter((d) => d.template && d.template.field_type === "check_or_upload")
  const requiredDocs = docs.filter((d) => d.template?.is_required)
  const satisfiedDocs = requiredDocs.filter((d) => d.status === "approved" || d.is_checked)
  const pct = requiredDocs.length > 0 ? Math.round((satisfiedDocs.length / requiredDocs.length) * 100) : 0

  const personTypeLabel = company?.person_type === "fisica" ? "Persona Física" : company?.person_type === "moral" ? "Persona Moral" : null

  const nextStatuses = VALID_TRANSITIONS[app.status] ?? []
  const statusStyle = STATUS_COLORS[app.status] ?? STATUS_COLORS.draft

  // For detailed review sections
  const docByCode = new Map(docs.filter((d) => d.template).map((d) => [d.template!.code, d]))

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100%" }}>
      {/* ── Topbar ── */}
      <header style={{ padding: "20px 32px 16px", borderBottom: "1px solid var(--admin-border, #E7ECF1)", background: "var(--admin-surface, #fff)" }}>
        <Link
          href="/admin/clients"
          style={{ fontSize: 13, color: "var(--admin-text-muted, #5A6B7B)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 10 }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--admin-text, #0F1B2A)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--admin-text-muted, #5A6B7B)")}
        >
          ← Clientes
        </Link>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
              <h1 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 800, letterSpacing: "-.02em", color: "var(--admin-text, #0F1B2A)" }}>
                {company?.legal_name ?? "Empresa"}
              </h1>
              {/* Completion badge */}
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 999,
                background: pct >= 80 ? "#E7F8EF" : pct >= 50 ? "#FFF7ED" : "#FEF2F2",
                color: pct >= 80 ? "#047857" : pct >= 50 ? "#92400E" : "#B91C1C",
                border: `1px solid ${pct >= 80 ? "#CBEFDB" : pct >= 50 ? "#FCEBD2" : "#FBDADA"}` }}>
                {pct}% completo
              </span>
              {/* App status */}
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, padding: "3px 10px", borderRadius: 999,
                background: statusStyle.bg, color: statusStyle.color, border: `1px solid ${statusStyle.border}` }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: statusStyle.color, flexShrink: 0 }} />
                {STATUS_LABELS[app.status] ?? app.status}
              </span>
            </div>
            <p style={{ margin: 0, fontSize: 13, color: "var(--admin-text-muted, #5A6B7B)" }}>
              {company?.tax_id && <span style={{ fontFamily: "var(--font-mono)", color: "var(--admin-text, #0F1B2A)", fontWeight: 500 }}>{company.tax_id}</span>}
              {personTypeLabel && <span> · {personTypeLabel}</span>}
              {product?.name && <span> · {product.name}</span>}
            </p>
          </div>
          {/* Action buttons */}
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
            <Link
              href={`/admin/applications/${appId}/audit`}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", fontSize: 13, fontWeight: 600, borderRadius: 9,
                background: "transparent", border: "1px solid var(--admin-border, #E7ECF1)", color: "var(--admin-text-muted, #5A6B7B)", textDecoration: "none", transition: "all .14s" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--admin-bg, #F6F8FA)"; (e.currentTarget as HTMLElement).style.color = "var(--admin-text, #0F1B2A)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "var(--admin-text-muted, #5A6B7B)"; }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
              </svg>
              Auditoría
            </Link>
          </div>
        </div>
      </header>

      {/* ── Content ── */}
      <div style={{ padding: "20px 32px 40px", flex: 1 }}>

        {/* ── OVERVIEW CARD ── */}
        <div style={{ background: "var(--admin-surface, #fff)", border: "1px solid var(--admin-border, #E7ECF1)", borderRadius: 16, boxShadow: "0 1px 3px rgba(16,30,45,.06)", overflow: "hidden", marginBottom: 20 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1px 1fr", minHeight: 200 }}>

            {/* Left: upload documents checklist */}
            <div style={{ padding: "20px 24px" }}>
              <p style={{ margin: "0 0 14px", fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--admin-text-subtle, #8A99A8)" }}>
                Documentos · {uploadDocs.length}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {uploadDocs.length === 0 ? (
                  <p style={{ fontSize: 13, color: "var(--admin-text-muted, #5A6B7B)", margin: 0 }}>Sin documentos de tipo archivo.</p>
                ) : uploadDocs.sort((a, b) => (a.template?.sort_order ?? 99) - (b.template?.sort_order ?? 99)).map((doc) => (
                  <div key={doc.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: "1px solid var(--admin-border, #E7ECF1)" }}>
                    <DocIcon status={doc.status} />
                    <span style={{ fontSize: 13, color: doc.status === "approved" ? "var(--admin-text, #0F1B2A)" : doc.status === "pending_upload" ? "var(--admin-text-subtle, #8A99A8)" : "var(--admin-text, #0F1B2A)", flex: 1, lineHeight: 1.3 }}>
                      {doc.template?.name ?? "Documento"}
                      {doc.template?.field_type === "check_or_upload" && <span style={{ fontSize: 11, color: "var(--admin-text-subtle, #8A99A8)", marginLeft: 5 }}>· casilla</span>}
                    </span>
                    {doc.status === "changes_requested" && (
                      <span style={{ fontSize: 11, color: "#92400E", background: "#FFF7ED", border: "1px solid #FCEBD2", borderRadius: 4, padding: "1px 6px" }}>cambios</span>
                    )}
                    {doc.status === "pending_review" && (
                      <span style={{ fontSize: 11, color: "#1D4ED8", background: "#EFF4FF", border: "1px solid #DBE5FF", borderRadius: 4, padding: "1px 6px" }}>revisión</span>
                    )}
                    {doc.storage_path && (
                      <a href={`/api/documents/${doc.id}/view`} target="_blank" rel="noopener noreferrer"
                        style={{ fontSize: 11, color: "var(--admin-brand, #00B36A)", textDecoration: "none", whiteSpace: "nowrap" }}>
                        ver
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Divider */}
            <div style={{ background: "var(--admin-border, #E7ECF1)", alignSelf: "stretch" }} />

            {/* Right: check items + contracts + bitácora */}
            <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 20 }}>

              {/* Check-type items */}
              {checkDocs.length > 0 && (
                <div>
                  <p style={{ margin: "0 0 10px", fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--admin-text-subtle, #8A99A8)" }}>
                    Datos sin documento
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                    {checkDocs.sort((a, b) => (a.template?.sort_order ?? 99) - (b.template?.sort_order ?? 99)).map((doc) => (
                      <div key={doc.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderBottom: "1px solid var(--admin-border, #E7ECF1)" }}>
                        <DocIcon status={doc.status} isChecked={doc.is_checked} isCheckType />
                        <span style={{ fontSize: 13, color: "var(--admin-text, #0F1B2A)", flex: 1 }}>
                          {doc.template?.name ?? "Campo"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Contracts */}
              <div>
                <p style={{ margin: "0 0 10px", fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--admin-text-subtle, #8A99A8)" }}>
                  Contratos y firmas
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                  {CONTRACT_DEFS.map((def) => {
                    const s = contractMap.get(def.kind) ?? null
                    const isSigned = s === "signed"
                    return (
                      <div key={def.kind} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderBottom: "1px solid var(--admin-border, #E7ECF1)" }}>
                        {contractIcon(s)}
                        <span style={{ fontSize: 13, color: isSigned ? "var(--admin-text, #0F1B2A)" : "var(--admin-text-muted, #5A6B7B)", flex: 1 }}>
                          {def.label}
                          {def.hint && <span style={{ fontSize: 11, color: "var(--admin-text-subtle, #8A99A8)", marginLeft: 5 }}>({def.hint})</span>}
                        </span>
                        {s === "sent" && <span style={{ fontSize: 11, color: "#92400E" }}>enviado</span>}
                        {s === "signed" && <span style={{ fontSize: 11, color: "#047857", fontWeight: 600 }}>firmado</span>}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Bitácora */}
              {logs.length > 0 && (
                <div>
                  <p style={{ margin: "0 0 10px", fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--admin-text-subtle, #8A99A8)" }}>
                    Bitácora
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {logs.map((log) => {
                      const dateStr = format(new Date(log.created_at), "d MMM", { locale: es })
                      const label = BITACORA_LABELS[log.action] ?? log.action.replace(/_/g, " ")
                      return (
                        <p key={log.id} style={{ margin: 0, fontSize: 13, color: "var(--admin-text-muted, #5A6B7B)", lineHeight: 1.5 }}>
                          <span style={{ fontWeight: 600, color: "var(--admin-text, #0F1B2A)", marginRight: 4 }}>{dateStr}</span>
                          — {label}
                          {log.actor?.full_name && <span style={{ color: "var(--admin-text-subtle, #8A99A8)" }}> ({log.actor.full_name})</span>}
                        </p>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Status change ── */}
        {nextStatuses.length > 0 && (
          <div style={{ background: "var(--admin-surface, #fff)", border: "1px solid var(--admin-border, #E7ECF1)", borderRadius: 12, padding: "16px 20px", marginBottom: 20, boxShadow: "0 1px 2px rgba(16,30,45,.04)" }}>
            <p style={{ margin: "0 0 12px", fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--admin-text-subtle, #8A99A8)" }}>
              Cambiar estado de la solicitud
            </p>
            <StatusChangeForm
              applicationId={appId}
              currentStatus={app.status}
              nextStatuses={nextStatuses}
            />
          </div>
        )}

        {/* ── Detailed document review ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {CATEGORY_CODES.map(({ title, codes }) => {
            const catDocs = codes.map((code) => docByCode.get(code)).filter(Boolean) as typeof docs
            if (catDocs.length === 0) return null
            return (
              <section key={title}>
                <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--admin-text-subtle, #8A99A8)" }}>
                  {title}
                </p>
                <div style={{ background: "var(--admin-surface, #fff)", border: "1px solid var(--admin-border, #E7ECF1)", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 2px rgba(16,30,45,.04)" }}>
                  <div style={{ padding: "0 20px" }}>
                    {catDocs.map((doc) => (
                      <ReviewDocumentRow
                        key={doc.id}
                        documentId={doc.id}
                        applicationId={appId}
                        templateName={doc.template?.name ?? "Documento"}
                        isRequired={doc.template?.is_required ?? false}
                        currentStatus={doc.status as "pending_upload" | "pending_review" | "approved" | "rejected" | "changes_requested"}
                        storageAvailable={!!doc.storage_path}
                        reviewerNotes={doc.reviewer_notes}
                        uploadedAt={doc.uploaded_at}
                      />
                    ))}
                  </div>
                </div>
              </section>
            )
          })}
        </div>
      </div>
    </div>
  )
}
