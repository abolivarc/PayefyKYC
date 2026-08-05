"use server"

import * as Sentry from "@sentry/nextjs"
import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { sendEmail } from "@/lib/email/send"
import { bundleExpediente } from "@/lib/email/bundle-expediente"
import {
  emailExpedienteToTransfer,
  emailRequestDocsToClient,
  emailContractToClient,
} from "@/lib/email/templates"

export type EmailTemplateKey =
  | "expediente_to_transfer"
  | "request_docs_to_client"
  | "contract_to_client"

export async function sendExpedienteEmail({
  applicationId,
  templateKey,
  toEmail,
  customMessage,
  attachExpediente,
  contractName,
  signingUrl,
}: {
  applicationId: string
  templateKey: EmailTemplateKey
  toEmail: string
  customMessage?: string
  attachExpediente?: boolean
  contractName?: string
  signingUrl?: string
}): Promise<{ error?: string; success?: true }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "No autenticado" }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Fetch application + company info
  const { data: app, error: appErr } = await admin
    .from("applications")
    .select(
      `id, transfer_status, company_id,
       companies(legal_name, company_users(profiles(full_name, email))),
       products(name)`
    )
    .eq("id", applicationId)
    .single()

  if (appErr || !app) return { error: appErr?.message ?? "Solicitud no encontrada" }

  type CompanyRow = { legal_name: string; company_users: { profiles: { full_name: string; email: string } }[] }
  const companyRow = (app.companies as unknown as CompanyRow | null)
  const companyName = companyRow?.legal_name ?? ""
  const productName = (app.products as unknown as { name: string } | null)?.name ?? ""
  const clientProfile = companyRow?.company_users?.[0]?.profiles
  const clientName = clientProfile?.full_name ?? ""
  const clientEmail = clientProfile?.email ?? ""

  // Build HTML and subject
  let html = ""
  let subject = ""

  if (templateKey === "expediente_to_transfer") {
    subject = `Expediente KYC — ${companyName} (${productName})`
    html = emailExpedienteToTransfer({ companyName, productName, customMessage })
  } else if (templateKey === "request_docs_to_client") {
    subject = `Acción requerida en tu expediente — ${companyName}`
    html = emailRequestDocsToClient({
      companyName,
      clientName,
      notes: customMessage ?? "",
      applicationUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/applications/${applicationId}/documents`,
    })
  } else if (templateKey === "contract_to_client") {
    subject = `Tu contrato está listo — ${contractName ?? "Contrato"}`
    html = emailContractToClient({
      companyName,
      clientName,
      contractName: contractName ?? "Contrato",
      signingUrl,
      customMessage,
    })
  }

  // Resolve final recipient
  const finalTo = toEmail || clientEmail
  if (!finalTo) return { error: "No se encontró destinatario" }

  // Bundle expediente if requested
  let attachments: { filename: string; content: string }[] | undefined
  if (attachExpediente) {
    try {
      const bundle = await bundleExpediente(applicationId)
      attachments = [{ filename: bundle.filename, content: bundle.base64 }]
    } catch (e) {
      Sentry.captureException(e, { extra: { applicationId, templateKey } })
      return { error: `Error al generar ZIP: ${(e as Error).message}` }
    }
  }

  const { error: sendErr } = await sendEmail({ to: finalTo, subject, html, attachments })
  if (sendErr) {
    Sentry.captureMessage(`Email send failed: ${sendErr}`, { extra: { applicationId, templateKey, to: finalTo } })
    return { error: sendErr }
  }

  // Record in bitácora
  const templateLabels: Record<EmailTemplateKey, string> = {
    expediente_to_transfer: "Expediente enviado a Transfer",
    request_docs_to_client: "Solicitud de documentos enviada al cliente",
    contract_to_client: "Contrato enviado al cliente",
  }

  await admin.from("application_comments").insert({
    application_id: applicationId,
    author_id: user.id,
    body: `${templateLabels[templateKey]} → ${finalTo}${attachExpediente ? " (con ZIP)" : ""}${customMessage ? `\n${customMessage}` : ""}`,
    kind: "email_sent",
    metadata: { template: templateKey, to: finalTo, attach_expediente: attachExpediente ?? false },
  })

  // Update transfer_status when sending to transfer
  if (templateKey === "expediente_to_transfer") {
    await admin
      .from("applications")
      .update({ transfer_status: "sent", transfer_sent_at: new Date().toISOString(), transfer_recipient_email: finalTo })
      .eq("id", applicationId)
  }

  revalidatePath("/admin/tracking")
  return { success: true }
}
