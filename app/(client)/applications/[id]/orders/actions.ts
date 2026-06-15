"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { sendEmail } from "@/lib/email/send"

export async function createProductOrder({
  applicationId,
  companyId,
  productCode,
  quantity,
  shippingAddress,
  notes,
}: {
  applicationId: string
  companyId: string
  productCode: string
  quantity: number
  shippingAddress: string
  notes?: string
}): Promise<{ error?: string; success?: true }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "No autenticado" }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Verify user belongs to this company
  const { data: membership } = await admin
    .from("company_users")
    .select("id")
    .eq("company_id", companyId)
    .eq("user_id", user.id)
    .single()
  if (!membership) return { error: "Sin acceso a esta empresa" }

  // Verify application is activated
  const { data: app } = await admin
    .from("applications")
    .select("status, companies(legal_name), products(name)")
    .eq("id", applicationId)
    .single()
  if (!app || app.status !== "activated") {
    return { error: "Solo puedes solicitar cuando tu solicitud esté activada" }
  }

  const { error: insertErr } = await admin.from("product_orders").insert({
    company_id: companyId,
    application_id: applicationId,
    product_code: productCode,
    quantity,
    shipping_address: shippingAddress,
    notes: notes ?? null,
    status: "requested",
  })
  if (insertErr) return { error: insertErr.message }

  // Internal notification email
  const { data: profile } = await admin
    .from("profiles")
    .select("email, full_name")
    .eq("id", user.id)
    .single()

  const companyName = (app.companies as unknown as { legal_name: string } | null)?.legal_name ?? ""
  const productName = (app.products as unknown as { name: string } | null)?.name ?? productCode

  if (process.env.RESEND_API_KEY) {
    await sendEmail({
      to: "a.santibanez@payefy.me",
      subject: `[Pedido] ${companyName} — ${quantity}x ${productName}`,
      html: `
        <p><strong>${companyName}</strong> ha solicitado <strong>${quantity} unidad(es)</strong> de <strong>${productName}</strong>.</p>
        <p><strong>Dirección de envío:</strong> ${shippingAddress}</p>
        ${notes ? `<p><strong>Notas:</strong> ${notes}</p>` : ""}
        <p><strong>Solicitado por:</strong> ${profile?.full_name ?? "—"} (${profile?.email ?? "—"})</p>
      `,
    }).catch(() => {})
  }

  revalidatePath(`/applications/${applicationId}/status`)
  return { success: true }
}
