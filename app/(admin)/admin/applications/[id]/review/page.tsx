import { notFound } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { ReviewDocumentRow } from "@/components/documents/review-document-row"
import { AdminFullStatusSelector } from "@/components/admin/admin-full-status-selector"
import { AdminCheckRow } from "@/components/admin/admin-check-row"
import { AdminValidationRow } from "@/components/admin/admin-validation-row"
import { CompletionOverrideButton } from "@/components/admin/completion-override-button"
import { ExportExpedienteButton } from "@/components/admin/export-expediente-button"
import { ContractManager } from "@/components/admin/contract-manager"
import { SendToTransferButton } from "@/components/admin/send-to-transfer-button"
import { AdditionalUploadBox } from "@/components/documents/additional-upload-box"
import { format } from "date-fns"
import { es } from "date-fns/locale"

// Template codes that belong to the Anexos / Contratos section (not KYC).
// Signature docs (terms_and_conditions, terms_opm) live here — the client downloads,
// signs, and re-uploads them, so they need full approve/reject UI, not a form renderer.
const ANNEX_SECTION_CODES = new Set([
  "annex", "bank_statement", "inscription_rpc",
  "terms_opm", "terms_and_conditions",
])

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

const STATUS_LABELS: Record<string, string> = {
  draft: "Borrador",
  documents_pending: "Documentos pendientes",
  in_compliance_review: "En revisión de compliance",
  changes_requested: "Cambios solicitados",
  approved_compliance: "Aprobado por compliance",
  in_provider_review: "En revisión del proveedor",
  provider_changes_requested: "Cambios solicitados (proveedor)",
  approved_provider: "Aprobado por proveedor",
  contracts_pending: "Contratos por firmar",
  contracts_signed: "Contratos firmados",
  activation_pending: "Por activar",
  activated: "Activado ✓",
  rejected: "Rechazado",
  archived: "Archivado",
}

const CATEGORY_CODES: { title: string; codes: string[] }[] = [
  { title: "Formularios digitales", codes: ["complementary_info", "beneficial_owner", "terms_opm"] },
  { title: "Documentos de la empresa", codes: ["incorporation_act", "incorporation_act_update", "organigrama", "efirma", "cif", "company_address_proof", "inscription_rpc", "pf_address_proof"] },
  { title: "Identidades y poderes", codes: ["power_of_attorney", "legal_rep_id", "legal_rep_selfie", "shareholder_id", "administrator_id", "pf_official_id"] },
  { title: "Documentos fiscales", codes: ["tax_situation_certificate", "tax_declaration", "sat_compliance", "pf_tax_situation"] },
  { title: "Estado de cuenta", codes: ["bank_statement", "pf_bank_statement"] },
  { title: "Datos solicitados", codes: ["shareholders_curp", "shareholders_rfc", "legal_reps_curp", "legal_reps_rfc", "pf_curp", "pf_rfc"] },
  { title: "Adicionales", codes: ["business_photos", "website_url", "pf_business_photos", "pf_website_url"] },
]

const BITACORA_LABELS: Record<string, string> = {
  application_submitted:        "Expediente enviado a revisión",
  status_changed:               "Estado actualizado",
  document_approved:            "Documento aprobado",
  document_changes_requested:   "Cambios solicitados en documento",
  document_rejected:            "Documento rechazado",
  document_checked:             "Casilla marcada/desmarcada",
  document_validated:           "Dato validado por admin",
  completion_override_enabled:  "Avance forzado a 100%",
  completion_override_disabled: "Forzado 100% desactivado",
  application_activated:        "Solicitud activada",
}

// ── Helpers ──────────────────────────────────────────────────────────────────

type DocStatus = "pending_upload" | "pending_review" | "approved" | "rejected" | "changes_requested"

function worstStatus(statuses: string[]): string {
  if (statuses.includes("rejected")) return "rejected"
  if (statuses.includes("pending_upload")) return "pending_upload"
  if (statuses.includes("changes_requested")) return "changes_requested"
  if (statuses.includes("pending_review")) return "pending_review"
  return "approved"
}

