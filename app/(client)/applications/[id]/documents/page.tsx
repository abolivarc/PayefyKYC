import { notFound } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { isDocumentExpired, EXPIRY_CODES } from "@/lib/documents/expiry"
import {
  DocumentChecklist,
  type DocWithTemplate,
  type DocGroup,
  type ChecklistCategory,
} from "@/components/documents/document-checklist"
import { SubmitApplicationButton } from "@/components/documents/submit-application-button"
import { ProductHero } from "@/components/client/product-hero"
import { StageStepper } from "@/components/client/stage-stepper"
import { KycSummaryPanel } from "@/components/client/kyc-summary-panel"
import { AdditionalUploadBox } from "@/components/documents/additional-upload-box"
import { AdditionalDocRow } from "@/components/documents/additional-doc-row"

const MULTI_UPLOAD_CODES = new Set([
  "shareholder_id",
  "administrator_id",
  "legal_rep_id",
  // Fotos del negocio: 4 campos (2 exterior, 2 interior) + extras
  "business_photos",
  "pf_business_photos",
])

// Ordered category display — entries with no matching docs are hidden automatically
const CATEGORY_CODES: { title: string; codes: string[] }[] = [
  {
    title: "Formularios digitales",
    codes: ["complementary_info", "beneficial_owner", "terms_opm", "terms_and_conditions", "operational_info", "pf_operational_info", "amex_cover"],
  },
  {
    title: "Documentos de la empresa",
    codes: [
      "incorporation_act",
      "incorporation_act_update",
      "organigrama",
      "efirma",
      "cif",
      "company_address_proof",
      "inscription_rpc",
      "pf_address_proof",
    ],
  },
  {
    title: "Identidades y poderes",
    codes: [
      "power_of_attorney",
      "legal_rep_id",
      "legal_rep_selfie",
      "shareholder_id",
      "administrator_id",
      "pf_official_id",
    ],
  },
  {
    title: "Documentos fiscales",
    codes: [
      "tax_situation_certificate",
      "tax_declaration",
      "sat_compliance",
      "pf_tax_situation",
    ],
  },
  {
    title: "Estado de cuenta",
    codes: ["bank_statement", "pf_bank_statement"],
  },
  {
    title: "Datos solicitados",
    codes: ["contact_email", "contact_phone", "pf_contact_email", "pf_contact_phone", "shareholders_curp", "shareholders_rfc", "legal_reps_curp", "legal_reps_rfc", "pf_curp", "pf_rfc"],
  },
  {
    title: "Adicionales",
    codes: ["business_photos", "website_url", "pf_business_photos", "pf_website_url"],
  },
]

type TemplateMeta = {
  id: string
  code: string
  name: string
  description: string | null
  is_form: boolean
  is_required: boolean
  field_type: string
  file_format: string
  instructions: string | null
  sort_order: number
}

