import { notFound } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import {
  DocumentChecklist,
  type DocWithTemplate,
  type DocGroup,
  type ChecklistCategory,
} from "@/components/documents/document-checklist"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { SubmitApplicationButton } from "@/components/documents/submit-application-button"

const MULTI_UPLOAD_CODES = new Set(["shareholder_id", "administrator_id", "legal_rep_id"])

// Categorías hard-coded según el brief
const CATEGORY_CODES: { title: string; codes: string[] }[] = [
  {
    title: "Formularios digitales",
    codes: ["complementary_info", "beneficial_owner"],
  },
  {
    title: "Documentos de la empresa",
    codes: [
      "incorporation_act",
      "incorporation_act_update",
      "efirma",
      "cif",
      "company_address_proof",
      "inscription_rpc",
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
    ],
  },
  {
    title: "Documentos fiscales",
    codes: ["tax_situation_certificate", "tax_declaration", "sat_compliance"],
  },
  { title: "Estado de cuenta", codes: ["bank_statement"] },
  { title: "Adicionales", codes: ["business_photos", "website_url"] },
]

export default async function DocumentsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: appId } = await params
  const supabase = await createClient()

  // 1. Obtener la application actual
  const { data: app } = await supabase
    .from("applications")
    .select("id, status, company_id, products(name, code)")
    .eq("id", appId)
    .single()

  if (!app) return notFound()

  // 2. Obtener todas las applications de la misma empresa
  const { data: allApps } = await supabase
    .from("applications")
    .select("id, product_id")
    .eq("company_id", app.company_id)

  const allAppIds = (allApps ?? []).map((a) => a.id)

  // 3. Cargar todos los documents con templates para todas las applications
  const { data: allDocs } = await supabase
    .from("documents")
    .select(
      `id, status, storage_path, file_name, application_id, template_id,
       document_templates(id, code, name, description, is_form, is_required, file_format, instructions, sort_order)`
    )
    .in("application_id", allAppIds)

  if (!allDocs) return notFound()

  type TemplateMeta = {
    id: string; code: string; name: string; description: string | null;
    is_form: boolean; is_required: boolean; file_format: string;
    instructions: string | null; sort_order: number
  }
  // 4. Construir mapa de template.code → docs
  type RawDoc = typeof allDocs[number]
  const codeMap = new Map<string, RawDoc[]>()
  for (const d of allDocs) {
    const tmpl = (d.document_templates as unknown) as TemplateMeta | null
    if (!tmpl) continue
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
      template: {
        id: tmpl.id,
        code: tmpl.code,
        name: tmpl.name,
        description: tmpl.description,
        is_form: tmpl.is_form,
        is_required: tmpl.is_required,
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

  // 7. Stats para progress bar
  const allGroupDocs = Array.from(groupMap.values()).flatMap((g) => g.docs)
  const total = allGroupDocs.length
  const done = allGroupDocs.filter((d) =>
    ["approved", "pending_review"].includes(d.status)
  ).length
  const pct = total > 0 ? Math.round((done / total) * 100) : 0

  // 8. Detectar si todos los required están listos para enviar
  const requiredGroups = Array.from(groupMap.values()).filter(
    (g) => g.docs[0]?.template.is_required
  )
  const allRequiredReady = requiredGroups.every((g) =>
    g.docs.every((d) => ["pending_review", "approved"].includes(d.status))
  )

  const product = (app.products as unknown) as { name: string; code: string } | null

  return (
    <div className="p-6 sm:p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Link
            href="/dashboard"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Dashboard
          </Link>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-2xl font-bold">Expediente</h1>
          <Badge variant="outline">{product?.name ?? "Solicitud"}</Badge>
        </div>
      </div>

      {/* Progress general */}
      <div className="mb-6 space-y-1.5">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Progreso general</span>
          <span>
            {done} / {total} documentos
          </span>
        </div>
        <Progress value={pct} className="h-3" />
      </div>

      {/* Checklist */}
      <DocumentChecklist categories={categories} applicationId={appId} />

      {/* Botón enviar */}
      <div className="mt-8 flex justify-end">
        <SubmitApplicationButton
          applicationId={appId}
          allRequiredUploaded={allRequiredReady}
          alreadySubmitted={app.status !== "draft"}
        />
      </div>
    </div>
  )
}
