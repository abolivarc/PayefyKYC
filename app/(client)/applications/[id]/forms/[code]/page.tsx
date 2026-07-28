import { notFound } from "next/navigation"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { ComplementaryInfoForm } from "@/components/forms/complementary-info-form"
import { BeneficialOwnerForm } from "@/components/forms/beneficial-owner-form"
import { TermsOpmForm } from "@/components/forms/terms-opm-form"
import { TermsAndConditionsForm } from "@/components/forms/terms-and-conditions-form"
import { OperationalInfoForm } from "@/components/forms/operational-info-form"
import { AmexCoverForm } from "@/components/forms/amex-cover-form"

const FORM_TITLES: Record<string, string> = {
  complementary_info: "Información complementaria",
  beneficial_owner: "Constancia de Beneficiario Controlador",
  terms_opm: "Términos y Condiciones OPM",
  terms_and_conditions: "Términos y condiciones firmados",
  operational_info: "Datos operativos del comercio",
  pf_operational_info: "Datos operativos del comercio",
  amex_cover: "Carátula de afiliación AMEX",
}

const VALID_CODES = new Set([
  "complementary_info",
  "beneficial_owner",
  "terms_opm",
  "terms_and_conditions",
  "operational_info",
  "pf_operational_info",
  "amex_cover",
])

export default async function FormPage({
  params,
}: {
  params: Promise<{ id: string; code: string }>
}) {
  const { id: appId, code } = await params

  if (!VALID_CODES.has(code)) return notFound()

  const title = FORM_TITLES[code]

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Pre-fetch company name for terms_opm and terms_and_conditions forms
  let companyName: string | undefined
  if (code === "terms_opm" || code === "terms_and_conditions") {
    const { data: app } = await admin
      .from("applications")
      .select("companies(legal_name)")
      .eq("id", appId)
      .single()
    const company = (app?.companies as unknown) as { legal_name?: string } | null
    companyName = company?.legal_name ?? undefined
  }

  // Pre-fetch documentId for terms_opm and terms_and_conditions
  let formDocumentId: string | null = null
  let formFileName: string | null = null
  if (code === "terms_and_conditions" || code === "terms_opm") {
    const { data: tmpl } = await admin
      .from("document_templates")
      .select("id")
      .eq("code", code)
      .single()
    if (tmpl) {
      const { data: doc } = await admin
        .from("documents")
        .select("id, file_name")
        .eq("application_id", appId)
        .eq("template_id", tmpl.id)
        .single()
      formDocumentId = doc?.id ?? null
      formFileName = doc?.file_name ?? null
    }
    if (!formDocumentId) return notFound()
  }

  return (
    <div className="p-6 sm:p-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold">{title}</h1>
      </div>
      {code === "complementary_info" && (
        <ComplementaryInfoForm appId={appId} />
      )}
      {code === "beneficial_owner" && (
        <BeneficialOwnerForm appId={appId} />
      )}
      {code === "terms_opm" && formDocumentId && (
        <TermsOpmForm
          appId={appId}
          documentId={formDocumentId}
          initialFileName={formFileName}
          defaultCompanyName={companyName}
        />
      )}
      {code === "terms_and_conditions" && formDocumentId && (
        <TermsAndConditionsForm
          appId={appId}
          documentId={formDocumentId}
          initialFileName={formFileName}
          defaultCompanyName={companyName}
        />
      )}
      {(code === "operational_info" || code === "pf_operational_info") && (
        <OperationalInfoFormLoader appId={appId} code={code} />
      )}
      {code === "amex_cover" && <AmexCoverFormLoader appId={appId} />}
    </div>
  )
}

// Prellenado del cuestionario operativo: respuestas previas (para editar),
// modalidad de la empresa y correo del operador.
async function OperationalInfoFormLoader({
  appId,
  code,
}: {
  appId: string
  code: string
}) {
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: app } = await admin
    .from("applications")
    .select("product_id, companies(terminal_type, operator_email)")
    .eq("id", appId)
    .single()
  const company = (app?.companies as unknown) as {
    terminal_type: string | null
    operator_email: string | null
  } | null

  let initialData: Record<string, string> = {}
  if (company?.terminal_type) initialData.operativa = company.terminal_type
  if (company?.operator_email) initialData.contactEmail = company.operator_email

  // Respuestas previas (si ya lo contestó y quiere corregir)
  const { data: tmpl } = await admin
    .from("document_templates")
    .select("id")
    .eq("code", code)
    .eq("product_id", app?.product_id ?? "")
    .single()
  if (tmpl) {
    const { data: submission } = await admin
      .from("form_submissions")
      .select("form_data")
      .eq("application_id", appId)
      .eq("template_id", tmpl.id)
      .maybeSingle()
    if (submission?.form_data) {
      initialData = { ...initialData, ...(submission.form_data as Record<string, string>) }
    }
  }

  return (
    <OperationalInfoForm appId={appId} templateCode={code} initialData={initialData} />
  )
}

// Prellenado de la carátula AMEX con lo que ya sabemos del expediente
async function AmexCoverFormLoader({ appId }: { appId: string }) {
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: app } = await admin
    .from("applications")
    .select("product_id, companies(legal_name, tax_id, operator_email, phone)")
    .eq("id", appId)
    .single()
  if (!app) return notFound()

  const company = (app.companies as unknown) as {
    legal_name: string | null
    tax_id: string | null
    operator_email: string | null
    phone: string | null
  } | null

  const { data: tmpl } = await admin
    .from("document_templates")
    .select("id")
    .eq("code", "amex_cover")
    .eq("product_id", app.product_id)
    .single()
  if (!tmpl) return notFound()

  const { data: doc } = await admin
    .from("documents")
    .select("id, file_name")
    .eq("application_id", appId)
    .eq("template_id", tmpl.id)
    .single()
  if (!doc) return notFound()

  let initialData: Record<string, string> = {
    razonSocial: company?.legal_name ?? "",
    rfc: company?.tax_id ?? "",
    estCorreo: company?.operator_email ?? "",
    estTelefono: company?.phone ?? "",
  }

  // Si ya la contestó, se recuperan sus respuestas para corregir y regenerar
  const { data: submission } = await admin
    .from("form_submissions")
    .select("form_data")
    .eq("application_id", appId)
    .eq("template_id", tmpl.id)
    .maybeSingle()
  if (submission?.form_data) {
    initialData = { ...initialData, ...(submission.form_data as Record<string, string>) }
  }

  return (
    <AmexCoverForm
      appId={appId}
      documentId={doc.id}
      initialData={initialData}
      initialFileName={doc.file_name}
    />
  )
}