export default async function DocumentsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: appId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return notFound()

  const { createClient: createAdmin } = await import("@supabase/supabase-js")
  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 1. Obtener la application actual (incluye product_id para filtrar templates)
  const { data: app } = await admin
    .from("applications")
    .select("id, status, company_id, product_id, products(name, code)")
    .eq("id", appId)
    .single()

  if (!app) return notFound()

  // 2. Verificar membresía
  const { data: membership } = await admin
    .from("company_users")
    .select("id")
    .eq("company_id", app.company_id)
    .eq("user_id", user.id)
    .single()

  if (!membership) return notFound()

  // 3. Obtener tipo de persona de la empresa (para filtrar PF/PM en terminales)
  const { data: company } = await admin
    .from("companies")
    .select("person_type, terminal_type, wants_amex")
    .eq("id", app.company_id)
    .single()

  const productCode = (app.products as unknown as { name: string; code: string } | null)?.code

  // 4. Cargar templates del producto actual
  const { data: rawTemplates } = await admin
    .from("document_templates")
    .select("id, code, name, description, is_form, is_required, field_type, file_format, instructions, sort_order")
    .eq("product_id", app.product_id)
    .order("sort_order")

  let productTemplates = (rawTemplates ?? []) as TemplateMeta[]

  // Para terminales: filtrar según tipo de persona (PF o PM)
  if (productCode === "terminals" && company?.person_type) {
    if (company.person_type === "persona_fisica") {
      productTemplates = productTemplates.filter((t) => t.code.startsWith("pf_"))
    } else {
      productTemplates = productTemplates.filter((t) => !t.code.startsWith("pf_"))
    }
  }

  // La carátula AMEX solo se muestra si el comercio aceptará American Express
  if (productCode === "terminals") {
    const wantsAmex = (company as unknown as { wants_amex?: boolean } | null)?.wants_amex
    if (!wantsAmex) {
      productTemplates = productTemplates.filter((t) => t.code !== "amex_cover")
    }
  }

  // Índices para lookup rápido
  const pCodeSet = new Set(productTemplates.map((t) => t.code))
  const pTemplateMap = new Map<string, TemplateMeta>()
  for (const t of productTemplates) pTemplateMap.set(t.code, t)

  // 5. Obtener todas las applications de la empresa (para deduplicación cross-producto)
  const { data: allApps } = await admin
    .from("applications")
    .select("id, product_id")
    .eq("company_id", app.company_id)

  const allAppIds = (allApps ?? []).map((a) => a.id)

  // 6. Cargar documentos de todas las applications
  const { data: allDocs } = await admin
    .from("documents")
    .select(
      `id, status, storage_path, file_name, application_id, template_id, is_checked, uploaded_at, title, reviewer_notes, client_notes,
       document_templates(id, code, name, description, is_form, is_required, field_type, file_format, instructions, sort_order)`
    )
    .in("application_id", allAppIds)

  if (!allDocs) return notFound()

  type RawDoc = typeof allDocs[number] & { uploaded_at?: string | null }
  type ExtraDoc = {
    id: string
    status: string
    fileName: string | null
    storagePath: string | null
    title: string | null
    reviewerNotes: string | null
  }

  // 7. Construir codeMap — SOLO códigos relevantes al producto actual
  //    Docs de otros productos con el mismo código aparecen como "compartidos"
  const codeMap = new Map<string, RawDoc[]>()
  const extraDocs: ExtraDoc[] = []

  for (const d of allDocs) {
    const tmpl = (d.document_templates as unknown) as TemplateMeta | null
    if (!tmpl) {
      // Documento adicional (sin template) — solo los de esta application
      if (d.application_id === appId) {
        const raw = d as unknown as Record<string, unknown>
        extraDocs.push({
          id: d.id,
          status: d.status,
          fileName: d.file_name,
          storagePath: d.storage_path,
          title: (raw.title as string | null) ?? null,
          reviewerNotes: (raw.reviewer_notes as string | null) ?? null,
        })
      }
      continue
    }
    // Solo incluir si el código pertenece al producto actual
    if (!pCodeSet.has(tmpl.code)) continue
    const existing = codeMap.get(tmpl.code) ?? []
    existing.push(d)
    codeMap.set(tmpl.code, existing)
  }

  // 8. Construir groupMap usando metadata del producto actual (no la del doc compartido)
  const groupMap = new Map<string, DocGroup>()

  for (const [code, docs] of codeMap.entries()) {
    // Usar metadata del producto actual (nombre/instrucciones correctos para este producto)
    const tmpl = pTemplateMap.get(code)
    if (!tmpl) continue

    const isMulti = MULTI_UPLOAD_CODES.has(code)

    let relevantDocs: RawDoc[]
    if (isMulti) {
      // Multi-upload: solo docs de esta application
      relevantDocs = docs.filter((d) => d.application_id === appId)
      if (relevantDocs.length === 0) relevantDocs = [docs[0]]
    } else {
      // Single-upload: preferir doc ya completado (de cualquier app) sobre slot vacío
      const completedDoc = docs.find((d) =>
        ["approved", "pending_review"].includes(d.status)
      )
      const currentAppDoc = docs.find((d) => d.application_id === appId)
      relevantDocs = [completedDoc ?? currentAppDoc ?? docs[0]]
    }

    const isShared = relevantDocs.some((d) => d.application_id !== appId)

    const docWithTemplate: DocWithTemplate[] = relevantDocs.map((d) => ({
      id: d.id,
      status: d.status as DocWithTemplate["status"],
      storage_path: d.storage_path,
      file_name: d.file_name,
      application_id: d.application_id,
      is_checked: (d as unknown as { is_checked: boolean }).is_checked ?? false,
      uploaded_at: (d as unknown as { uploaded_at?: string | null }).uploaded_at ?? null,
      reviewer_notes: (d as unknown as { reviewer_notes?: string | null }).reviewer_notes ?? null,
      client_notes: (d as unknown as { client_notes?: string | null }).client_notes ?? null,
      template: {
        id: tmpl.id,
        code: tmpl.code,
        name: tmpl.name,
        description: tmpl.description,
        is_form: tmpl.is_form,
        is_required: tmpl.is_required,
        field_type: tmpl.field_type ?? "upload",
        file_format: tmpl.file_format,
        instructions: tmpl.instructions,
        sort_order: tmpl.sort_order,
      },
      isShared,
    }))

    groupMap.set(code, {
      templateCode: code,
      templateId: tmpl.id,
      templateName: tmpl.name,
      templateInstructions: tmpl.instructions,
      is_form: tmpl.is_form,
      is_required: tmpl.is_required,
      field_type: tmpl.field_type ?? "upload",
      file_format: tmpl.file_format,
      docs: docWithTemplate,
      isMulti,
      isShared,
    })
  }

  // 9. Organizar en categorías — solo códigos del producto actual
  const categories: ChecklistCategory[] = CATEGORY_CODES.map(({ title, codes }) => ({
    title,
    groups: codes
      .filter((code) => pCodeSet.has(code))
      .map((code) => groupMap.get(code))
      .filter((g): g is DocGroup => g !== undefined),
  }))

  // 10. Stats para progress bar
  const allGroupDocs = categories.flatMap((c) => c.groups).flatMap((g) => g.docs)
  const total = allGroupDocs.length
  const done = allGroupDocs.filter((d) => {
    if (d.template.field_type === "check_or_upload") return d.is_checked || !!d.storage_path
    // data_check: contar como completo en cuanto el cliente guardó un valor (pending_review o approved)
    if (d.template.field_type === "data_check") return d.status !== "pending_upload"
    if (EXPIRY_CODES.has(d.template.code) && isDocumentExpired(d.uploaded_at)) return false
    return ["approved", "pending_review"].includes(d.status)
  }).length
  const pct = total > 0 ? Math.round((done / total) * 100) : 0

  // 11. ¿Todos los required listos para enviar?
  const requiredGroups = categories.flatMap((c) => c.groups).filter((g) => g.is_required)
  const allRequiredReady = requiredGroups.every((g) => {
    // Multi-upload: basta con que al menos un doc esté subido (reversos y extras son opcionales)
    if (g.isMulti) {
      return g.docs.some((d) => ["pending_review", "approved"].includes(d.status))
    }
    return g.docs.every((d) => {
      if (d.template.field_type === "check_or_upload") return d.is_checked || !!d.storage_path
      if (d.template.field_type === "data_check") return true
      if (EXPIRY_CODES.has(d.template.code) && isDocumentExpired(d.uploaded_at)) return false
      return ["pending_review", "approved"].includes(d.status)
    })
  })

  const product = (app.products as unknown) as { name: string; code: string } | null

  return (
    <div style={{ background: "#F3F7F4", minHeight: "100vh" }}>
      <div style={{ maxWidth: 1140, margin: "0 auto", padding: "20px 16px 64px" }}>

        {/* Back link */}
        <div className="mb-4">
          <Link
            href="/dashboard"
            className="text-sm font-medium"
            style={{ color: "#5B7168", textDecoration: "none" }}
          >
            ← Inicio
          </Link>
        </div>

        {/* ProductHero */}
        <ProductHero
          productCode={product?.code ?? null}
          productName={product?.name ?? null}
        />

        {/* StageStepper */}
        <StageStepper status={app.status} />

        {/* CTA pedido de producto (cuenta activa) */}
        {app.status === "activated" && (
          <div
            className="flex items-center gap-5 mb-5 flex-wrap"
            style={{
              background: "#004238",
              borderRadius: 22,
              padding: 20,
              boxShadow: "0 1px 2px rgba(15,42,34,.04), 0 1px 3px rgba(15,42,34,.06)",
            }}
          >
            <div className="flex-1" style={{ minWidth: 200 }}>
              <h3
                className="font-bold"
                style={{ fontFamily: "var(--font-display)", fontSize: 16, color: "#AEFF99", margin: "0 0 3px" }}
              >
                Tu cuenta está activa ✓
              </h3>
              <p className="text-sm" style={{ color: "#D7E5DF", margin: 0 }}>
                Ya puedes solicitar tus {product?.code === "cards" ? "tarjetas" : "terminales"} y recibirlas en tu dirección.
              </p>
            </div>
            <Link
              href={`/applications/${appId}/status`}
              className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-md text-sm font-semibold transition-opacity hover:opacity-90"
              style={{ background: "#AEFF99", color: "#004238" }}
            >
              Solicitar {product?.code === "cards" ? "tarjetas" : "terminales"} →
            </Link>
          </div>
        )}

        {/* Progress card */}
        <div
          className="flex items-center gap-5 mb-5 flex-wrap"
          style={{
            background: "#fff",
            border: "1px solid #E4ECE7",
            borderRadius: 22,
            boxShadow: "0 1px 2px rgba(15,42,34,.04), 0 1px 3px rgba(15,42,34,.06)",
            padding: 20,
          }}
        >
          {/* Circular ring */}
          <div className="relative shrink-0" style={{ width: 62, height: 62 }}>
            <svg width="62" height="62" style={{ transform: "rotate(-90deg)" }}>
              <circle cx="31" cy="31" r="26" fill="none" stroke="#E4ECE7" strokeWidth="5"/>
              <circle
                cx="31" cy="31" r="26" fill="none"
                stroke="#1f7a4d" strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 26}`}
                strokeDashoffset={`${2 * Math.PI * 26 * (1 - pct / 100)}`}
                style={{ transition: "stroke-dashoffset .4s ease" }}
              />
            </svg>
            <div
              className="absolute inset-0 flex items-center justify-center font-extrabold"
              style={{ fontFamily: "var(--font-display)", fontSize: 14, color: "#0F2A22" }}
            >
              {pct}%
            </div>
          </div>

          {/* Text */}
          <div className="flex-1" style={{ minWidth: 200 }}>
            <h3
              className="font-bold mb-0.5"
              style={{ fontFamily: "var(--font-display)", fontSize: 16, color: "#0F2A22", margin: "0 0 3px" }}
            >
              Progreso del expediente
            </h3>
            <p className="text-sm" style={{ color: "#5B7168", margin: 0 }}>
              {done} de {total} documentos completados
            </p>
          </div>

          {/* Submit button */}
          <SubmitApplicationButton
            applicationId={appId}
            allRequiredUploaded={allRequiredReady}
            alreadySubmitted={app.status !== "draft"}
          />
        </div>

        {/* KYC Summary */}
        <KycSummaryPanel categories={categories} />

        {/* Checklist */}
        <DocumentChecklist categories={categories} applicationId={appId} />

        {/* Documentos adicionales */}
        <section className="mt-6">
          <h3
            className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1 px-1"
          >
            Documentos adicionales
          </h3>
          <div style={{ background: "#fff", border: "1px solid #E4ECE7", borderRadius: 14 }}>
            <div className="px-4">
              {extraDocs.length === 0 ? (
                <p className="text-sm text-muted-foreground py-3">
                  Sin documentos adicionales.
                </p>
              ) : (
                extraDocs.map((doc) => (
                  <AdditionalDocRow
                    key={doc.id}
                    documentId={doc.id}
                    title={doc.title}
                    fileName={doc.fileName}
                    currentStatus={doc.status as "pending_upload" | "pending_review" | "approved" | "rejected" | "changes_requested"}
                    reviewerNotes={doc.reviewerNotes}
                  />
                ))
              )}
              <AdditionalUploadBox applicationId={appId} />
            </div>
          </div>
        </section>

      </div>
    </div>
  )
}
