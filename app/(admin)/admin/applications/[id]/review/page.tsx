import { notFound } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Badge } from "@/components/ui/badge"
import { ReviewDocumentRow } from "@/components/documents/review-document-row"
import { StatusChangeForm } from "@/components/admin/status-change-form"
import { buttonVariants } from "@/components/ui/button"

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

const VALID_TRANSITIONS: Record<string, string[]> = {
  documents_pending: ["in_compliance_review"],
  in_compliance_review: [
    "changes_requested",
    "approved_compliance",
    "rejected",
  ],
  changes_requested: ["in_compliance_review"],
  approved_compliance: ["in_provider_review"],
  in_provider_review: [
    "provider_changes_requested",
    "approved_provider",
    "rejected",
  ],
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

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: appId } = await params
  const supabase = await createClient()

  const { data: app } = await supabase
    .from("applications")
    .select(
      "id, status, rejection_reason, company_id, companies(legal_name, tax_id), products(name, code)"
    )
    .eq("id", appId)
    .single()

  if (!app) return notFound()

  const { data: rawDocs } = await supabase
    .from("documents")
    .select(
      `id, status, storage_path, reviewer_notes, template_id, uploaded_at,
       document_templates(id, code, name, is_form, is_required, sort_order)`
    )
    .eq("application_id", appId)

  const docs = (rawDocs ?? []).map((d) => ({
    ...d,
    uploaded_at: (d as unknown as { uploaded_at?: string | null }).uploaded_at ?? null,
    template: (d.document_templates as unknown) as {
      id: string
      code: string
      name: string
      is_form: boolean
      is_required: boolean
      sort_order: number
    } | null,
  }))

  // Group by category
  const docByCode = new Map(
    docs
      .filter((d) => d.template)
      .map((d) => [d.template!.code, d])
  )

  const company = (app.companies as unknown) as {
    legal_name: string
    tax_id: string
  } | null
  const product = (app.products as unknown) as {
    name: string
    code: string
  } | null

  const nextStatuses = VALID_TRANSITIONS[app.status] ?? []

  return (
    <div className="p-6 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/admin/clients"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Clientes
        </Link>
        <div className="flex items-center gap-3 mt-2 flex-wrap">
          <h1 className="text-xl font-bold">
            {company?.legal_name ?? "Empresa"}
          </h1>
          <Badge variant={STATUS_VARIANT[app.status] ?? "pending"}>
            {STATUS_LABELS[app.status] ?? app.status}
          </Badge>
          <Badge variant="outline">{product?.name ?? "Producto"}</Badge>
        </div>
        {company?.tax_id && (
          <p className="text-sm text-muted-foreground mt-0.5">
            RFC: {company.tax_id}
          </p>
        )}
        <div className="flex gap-2 mt-3">
          <Link
            href={`/admin/applications/${appId}/audit`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Ver auditoría
          </Link>
        </div>
      </div>

      {/* Cambio de status */}
      {nextStatuses.length > 0 && (
        <section className="mb-8 rounded-lg border p-4 bg-card">
          <h2 className="text-sm font-semibold mb-3">Cambiar estado de la solicitud</h2>
          <StatusChangeForm
            applicationId={appId}
            currentStatus={app.status}
            nextStatuses={nextStatuses}
          />
        </section>
      )}

      {/* Documentos por categoría */}
      <div className="space-y-6">
        {CATEGORY_CODES.map(({ title, codes }) => {
          const catDocs = codes
            .map((code) => docByCode.get(code))
            .filter(Boolean) as typeof docs

          if (catDocs.length === 0) return null

          return (
            <section key={title}>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                {title}
              </h3>
              <div className="rounded-lg border bg-card">
                <div className="px-4">
                  {catDocs.map((doc) => (
                    <ReviewDocumentRow
                      key={doc.id}
                      documentId={doc.id}
                      applicationId={appId}
                      templateName={doc.template?.name ?? "Documento"}
                      isRequired={doc.template?.is_required ?? false}
                      currentStatus={
                        doc.status as
                          | "pending_upload"
                          | "pending_review"
                          | "approved"
                          | "rejected"
                          | "changes_requested"
                      }
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
  )
}
