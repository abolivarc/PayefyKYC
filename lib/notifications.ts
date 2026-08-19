import { createClient as createServiceClient } from "@supabase/supabase-js"
import { Resend } from "resend"
import { logEmail } from "@/lib/email/send"

export async function createNotification({
  recipientId,
  type,
  title,
  message,
  relatedApplicationId,
  relatedDocumentId,
  emailTo,
  emailSubject,
  emailHtml,
  imageUrls,
}: {
  recipientId: string
  type: string
  title: string
  message: string
  relatedApplicationId?: string
  relatedDocumentId?: string
  emailTo?: string
  emailSubject?: string
  emailHtml?: string
  /** URLs firmadas de capturas adjuntas (solicitudes de cambios) */
  imageUrls?: string[]
}) {
  const supabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  let emailSent = false
  if (emailTo && emailSubject && emailHtml && process.env.RESEND_API_KEY) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY)
      const { data } = await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL ?? "onboarding@payefy.com.mx",
        to: emailTo,
        subject: emailSubject,
        html: emailHtml,
      })
      emailSent = true
      await logEmail({
        to: emailTo, subject: emailSubject, html: emailHtml,
        applicationId: relatedApplicationId ?? null, resendId: data?.id ?? null,
      })
    } catch {
      // No bloquear el flujo si el correo falla
      await logEmail({
        to: emailTo, subject: emailSubject, html: emailHtml,
        applicationId: relatedApplicationId ?? null, status: "error", error: "excepción al enviar",
      })
    }
  }

  await supabase.from("notifications").insert({
    recipient_id: recipientId,
    type,
    title,
    message,
    related_application_id: relatedApplicationId ?? null,
    related_document_id: relatedDocumentId ?? null,
    image_urls: imageUrls?.length ? imageUrls : null,
    email_sent: emailSent,
    email_sent_at: emailSent ? new Date().toISOString() : null,
  })
}
