import { Resend } from "resend"

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

export async function sendEmail({
  to,
  subject,
  html,
  attachments,
  replyTo,
}: {
  to: string
  subject: string
  html: string
  attachments?: { filename: string; content: string }[]
  replyTo?: string
}): Promise<{ error?: string }> {
  if (!resend) return { error: "RESEND_API_KEY no configurado" }

  const from =
    process.env.RESEND_FROM_EMAIL ??
    "Adrián Santibáñez · Payefy <a.santibanez@payefy.me>"

  const { error } = await resend.emails.send({
    from,
    to,
    subject,
    html,
    replyTo: replyTo ?? "a.santibanez@payefy.me",
    ...(attachments?.length
      ? {
          attachments: attachments.map((a) => ({
            filename: a.filename,
            content: a.content,
          })),
        }
      : {}),
  })

  if (error) return { error: (error as { message?: string }).message ?? String(error) }
  return {}
}
