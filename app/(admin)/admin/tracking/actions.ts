"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { sendEmail } from "@/lib/email/send"

export type ContractKind =
  | "payefy_service"
  | "transfer_increase_letter"
  | "transfer_contract"

export type ContractStatus = "pending" | "sent" | "signed" | "not_applicable"

export async function upsertContract({
  applicationId,
  kind,
  status,
  externalLink,
  signedDocPath,
}: {
  applicationId: string
  kind: ContractKind
  status: ContractStatus
  externalLink?: string
  signedDocPath?: string
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "No autenticado" }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const now = new Date().toISOString()
  const updateData: Record<string, unknown> = { status, updated_at: now }
  if (externalLink !== undefined) updateData.external_link = externalLink
  if (signedDocPath !== undefined) updateData.signed_doc_path = signedDocPath
  if (status === "sent") updateData.sent_at = now
  if (status === "signed") updateData.signed_at = now

  const { error } = await admin
    .from("application_contracts")
    .upsert(
      { application_id: applicationId, kind, ...updateData },
      { onConflict: "application_id,kind" }
    )

  if (error) return { error: error.message }

  const kindLabels: Record<ContractKind, string> = {
    payefy_service: "Contrato Payefy",
    transfer_increase_letter: "Carta aumento Transfer",
    transfer_contract: "Contrato Transfer",
  }
  const statusLabels: Record<ContractStatus, string> = {
    pending: "pendiente",
    sent: "enviado",
    signed: "firmado",
    not_applicable: "no aplica",
  }

  await admin.from("application_comments").insert({
    application_id: applicationId,
    author_id: user.id,
    body: `${kindLabels[kind]} marcado como ${statusLabels[status]}${externalLink ? ` — ${externalLink}` : ""}`,
    kind: "status",
    metadata: { contract_kind: kind, contract_status: status, external_link: externalLink ?? null },
  })

  revalidatePath("/admin/tracking")
  revalidatePath(`/admin/applications/${applicationId}/review`)
  return { success: true }
}

// ── Product Orders (B5) ─────────────────────────────────────────────────────

export async function sendOrderInvoice({
  orderId,
  clientEmail,
  invoiceBase64,
  invoiceFilename,
}: {
  orderId: string
  clientEmail: string
  invoiceBase64?: string
  invoiceFilename?: string
}): Promise<{ error?: string; success?: true }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "No autenticado" }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: order } = await admin
    .from("product_orders")
    .select("id, company_id, application_id, product_code, quantity, shipping_address, companies(legal_name)")
    .eq("id", orderId)
    .single()

  if (!order) return { error: "Pedido no encontrado" }

  const companyName = (order.companies as unknown as { legal_name: string } | null)?.legal_name ?? "Cliente"

  const attachments = invoiceBase64 && invoiceFilename
    ? [{ filename: invoiceFilename, content: invoiceBase64 }]
    : undefined

  const { error: sendErr } = await sendEmail({
    to: clientEmail,
    subject: `Factura de tu pedido — ${companyName}`,
    html: `
      <p>Hola,</p>
      <p>Adjuntamos la factura correspondiente a tu pedido de <strong>${order.quantity} unidad(es)</strong> de <strong>${order.product_code}</strong>.</p>
      <p>Dirección de envío registrada: ${order.shipping_address}</p>
      <p>Si tienes alguna pregunta, responde a este correo.</p>
      <p>Equipo Payefy</p>
    `,
    attachments,
  })

  if (sendErr) return { error: sendErr }

  await admin
    .from("product_orders")
    .update({ status: "invoiced" })
    .eq("id", orderId)

  if (order.application_id) {
    await admin.from("application_comments").insert({
      application_id: order.application_id,
      author_id: user.id,
      body: `Factura enviada a ${clientEmail} para pedido ${orderId.slice(0, 8)}`,
      kind: "email_sent",
      metadata: { order_id: orderId, to: clientEmail },
    })
  }

  revalidatePath("/admin/tracking/orders")
  return { success: true }
}

export async function updateOrderStatus(
  orderId: string,
  newStatus: "shipped" | "closed"
): Promise<{ error?: string; success?: true }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "No autenticado" }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: order } = await admin
    .from("product_orders")
    .select("id, status, application_id")
    .eq("id", orderId)
    .single()

  if (!order) return { error: "Pedido no encontrado" }

  const allowed: Record<string, string> = { invoiced: "shipped", shipped: "closed" }
  if (allowed[order.status] !== newStatus) {
    return { error: `Transición no válida: ${order.status} → ${newStatus}` }
  }

  const { error } = await admin
    .from("product_orders")
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq("id", orderId)

  if (error) return { error: error.message }

  if (order.application_id) {
    const labels: Record<string, string> = { shipped: "Pedido marcado como enviado", closed: "Pedido cerrado" }
    await admin.from("application_comments").insert({
      application_id: order.application_id,
      author_id: user.id,
      body: labels[newStatus] ?? newStatus,
      kind: "status",
      metadata: { order_id: orderId, new_status: newStatus },
    })
  }

  revalidatePath("/admin/tracking/orders")
  return { success: true }
}