function DocIcon({ status, isChecked, isCheckType }: { status: string; isChecked?: boolean; isCheckType?: boolean }) {
  if (isCheckType) {
    return isChecked ? (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <rect x="1" y="1" width="16" height="16" rx="4" fill="#EDFBEA" stroke="#0B7A44" strokeWidth="1.5"/>
        <path d="M5 9l3 3 5-5" stroke="#0B7A44" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ) : (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <rect x="1" y="1" width="16" height="16" rx="4" fill="#F8FAFC" stroke="#CBD5E1" strokeWidth="1.5"/>
      </svg>
    )
  }
  if (status === "approved") return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <circle cx="9" cy="9" r="8" fill="#EDFBEA" stroke="#0B7A44" strokeWidth="1.5"/>
      <path d="M5.5 9l2.5 2.5 4.5-4.5" stroke="#0B7A44" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
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
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <circle cx="9" cy="9" r="8" fill="#F8FAFC" stroke="#CBD5E1" strokeWidth="1.5"/>
    </svg>
  )
}


// ── Page ─────────────────────────────────────────────────────────────────────

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

  const [appResult, docsResult, contractsResult, logsResult] = await Promise.all([
    supabase
      .from("applications")
      .select("id, status, rejection_reason, completion_override, transfer_status, company_id, companies(legal_name, tax_id, contact_email, person_type), products(name, code)")
      .eq("id", appId)
      .single(),
    supabase
      .from("documents")
      .select(`id, status, storage_path, file_name, reviewer_notes, client_notes, template_id, uploaded_at, is_checked, title,
               document_templates(id, code, name, is_form, is_required, sort_order, field_type)`)
      .eq("application_id", appId),
    admin
      .from("application_contracts")
      .select("kind, status, signed_doc_path")
      .eq("application_id", appId),
    admin
      .from("audit_logs")
      .select("id, action, created_at, changes, metadata, profiles(full_name)")
      .eq("entity_id", appId)
      .not("action", "like", "cron_%")
      .order("created_at", { ascending: false })
      .limit(8),
  ])

  if (!appResult.data) return notFound()

  const app = appResult.data
  const company = (app.companies as unknown) as { legal_name: string; tax_id: string; contact_email?: string; person_type?: string } | null
  const product = (app.products as unknown) as { name: string; code: string } | null
  const completionOverride = (app as unknown as { completion_override?: boolean }).completion_override ?? false
  const transferStatus = (app as unknown as { transfer_status?: string | null }).transfer_status ?? null

  type DocTemplate = {
    id: string; code: string; name: string; is_form: boolean;
    is_required: boolean; sort_order: number; field_type?: string
  }
  type Doc = {
    id: string; status: string; storage_path: string | null; file_name: string | null;
    reviewer_notes: string | null; client_notes: string | null; template_id: string | null; uploaded_at: string | null;
    is_checked: boolean; title: string | null; template: DocTemplate | null
  }

  const rawDocs = (docsResult.data ?? []) as unknown as Array<Record<string, unknown>>
  const docs: Doc[] = rawDocs.map((d) => ({
    id: d.id as string,
    status: d.status as string,
    storage_path: (d.storage_path as string | null) ?? null,
    file_name: (d.file_name as string | null) ?? null,
    reviewer_notes: (d.reviewer_notes as string | null) ?? null,
    client_notes: (d.client_notes as string | null) ?? null,
    template_id: (d.template_id as string | null) ?? null,
    uploaded_at: (d.uploaded_at as string | null) ?? null,
    is_checked: (d.is_checked as boolean) ?? false,
    title: (d.title as string | null) ?? null,
    template: (d.document_templates as DocTemplate | null) ?? null,
  }))

  // ── Group docs by template code; extra docs (template_id IS NULL) go separately ──
  const docsByCode = new Map<string, Doc[]>()
  const extraDocs: Doc[] = []
  for (const d of docs) {
    if (!d.template) {
      extraDocs.push(d)
      continue
    }
    const arr = docsByCode.get(d.template.code) ?? []
    arr.push(d)
    docsByCode.set(d.template.code, arr)
  }

  // ── Completion % (per template, with override) ───────────────────────────
  const requiredTemplateCodes = new Set<string>()
  const satisfiedTemplateCodes = new Set<string>()
  for (const [code, codeDocs] of docsByCode.entries()) {
    const tmpl = codeDocs[0]?.template
    if (!tmpl?.is_required) continue
    requiredTemplateCodes.add(code)
    const satisfied = codeDocs.some((d) => d.status === "approved" || d.is_checked)
    if (satisfied) satisfiedTemplateCodes.add(code)
  }
  const rawPct = requiredTemplateCodes.size > 0
    ? Math.round((satisfiedTemplateCodes.size / requiredTemplateCodes.size) * 100)
    : 0
  const pct = completionOverride ? 100 : rawPct

  // Count docs that need reviewer action (pending_review = uploaded but not yet decided)
  const pendingReviewCount = docs.filter((d) => d.status === "pending_review" && d.template).length

  const contractMap = new Map<string, { status: string; signed_doc_path: string | null }>()
  for (const c of contractsResult.data ?? []) contractMap.set(c.kind, { status: c.status, signed_doc_path: (c as unknown as { signed_doc_path: string | null }).signed_doc_path ?? null })

  const contractState = {
    payefy: contractMap.get("payefy_service")?.status ?? null,
    transfer_increase: contractMap.get("transfer_increase_letter")?.status ?? null,
    transfer_contract: contractMap.get("transfer_contract")?.status ?? null,
    payefy_doc_path: contractMap.get("payefy_service")?.signed_doc_path ?? null,
  }

  const logs = (logsResult.data ?? []).map((l) => ({
    ...l,
    actor: (l.profiles as unknown) as { full_name: string } | null,
  }))

  const personTypeLabel = company?.person_type === "persona_fisica" ? "Persona Física"
    : company?.person_type === "persona_moral" ? "Persona Moral" : null

  const statusStyle = STATUS_COLORS[app.status] ?? STATUS_COLORS.draft

  // ── Overview: one row per template (deduplicated) ─────────────────────────
  const overviewGroups = Array.from(docsByCode.entries())
    .filter(([, ds]) => ds[0]?.template && !ds[0].template.is_form)
    .map(([code, ds]) => {
      const tmpl = ds[0].template!
      const isCheckType = tmpl.field_type === "check_or_upload"
      const displayStatus = isCheckType
        ? (ds.some((d) => d.is_checked) ? "approved" : "pending_upload")
        : worstStatus(ds.map((d) => d.status))
      return {
        code,
        name: tmpl.name,
        fieldType: tmpl.field_type ?? "upload",
        sortOrder: tmpl.sort_order,
        isCheckType,
        isRequired: tmpl.is_required,
        displayStatus,
        isChecked: ds.some((d) => d.is_checked),
        primaryDocId: ds.find((d) => d.storage_path)?.id ?? ds[0].id,
        storagePath: ds.find((d) => d.storage_path)?.storage_path ?? null,
      }
    })
    .sort((a, b) => a.sortOrder - b.sortOrder)

  const overviewUpload = overviewGroups.filter(
    (g) => !g.isCheckType && !ANNEX_SECTION_CODES.has(g.code) && g.fieldType !== "data_check"
  )
  const overviewCheck = overviewGroups.filter((g) => g.isCheckType)
  const overviewDataCheck = overviewGroups.filter((g) => g.fieldType === "data_check")

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100%" }}>
      {/* ── Topbar ── */}
      <header style={{ padding: "20px 32px 16px", borderBottom: "1px solid var(--admin-border, #E7ECF1)", background: "var(--admin-surface, #fff)" }}>
        <Link
          href="/admin/clients"
          className="hover:text-[#0F1B2A] transition-colors"
          style={{ fontSize: 13, color: "var(--admin-text-muted, #5A6B7B)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 10 }}
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
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 700,
                padding: "3px 10px", borderRadius: 999,
                background: pct >= 80 ? "#E7F8EF" : pct >= 50 ? "#FFF7ED" : "#FEF2F2",
                color: pct >= 80 ? "#047857" : pct >= 50 ? "#92400E" : "#B91C1C",
                border: `1px solid ${pct >= 80 ? "#CBEFDB" : pct >= 50 ? "#FCEBD2" : "#FBDADA"}`,
              }}>
                {pct}%{completionOverride ? " (forzado)" : ` · ${satisfiedTemplateCodes.size}/${requiredTemplateCodes.size}`}
              </span>
              {/* App status */}
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600,
                padding: "3px 10px", borderRadius: 999,
                background: statusStyle.bg, color: statusStyle.color, border: `1px solid ${statusStyle.border}`,
              }}>
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
            <SendToTransferButton applicationId={appId} transferStatus={transferStatus} />
            <ExportExpedienteButton applicationId={appId} />
            {/* Feature 4: completion override toggle */}
            <CompletionOverrideButton applicationId={appId} initialValue={completionOverride} />
            <Link
              href={`/admin/applications/${appId}/audit`}
              className="hover:bg-[#F6F8FA] hover:text-[#0F1B2A] transition-all"
              style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", fontSize: 13, fontWeight: 600, borderRadius: 9,
                background: "transparent", border: "1px solid var(--admin-border, #E7ECF1)", color: "var(--admin-text-muted, #5A6B7B)", textDecoration: "none" }}
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

        {/* ── Action required banner ── */}
        {pendingReviewCount > 0 && (
          <div style={{
            display: "flex", alignItems: "center", gap: 12,
            background: "#EFF4FF", border: "1px solid #C7D9FF", borderRadius: 12,
            padding: "12px 18px", marginBottom: 16,
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: "50%", background: "#1D4ED8",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <span style={{ color: "#fff", fontSize: 14, fontWeight: 800 }}>{pendingReviewCount}</span>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#1D4ED8", lineHeight: 1.2 }}>
                {pendingReviewCount === 1
                  ? "1 documento esperando tu decisión"
                  : `${pendingReviewCount} documentos esperando tu decisión`}
              </p>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: "#3B6BE0" }}>
                Aprueba o solicita cambios en los documentos marcados en azul abajo
              </p>
            </div>
          </div>
        )}

        {/* ── OVERVIEW CARD ── */}
        <div style={{ background: "var(--admin-surface, #fff)", border: "1px solid var(--admin-border, #E7ECF1)", borderRadius: 16, boxShadow: "0 1px 3px rgba(16,30,45,.06)", overflow: "hidden", marginBottom: 20 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1px 1fr", minHeight: 200 }}>

            {/* Left: upload documents (one per template) */}
            <div style={{ padding: "20px 24px" }}>
              <p style={{ margin: "0 0 14px", fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--admin-text-subtle, #8A99A8)" }}>
                Documentos · {overviewUpload.length} plantillas
              </p>
              <div style={{ display: "flex", flexDirection: "column" }}>
                {overviewUpload.length === 0 ? (
                  <p style={{ fontSize: 13, color: "var(--admin-text-muted, #5A6B7B)", margin: 0 }}>Sin documentos.</p>
                ) : overviewUpload.map((g) => (
                  <div key={g.code} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: "1px solid var(--admin-border, #E7ECF1)" }}>
                    <DocIcon status={g.displayStatus} />
                    <span style={{ fontSize: 13, color: g.displayStatus === "approved" ? "var(--admin-text, #0F1B2A)" : g.displayStatus === "pending_upload" ? "var(--admin-text-subtle, #8A99A8)" : "var(--admin-text, #0F1B2A)", flex: 1, lineHeight: 1.3 }}>
                      {g.name}
                      {!g.isRequired && <span style={{ fontSize: 11, color: "var(--admin-text-subtle, #8A99A8)", marginLeft: 4 }}>opcional</span>}
                      {(docsByCode.get(g.code)?.length ?? 0) > 1 && (
                        <span style={{ fontSize: 11, color: "var(--admin-text-subtle, #8A99A8)", marginLeft: 4 }}>
                          · {docsByCode.get(g.code)!.length} arch.
                        </span>
                      )}
                    </span>
                    {g.displayStatus === "changes_requested" && (
                      <span style={{ fontSize: 11, color: "#92400E", background: "#FFF7ED", border: "1px solid #FCEBD2", borderRadius: 4, padding: "1px 6px" }}>cambios</span>
                    )}
                    {g.displayStatus === "pending_review" && (
                      <span style={{ fontSize: 11, color: "#1D4ED8", background: "#EFF4FF", border: "1px solid #DBE5FF", borderRadius: 4, padding: "1px 6px" }}>revisión</span>
                    )}
                    {g.storagePath && (
                      <a href={`/api/documents/${g.primaryDocId}/view`} target="_blank" rel="noopener noreferrer"
                        style={{ fontSize: 11, color: "var(--admin-brand-strong, #0B7A44)", textDecoration: "none", whiteSpace: "nowrap" }}>
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

              {/* Feature 2: interactive check items */}
              {overviewCheck.length > 0 && (
                <div>
                  <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--admin-text-subtle, #8A99A8)" }}>
                    Casillas Sí/No
                  </p>
                  {overviewCheck.map((g) => {
                    const primaryDoc = docsByCode.get(g.code)![0]
                    return (
                      <AdminCheckRow
                        key={g.code}
                        documentId={primaryDoc.id}
                        applicationId={appId}
                        templateName={g.name}
                        initialIsChecked={g.isChecked}
                        isRequired={g.isRequired}
                        storageDocId={g.storagePath ? g.primaryDocId : undefined}
                      />
                    )
                  })}
                </div>
              )}

              {/* Datos solicitados (data_check) */}
              {overviewDataCheck.length > 0 && (
                <div>
                  <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--admin-text-subtle, #8A99A8)" }}>
                    Datos solicitados
                  </p>
                  {overviewDataCheck.map((g) => {
                    const primaryDoc = docsByCode.get(g.code)![0]
                    return (
                      <AdminValidationRow
                        key={g.code}
                        documentId={primaryDoc.id}
                        applicationId={appId}
                        templateName={g.name}
                        initialIsValidated={g.displayStatus === "approved"}
                        isRequired={g.isRequired}
                        value={primaryDoc.file_name}
                      />
                    )
                  })}
                </div>
              )}

              {/* Contracts */}
              <ContractManager applicationId={appId} contracts={contractState} />

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

        {/* ── Feature 1a: Full status selector (always visible) ── */}
        <div style={{ background: "var(--admin-surface, #fff)", border: "1px solid var(--admin-border, #E7ECF1)", borderRadius: 12, padding: "16px 20px", marginBottom: 20, boxShadow: "0 1px 2px rgba(16,30,45,.04)" }}>
          <p style={{ margin: "0 0 12px", fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--admin-text-subtle, #8A99A8)" }}>
            Etapa de la solicitud
          </p>
          <AdminFullStatusSelector applicationId={appId} currentStatus={app.status} />
        </div>

        {/* ── Feature 3: KYC sections (grouped by template) ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {CATEGORY_CODES.map(({ title, codes }) => {
            // Filter out annex-section codes from KYC categories
            const kycCodes = codes.filter((c) => !ANNEX_SECTION_CODES.has(c))
            const catGroups = kycCodes
              .filter((code) => docsByCode.has(code))
              .map((code) => ({ code, docs: docsByCode.get(code)! }))
            if (catGroups.length === 0) return null

            return (
              <section key={title}>
                <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--admin-text-subtle, #8A99A8)" }}>
                  {title}
                </p>
                <div style={{ background: "var(--admin-surface, #fff)", border: "1px solid var(--admin-border, #E7ECF1)", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 2px rgba(16,30,45,.04)" }}>
                  <div style={{ padding: "12px 16px" }}>
                    {catGroups.map(({ code, docs: codeDocs }) => {
                      const tmpl = codeDocs[0].template!
                      const isCheckType = tmpl.field_type === "check_or_upload"
                      const isDataCheck = tmpl.field_type === "data_check"

                      if (isCheckType) {
                        return (
                          <AdminCheckRow
                            key={code}
                            documentId={codeDocs[0].id}
                            applicationId={appId}
                            templateName={tmpl.name}
                            initialIsChecked={codeDocs[0].is_checked}
                            isRequired={tmpl.is_required}
                            storageDocId={codeDocs[0].storage_path ? codeDocs[0].id : undefined}
                          />
                        )
                      }

                      if (isDataCheck) {
                        return (
                          <AdminValidationRow
                            key={code}
                            documentId={codeDocs[0].id}
                            applicationId={appId}
                            templateName={tmpl.name}
                            initialIsValidated={codeDocs[0].status === "approved"}
                            isRequired={tmpl.is_required}
                            value={codeDocs[0].file_name}
                          />
                        )
                      }

                      // Upload-type: show template header if multiple files, then each file
                      const isMulti = codeDocs.length > 1
                      return (
                        <div key={code}>
                          {isMulti && (
                            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 0 4px", borderBottom: "none" }}>
                              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--admin-text, #0F1B2A)" }}>
                                {tmpl.name}
                              </span>
                              {!tmpl.is_required && (
                                <span style={{ fontSize: 11, padding: "1px 6px", borderRadius: 4, background: "#F1F5F9", color: "#64748B" }}>
                                  opcional
                                </span>
                              )}
                              <span style={{ fontSize: 11, color: "var(--admin-text-subtle, #8A99A8)" }}>
                                {codeDocs.length} archivos
                              </span>
                            </div>
                          )}
                          {codeDocs.map((doc, idx) => (
                            <ReviewDocumentRow
                              key={doc.id}
                              documentId={doc.id}
                              applicationId={appId}
                              templateCode={tmpl.code}
                              templateName={isMulti ? (doc.file_name ?? `Archivo ${idx + 1}`) : tmpl.name}
                              isRequired={!isMulti && tmpl.is_required}
                              currentStatus={doc.status as DocStatus}
                              storageAvailable={!!doc.storage_path}
                              reviewerNotes={doc.reviewer_notes}
                              clientNotes={doc.client_notes}
                              uploadedAt={doc.uploaded_at}
                            />
                          ))}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </section>
            )
          })}

          {/* ── Anexos / Contratos section ── */}
          {(() => {
            const annexGroups = Array.from(ANNEX_SECTION_CODES)
              .filter((code) => docsByCode.has(code))
              .map((code) => ({ code, docs: docsByCode.get(code)! }))
            if (annexGroups.length === 0) return null

            return (
              <section>
                <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--admin-text-subtle, #8A99A8)" }}>
                  Anexos / Contratos
                </p>
                <div style={{ background: "var(--admin-surface, #fff)", border: "1px solid var(--admin-border, #E7ECF1)", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 2px rgba(16,30,45,.04)" }}>
                  <div style={{ padding: "12px 16px" }}>
                    {annexGroups.map(({ code, docs: codeDocs }) => {
                      const tmpl = codeDocs[0].template!
                      const isMulti = codeDocs.length > 1
                      return (
                        <div key={code}>
                          {isMulti && (
                            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0 4px" }}>
                              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--admin-text, #0F1B2A)" }}>
                                {tmpl.name}
                              </span>
                              <span style={{ fontSize: 11, padding: "1px 6px", borderRadius: 4, background: "#F1F5F9", color: "#64748B" }}>
                                opcional
                              </span>
                              <span style={{ fontSize: 11, color: "var(--admin-text-subtle, #8A99A8)" }}>
                                {codeDocs.length} archivos
                              </span>
                            </div>
                          )}
                          {codeDocs.map((doc, idx) => (
                            <ReviewDocumentRow
                              key={doc.id}
                              documentId={doc.id}
                              applicationId={appId}
                              templateCode={code}
                              templateName={isMulti ? (doc.file_name ?? `Archivo ${idx + 1}`) : tmpl.name}
                              isRequired={false}
                              currentStatus={doc.status as DocStatus}
                              storageAvailable={!!doc.storage_path}
                              reviewerNotes={doc.reviewer_notes}
                              clientNotes={doc.client_notes}
                              uploadedAt={doc.uploaded_at}
                            />
                          ))}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </section>
            )
          })()}

          {/* ── Catch-all: any document code not covered by CATEGORY_CODES or ANNEX_SECTION_CODES ── */}
          {(() => {
            const allKnownCodes = new Set([
              ...CATEGORY_CODES.flatMap((c) => c.codes),
              ...ANNEX_SECTION_CODES,
            ])
            const uncoveredGroups = Array.from(docsByCode.entries()).filter(
              ([code, ds]) =>
                !allKnownCodes.has(code) &&
                ds.some((d) => d.storage_path || d.status !== "pending_upload")
            )
            if (uncoveredGroups.length === 0) return null

            return (
              <section>
                <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--admin-text-subtle, #8A99A8)" }}>
                  Otros documentos
                </p>
                <div style={{ background: "var(--admin-surface, #fff)", border: "1px solid var(--admin-border, #E7ECF1)", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 2px rgba(16,30,45,.04)" }}>
                  <div style={{ padding: "12px 16px" }}>
                    {uncoveredGroups.map(([code, codeDocs]) => {
                      const tmpl = codeDocs[0].template!
                      const isMulti = codeDocs.length > 1
                      return (
                        <div key={code}>
                          {isMulti && (
                            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0" }}>
                              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--admin-text, #0F1B2A)" }}>{tmpl.name}</span>
                              <span style={{ fontSize: 11, color: "var(--admin-text-subtle, #8A99A8)" }}>{codeDocs.length} archivos</span>
                            </div>
                          )}
                          {codeDocs.map((doc, idx) => (
                            <ReviewDocumentRow
                              key={doc.id}
                              documentId={doc.id}
                              applicationId={appId}
                              templateCode={code}
                              templateName={isMulti ? (doc.file_name ?? `Archivo ${idx + 1}`) : tmpl.name}
                              isRequired={tmpl.is_required}
                              currentStatus={doc.status as DocStatus}
                              storageAvailable={!!doc.storage_path}
                              reviewerNotes={doc.reviewer_notes}
                              clientNotes={doc.client_notes}
                              uploadedAt={doc.uploaded_at}
                            />
                          ))}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </section>
            )
          })()}
          {/* ── Documentos adicionales (template_id IS NULL) ── */}
          <section>
            <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--admin-text-subtle, #8A99A8)" }}>
              Documentos adicionales / sin título
            </p>
            <div style={{ background: "var(--admin-surface, #fff)", border: "1px solid var(--admin-border, #E7ECF1)", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 2px rgba(16,30,45,.04)" }}>
              <div style={{ padding: "12px 16px" }}>
                {extraDocs.length === 0 ? (
                  <p style={{ margin: "12px 0", fontSize: 13, color: "var(--admin-text-muted, #5A6B7B)" }}>
                    Sin documentos adicionales.
                  </p>
                ) : (
                  extraDocs.map((doc) => (
                    <ReviewDocumentRow
                      key={doc.id}
                      documentId={doc.id}
                      applicationId={appId}
                      templateName={doc.title ?? doc.file_name ?? "Documento sin título"}
                      isRequired={false}
                      currentStatus={doc.status as DocStatus}
                      storageAvailable={!!doc.storage_path}
                      reviewerNotes={doc.reviewer_notes}
                      uploadedAt={doc.uploaded_at}
                    />
                  ))
                )}
                <div style={{ paddingBottom: 8 }}>
                  <AdditionalUploadBox applicationId={appId} />
                </div>
              </div>
            </div>
          </section>

        </div>
      </div>
    </div>
  )
}
