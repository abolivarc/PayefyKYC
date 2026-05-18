import { notFound } from "next/navigation"
import { ComplementaryInfoForm } from "@/components/forms/complementary-info-form"
import { BeneficialOwnerForm } from "@/components/forms/beneficial-owner-form"

const FORM_TITLES: Record<string, string> = {
  complementary_info: "Información complementaria",
  beneficial_owner: "Constancia de Beneficiario Controlador",
}

export default async function FormPage({
  params,
}: {
  params: Promise<{ id: string; code: string }>
}) {
  const { id: appId, code } = await params

  if (code !== "complementary_info" && code !== "beneficial_owner") {
    return notFound()
  }

  const title = FORM_TITLES[code]

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
    </div>
  )
}
