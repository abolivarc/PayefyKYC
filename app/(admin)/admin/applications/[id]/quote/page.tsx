import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { ProposalWizard } from "@/components/proposals/proposal-wizard"
import { rateTierOf } from "@/lib/auth/staff"
import type { ProposalData, EntityType, ProductType } from "@/lib/proposals/types"

export const metadata = { title: "Cotizar expediente | Payefy Admin" }

const QUOTE_ROLES = ["super_admin", "onboarding"]

/** person_type del KYC → entityType del generador de propuestas */
function entityFromPerson(personType: string | null | undefined): EntityType | undefined {
  if (personType === "persona_moral") return "moral"
  if (personType === "persona_fisica") return "fisica_actividad_empresarial"
  return undefined
}

/** modalidad de la terminal → producto cotizado */
function productFromTerminal(terminalType: string | null | undefined): ProductType | undefined {
  if (terminalType === "card_present" || terminalType === "both") return "terminales"
  if (terminalType === "ecommerce") return "venta_en_linea"
  if (terminalType === "link_de_pago") return "link_de_pago"
  return undefined
}

export default async function QuoteApplicationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ lead?: string }>
}) {
  const { id: appId } = await params
  const { lead: leadId } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/admin/login")

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data: profile } = await admin.from("profiles").select("role, agent_type").eq("id", user.id).single()
  if (!profile || !QUOTE_ROLES.includes(profile.role as string)) {
    redirect(`/admin/applications/${appId}/review`)
  }

  const { data: app } = await admin
    .from("applications")
    .select("id, companies(legal_name, contact_email, operator_email, person_type, terminal_type, business_activity), products(code)")
    .eq("id", appId)
    .single()
  if (!app) notFound()

  const company = (app.companies as unknown) as {
    legal_name: string
    contact_email: string | null
    operator_email: string | null
    person_type: string | null
    terminal_type: string | null
    business_activity: string | null
  } | null

  // Cotización previa: al recotizar se retoman las tasas ya acordadas
  const { data: quote } = await admin
    .from("application_quotes")
    .select("proposal_data, sent_at")
    .eq("application_id", appId)
    .maybeSingle()

  // Propuesta del generador que se está retomando ("ya le había cotizado")
  const { data: lead } = leadId
    ? await admin
        .from("leads")
        .select("id, business_name, proposal_data, created_at")
        .eq("id", leadId)
        .maybeSingle()
    : { data: null }

  const previo = (quote?.proposal_data ?? {}) as Partial<ProposalData>
  const delLead = (lead?.proposal_data ?? {}) as Partial<ProposalData>

  // Lo que ya sabemos del comercio no se vuelve a teclear; el revisor solo
  // asigna el giro (MCC) y las tasas. Si venimos de una propuesta anterior,
  // sus tasas y su giro entran ya puestos, pero la identidad (nombre y correo)
  // la manda siempre el expediente: el lead trae el nombre comercial y aquí
  // vale la razón social con la que se afilia.
  const initialData: Partial<ProposalData> = {
    proposalType: "general",
    ...delLead,
    businessName: company?.legal_name ?? delLead.businessName ?? "",
    contactName: company?.legal_name ?? delLead.contactName ?? "",
    contactEmail: company?.contact_email ?? company?.operator_email ?? delLead.contactEmail ?? "",
    entityType: entityFromPerson(company?.person_type) ?? delLead.entityType,
    productType: productFromTerminal(company?.terminal_type) ?? delLead.productType,
    // Retomar una propuesta es una decisión explícita: sus tasas ganan sobre
    // lo que hubiera guardado antes en el expediente.
    ...(lead ? {} : previo),
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100%" }}>
      <header style={{ padding: "24px 32px 16px" }}>
        <Link
          href={`/admin/applications/${appId}/review`}
          className="hover:text-[#0F1B2A] transition-colors"
          style={{ fontSize: 13, color: "var(--admin-text-muted, #5A6B7B)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 8 }}
        >
          ← Volver al expediente
        </Link>
        <h1 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 800, letterSpacing: "-.02em", lineHeight: 1.1, color: "var(--admin-text, #0F1B2A)" }}>
          Cotizar · {company?.legal_name ?? "Comercio"}
        </h1>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--admin-text-muted, #5A6B7B)" }}>
          {company?.business_activity
            ? <>Giro declarado por el comercio: <strong>{company.business_activity}</strong>. Asígnale el MCC que le corresponde y sus tasas.</>
            : "Asigna el MCC que le corresponde al comercio y configura sus tasas."}
          {quote?.sent_at && " · Ya se le envió una propuesta antes; al enviar de nuevo se reemplaza."}
        </p>
        {lead && (
          <p style={{ margin: "8px 0 0", padding: "8px 12px", borderRadius: 8, background: "#F0FDF4", border: "1px solid #BBF7D0", fontSize: 12.5, color: "#166534", display: "inline-block" }}>
            Retomando la propuesta de <strong>{lead.business_name as string}</strong> del{" "}
            {new Date(lead.created_at as string).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })}.
            Las tasas ya vienen puestas; al guardar, esa propuesta queda vinculada a este comercio.
          </p>
        )}
      </header>
      <div style={{ padding: "8px 32px 32px" }}>
        <ProposalWizard
          initialData={initialData}
          applicationId={appId}
          companyName={company?.legal_name ?? undefined}
          fromLeadId={lead ? (lead.id as string) : undefined}
          tier={rateTierOf(profile.agent_type as string | null)}
        />
      </div>
    </div>
  )
}
