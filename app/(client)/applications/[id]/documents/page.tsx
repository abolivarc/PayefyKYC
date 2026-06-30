import { notFound } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { isDocumentExpired } from "@/lib/documents/expiry"
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

const MULTI_UPLOAD_CODES = new Set(["shareholder_id", "administrator_id", "legal_rep_id"])

// Categorías hard-coded según el brief
const CATEGORY_CODES: { title: string; codes: string[] }[] = [
  {
    title: "Formularios digitales",
    codes: ["complementary_info", "beneficial_owner", "terms_opm", "terms_and_conditions"],
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
      // Persona Física (terminales)
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
      // Persona Física (terminales)
      "pf_official_id",
    ],
  },
  {
    title: "Documentos fiscales",
    codes: [
      "tax_situation_certificate",
      "tax_declaration",
      "sat_compliance",
      // Persona Física (terminales)
      "pf_tax_situation",
    ],
  },
  {
    title: "Estado de cuenta",
    codes: ["bank_statement", "pf_bank_statement"],
  },
  {
    title: "Datos solicitados",
    codes: ["shareholders_curp", "shareholders_rfc", "legal_reps_curp", "legal_reps_rfc"],
  },
  {
    title: "Adicionales",
    codes: ["business_photos", "website_url", "pf_business_photos", "pf_website_url"],
  },
]

