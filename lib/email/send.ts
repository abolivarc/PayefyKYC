import { Resend } from "resend"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { ADMIN_EMAILS, PRIMARY_ADMIN_EMAIL } from "./recipients"

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

/**
 * Bitácora de correos: TODO lo que la plataforma envía queda registrado con
 * su cuerpo exacto, para la bandeja unificada del super admin
 * (/admin/correos). Nunca bloquea el envío: si el log falla, el correo salió.
 */
export async function logEmail(entry: {
  to: string
  subject: string
  html: string
  applicationId?: string | null
  resendId?: string | null
  status?: "sent" | "error"
  error?: string | null
}) {
  try {
    const db = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    await db.from("email_log").insert({
      to_email: entry.to,
      subject: entry.subject,
      html: entry.html,
      application_id: entry.applicationId ?? null,
      resend_id: entry.resendId ?? null,
      status: entry.status ?? "sent",
      error: entry.error ?? null,
    })
  } catch (e) {
    console.error("[EMAIL LOG] no se pudo registrar:", e)
  }
}

export async function sendEmail({
  to,
  subject,
  html,
  attachments,
  replyTo,
  applicationId,
}: {
  to: string | string[]
  subject: string
  html: string
  attachments?: { filename: string; content: string }[]
  replyTo?: string
  /** Si el correo pertenece a una solicitud, se liga en la bandeja */
  applicationId?: string | null
}): Promise<{ error?: string }> {
  if (!resend) return { error: "RESEND_API_KEY no configurado" }

  const from =
    process.env.RESEND_FROM_EMAIL ??
    `Adrián Santibáñez · Payefy <${PRIMARY_ADMIN_EMAIL}>`
  const toLog = Array.isArray(to) ? to.join(", ") : to

  const { data, error } = await resend.emails.send({
    from,
    to,
    subject,
    html,
    // Las respuestas llegan a todos los administradores y, con
    // INBOUND_CAPTURE_EMAIL configurado, también a la bandeja de /admin/correos
    // (los admins primero: clientes de correo viejos pueden ignorar las últimas).
    replyTo:
      replyTo ??
      (process.env.INBOUND_CAPTURE_EMAIL
        ? [...ADMIN_EMAILS, process.env.INBOUND_CAPTURE_EMAIL]
        : ADMIN_EMAILS),
    ...(attachments?.length
      ? {
          attachments: attachments.map((a) => ({
            filename: a.filename,
            content: a.content,
          })),
        }
      : {}),
  })

  if (error) {
    const msg = (error as { message?: string }).message ?? String(error)
    await logEmail({ to: toLog, subject, html, applicationId, status: "error", error: msg })
    return { error: msg }
  }

  await logEmail({ to: toLog, subject, html, applicationId, resendId: data?.id ?? null })
  return {}
}
