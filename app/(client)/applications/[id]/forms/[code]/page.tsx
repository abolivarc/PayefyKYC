import { notFound } from "next/navigation"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { ComplementaryInfoForm } from "@/components/forms/complementary-info-form"
import { BeneficialOwnerForm } from "@/components/forms/beneficial-owner-form"
import { TermsOpmForm } from "@/components/forms/terms-opm-form"

const FORM_TITLES: Record<string, string> = {
  complementary_info: "Información complementaria",
  beneficial_owner: "Constancia de Beneficiario Controlador",
  terms_opm: "Términos y Condiciones OPM",
}

const VALID_CODES = new Set(["complementary_info", "beneficial_owner", "terms_opm"])

export default async function FormPage({
  params,
}: {
  params: Promise<{ id: string; code: string }>
}) {
  const { id: appId, code } = await params

  if (!VALID_CODES.has(code)) return notFound()

  const title = FORM_TITLES[code]

  // Pre-fetch company name for terms_opm form
  let companyName: string | undefined
  if (code === "terms_opm") {
    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const { data: app } = await admin
      .from("applications")
      .select("companies(legal_name)")
      .eq("id", appId)
      .single()
    const company = (app?.companies as unknown) as { legal_name?: string } | null
    companyName = company?.legal_name ?? undefined
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
      {code === "terms_opm" && (
        <TermsOpmForm appId={appId} defaultCompanyName={companyName} />
      )}
    </div>
  )
}
