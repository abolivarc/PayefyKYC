import { notFound } from "next/navigation"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { ComplementaryInfoForm } from "@/components/forms/complementary-info-form"
import { BeneficialOwnerForm } from "@/components/forms/beneficial-owner-form"
import { TermsOpmForm } from "@/components/forms/terms-opm-form"
import { TermsAndConditionsForm } from "@/components/forms/terms-and-conditions-form"

const FORM_TITLES: Record<string, string> = {
  complementary_info: "Información complementaria",
  beneficial_owner: "Constancia de Beneficiario Controlador",
  terms_opm: "Términos y Condiciones OPM",
  terms_and_conditions: "Términos y condiciones firmados",
}

const VALID_CODES = new Set(["complementary_info", "beneficial_owner", "terms_opm", "terms_and_conditions"])

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
    </div>
  )
}
