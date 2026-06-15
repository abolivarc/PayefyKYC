"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { Resend } from "resend"
import { emailLeadInvite } from "@/lib/email/templates"

export async function createLead(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/admin/login")

  const legalName = (formData.get("legal_name") as string)?.trim()
  const taxId = ((formData.get("tax_id") as string) || "").toUpperCase().trim() || null
  const contactEmail = (formData.get("contact_email") as string)?.trim()
  const productCode = formData.get("product_code") as string
  const assignedAgentId = (formData.get("assigned_agent_id") as string) || null

  if (!legalName || !contactEmail || !productCode) {
    return { error: "Razón social, correo y producto son requeridos." }
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  const admin = createAdminClient(url, key)

  // 1. Crear la empresa en estado lead
  const { data: company, error: companyErr } = await admin
    .from("companies")
    .insert({
      legal_name: legalName,
      tax_id: taxId,
      contact_email: contactEmail,
      lead_product_code: productCode,
      assigned_agent_id: assignedAgentId ?? user.id,
      created_by: user.id,
      status: "lead",
      lead_invited_at: new Date().toISOString(),
    })
    .select("id")
    .single()

  if (companyErr || !company) {
    return { error: "Error al crear el lead: " + companyErr?.message }
  }

  // 2. Obtener nombre del agente para el correo
  const { data: agentProfile } = await admin
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single()

  // 3. Obtener nombre del producto
  const { data: product } = await admin
    .from("products")
    .select("name")
    .eq("code", productCode)
    .single()

  // 4. Generar invite link (sin enviar correo de Supabase)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://payefy-kyc.vercel.app"
  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type: "invite",
    email: contactEmail,
    options: {
      redirectTo: `${appUrl}/auth/callback`,
      data: {
        role: "client",
        company_id: company.id,
      },
    },
  })

  if (linkErr || !linkData?.properties?.action_link) {
    // Rollback: eliminar empresa creada
    await admin.from("companies").delete().eq("id", company.id)
    return { error: "Error al generar enlace de invitación: " + linkErr?.message }
  }

  // 5. Enviar correo personalizado con Resend
  if (process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY)
    await resend.emails
      .send({
        from: process.env.RESEND_FROM_EMAIL ?? "onboarding@payefy.com.mx",
        to: contactEmail,
        subject: `Invitación para completar tu KYC con Payefy — ${legalName}`,
        html: emailLeadInvite({
          companyName: legalName,
          agentName: agentProfile?.full_name ?? "El equipo Payefy",
          productName: product?.name ?? productCode,
          inviteUrl: linkData.properties.action_link,
        }),
      })
      .catch(() => {})
  }

  revalidatePath("/admin/leads")
  return { success: true }
}