export default async function DocumentsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: appId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  console.log("[DOCS DEBUG] user:", { userId: user?.id, appId })
  if (!user) {
    console.error("[DOCS DEBUG] notFound: no user session")
    return notFound()
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  console.log("[DOCS DEBUG] URL exists:", !!url, "KEY exists:", !!key, "KEY length:", key?.length)

  // Usamos service_role porque is_company_member falla en edge/serverless
  const { createClient: createAdmin } = await import("@supabase/supabase-js")
  const admin = createAdmin(url!, key!)

  // 1. Obtener la application actual
  const { data: app, error: appErr } = await admin
    .from("applications")
    .select("id, status, company_id, products(name, code)")
    .eq("id", appId)
    .single()

  console.log("[DOCS DEBUG] app query:", { appId, app: !!app, error: appErr?.message })
  if (!app) {
    console.error("[DOCS DEBUG] notFound: app is null, error:", appErr?.message)
    return notFound()
  }

  // Verificar membresía manualmente
  const { data: membership, error: memErr } = await admin
    .from("company_users")
    .select("id")
    .eq("company_id", app.company_id)
    .eq("user_id", user.id)
    .single()

  console.log("[DOCS DEBUG] membership:", { company_id: app.company_id, user_id: user.id, found: !!membership, error: memErr?.message })
  if (!membership) {
    console.error("[DOCS DEBUG] notFound: no membership")
    return notFound()
  }

  // 2. Obtener todas las applications de la misma empresa
  const { data: allApps, error: allAppsErr } = await admin
    .from("applications")
    .select("id, product_id")
    .eq("company_id", app.company_id)

  console.log("[DOCS DEBUG] allApps:", { count: allApps?.length, error: allAppsErr?.message })

  const allAppIds = (allApps ?? []).map((a) => a.id)

  // 3. Cargar todos los documents con templates para todas las applications
  const { data: allDocs, error: docsErr } = await admin
    .from("documents")
    .select(
      `id, status, storage_path, file_name, application_id, template_id, is_checked, uploaded_at, title, reviewer_notes,
       document_templates(id, code, name, description, is_form, is_required, field_type, file_format, instructions, sort_order)`
    )
    .in("application_id", allAppIds)

  console.log("[DOCS DEBUG] allDocs:", { count: allDocs?.length, error: docsErr?.message })
  if (!allDocs) {
    console.error("[DOCS DEBUG] notFound: allDocs is null, error:", docsErr?.message)
    return notFound()
  }

  type TemplateMeta = {
    id: string; code: string; name: string; description: string | null;
    is_form: boolean; is_required: boolean; field_type: string; file_format: string;
    instructions: string | null; sort_order: number
  }
  // 4. Construir mapa de template.code → docs; separar extras (template_id IS NULL)
  type RawDoc = typeof allDocs[number] & { uploaded_at?: string | null }
  type ExtraDoc = { id: string; status: string; fileName: string | null; storagePath: string | null; title: string | null; reviewerNotes: string | null }

  const codeMap = new Map<string, RawDoc[]>()
  const extraDocs: ExtraDoc[] = []

  for (const d of allDocs) {
    const tmpl = (d.document_templates as unknown) as TemplateMeta | null
    if (!tmpl) {
      // Extra doc (template_id IS NULL) — only show ones belonging to this application
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
    const existing = codeMap.get(tmpl.code) ?? []
    existing.push(d)
    codeMap.set(tmpl.code, existing)
  }

  // 5. Construir grupos deduplicados
  const groupMap = new Map<string, DocGroup>()

  for (const [code, docs] of codeMap.entries()) {
    const firstDoc = docs[0]
    const tmpl = (firstDoc.document_templates as unknown) as TemplateMeta
    const isShared = docs.some((d) => d.application_id !== appId)
    const isMulti = MULTI_UPLOAD_CODES.has(code)

    // Para multi-upload: tomar solo docs de la aplicación actual
    // Para single-upload: preferir el doc de la aplicación actual
    let relevantDocs: RawDoc[]
    if (isMulti) {
      relevantDocs = docs.filter((d) => d.application_id === appId)
      if (relevantDocs.length === 0) relevantDocs = [docs[0]]
    } else {
      const currentAppDoc = docs.find((d) => d.application_id === appId)
      relevantDocs = [currentAppDoc ?? docs[0]]
    }

    const docWithTemplate: DocWithTemplate[] = relevantDocs.map((d) => ({
      id: d.id,
      status: d.status as DocWithTemplate["status"],
      storage_path: d.storage_path,
      file_name: d.file_name,
      application_id: d.application_id,
      is_checked: (d as unknown as { is_checked: boolean }).is_checked ?? false,
      uploaded_at: (d as unknown as { uploaded_at?: string | null }).uploaded_at ?? null,
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

  // 6. Organizar en categorías
  const categories: ChecklistCategory[] = CATEGORY_CODES.map(({ title, codes }) => ({
    title,
    groups: codes
      .map((code) => groupMap.get(code))
      .filter((g): g is DocGroup => g !== undefined),
  }))

  // 7. Stats para progress bar — solo los docs visibles en categorías
  const allGroupDocs = categories.flatMap((c) => c.groups).flatMap((g) => g.docs)
  const total = allGroupDocs.length
  const done = allGroupDocs.filter((d) => {
    if (d.template.field_type === "check_or_upload") return d.is_checked || !!d.storage_path
    if (d.template.field_type === "data_check") return d.status === "approved"
    if (isDocumentExpired(d.uploaded_at)) return false
    return ["approved", "pending_review"].includes(d.status)
  }).length
  const pct = total > 0 ? Math.round((done / total) * 100) : 0

  // 8. Detectar si todos los required están listos para enviar
  const requiredGroups = categories
    .flatMap((c) => c.groups)
    .filter((g) => g.is_required)
  const allRequiredReady = requiredGroups.every((g) =>
    g.docs.every((d) => {
      if (d.template.field_type === "check_or_upload") return d.is_checked || !!d.storage_path
      // data_check: client has no action; always ready from client's side
      if (d.template.field_type === "data_check") return true
      if (isDocumentExpired(d.uploaded_at)) return false
      return ["pending_review", "approved"].includes(d.status)
    })
  )

  const product = (app.products as unknown) as { name: string; code: string } | null

  return (
    <div style={{ background: "#F4F8F6", minHeight: "100vh" }}>
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "24px 24px 64px" }}>

        {/* Back link */}
        <div className="mb-4">
          <Link
            href="/dashboard"
            className="text-sm font-medium"
            style={{ color: "#5A6B7B", textDecoration: "none" }}
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

        {/* Progress card */}
        <div
          className="flex items-center gap-5 rounded-2xl mb-5 flex-wrap"
          style={{
            background: "#fff",
            border: "1px solid #E7ECF1",
            boxShadow: "0 1px 2px rgba(16,30,45,.05)",
            padding: 20,
          }}
        >
          {/* Circular ring */}
          <div className="relative shrink-0" style={{ width: 62, height: 62 }}>
            <svg width="62" height="62" style={{ transform: "rotate(-90deg)" }}>
              <circle cx="31" cy="31" r="26" fill="none" stroke="#E7ECF1" strokeWidth="5"/>
              <circle
                cx="31" cy="31" r="26" fill="none"
                stroke="#0B7A44" strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 26}`}
                strokeDashoffset={`${2 * Math.PI * 26 * (1 - pct / 100)}`}
                style={{ transition: "stroke-dashoffset .4s ease" }}
              />
            </svg>
            <div
              className="absolute inset-0 flex items-center justify-center font-extrabold"
              style={{ fontFamily: "var(--font-display)", fontSize: 14, color: "#0F1B2A" }}
            >
              {pct}%
            </div>
          </div>

          {/* Text */}
          <div className="flex-1" style={{ minWidth: 200 }}>
            <h3
              className="font-bold mb-0.5"
              style={{ fontFamily: "var(--font-display)", fontSize: 16, color: "#0F1B2A", margin: "0 0 3px" }}
            >
              Progreso del expediente
            </h3>
            <p className="text-sm" style={{ color: "#5A6B7B", margin: 0 }}>
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
          <div className="rounded-lg border bg-card">
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
