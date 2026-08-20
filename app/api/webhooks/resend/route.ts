import { NextResponse } from "next/server"
import { Resend } from "resend"
import { createClient as createServiceClient } from "@supabase/supabase-js"

export const runtime = "nodejs"

// Webhook de Resend para correos ENTRANTES (email.received).
// Los correos que llegan a la dirección de captura (contacto@buzon.payefy.me,
// alimentada por el grupo contacto@payefy.me) aterrizan aquí y se guardan en
// email_log para la bandeja del super admin (/admin/correos).
//
// El evento trae SOLO metadatos; el cuerpo se recupera después vía API.
// Nunca se acepta un webhook sin verificar la firma.

const esc = (v: string) =>
  v.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[c]!)

function extractAddress(raw: string): string {
  const m = raw.match(/<([^>]+)>/)
  return (m ? m[1] : raw).trim().toLowerCase()
}

export async function POST(req: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET
  if (!secret) {
    console.error("[WEBHOOK RESEND] RESEND_WEBHOOK_SECRET no configurado")
    return NextResponse.json({ error: "no configurado" }, { status: 500 })
  }

  // svix necesita el cuerpo crudo, sin parsear
  const payload = await req.text()
  const svixHeaders = {
    id: req.headers.get("svix-id") ?? "",
    timestamp: req.headers.get("svix-timestamp") ?? "",
    signature: req.headers.get("svix-signature") ?? "",
  }

  const resend = new Resend(process.env.RESEND_API_KEY)
  let event: { type?: string; data?: Record<string, unknown> }
  try {
    event = resend.webhooks.verify({
      payload,
      headers: svixHeaders,
      webhookSecret: secret,
    }) as unknown as { type?: string; data?: Record<string, unknown> }
  } catch {
    return NextResponse.json({ error: "firma inválida" }, { status: 401 })
  }

  if (event.type !== "email.received" || !event.data) {
    return NextResponse.json({ ignored: true })
  }

  const data = event.data as {
    email_id?: string
    from?: string
    to?: string[] | string
    subject?: string
    message_id?: string
    created_at?: string
  }
  const fromEmail = extractAddress(String(data.from ?? ""))
  const toEmail = Array.isArray(data.to) ? data.to.join(", ") : String(data.to ?? "")
  const subject = String(data.subject ?? "(sin asunto)")
  const messageId = data.message_id ? String(data.message_id) : null
  const emailId = data.email_id ? String(data.email_id) : null

  const db = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Idempotencia: Resend reintenta entregas; un entrante por Message-ID
  if (messageId) {
    const { data: existente } = await db
      .from("email_log")
      .select("id")
      .eq("direction", "inbound")
      .eq("message_id", messageId)
      .maybeSingle()
    if (existente) return NextResponse.json({ duplicate: true })
  }

  // ── Ligar remitente → empresa → solicitud más reciente ────────────────
  let applicationId: string | null = null
  try {
    let companyId: string | null = null
    const { data: co } = await db
      .from("companies")
      .select("id")
      .or(`contact_email.ilike.${fromEmail},operator_email.ilike.${fromEmail}`)
      .limit(1)
      .maybeSingle()
    if (co) companyId = (co as { id: string }).id

    if (!companyId) {
      const { data: prof } = await db
        .from("profiles")
        .select("id")
        .ilike("email", fromEmail)
        .maybeSingle()
      if (prof) {
        const { data: cu } = await db
          .from("company_users")
          .select("company_id")
          .eq("user_id", (prof as { id: string }).id)
          .limit(1)
          .maybeSingle()
        if (cu) companyId = (cu as { company_id: string }).company_id
      }
    }

    if (companyId) {
      const { data: app } = await db
        .from("applications")
        .select("id")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
      if (app) applicationId = (app as { id: string }).id
    }
  } catch (e) {
    console.error("[WEBHOOK RESEND] matching error:", e)
  }

  // ── Insert inmediato con metadatos (el cuerpo puede llegar después) ────
  const { data: fila, error: insErr } = await db
    .from("email_log")
    .insert({
      direction: "inbound",
      from_email: fromEmail,
      to_email: toEmail,
      subject,
      html: "<p style='color:#888;font-family:sans-serif'>(cuerpo pendiente de recuperar)</p>",
      message_id: messageId,
      application_id: applicationId,
      status: "received",
      resend_id: emailId,
      raw_meta: event.data,
    })
    .select("id")
    .single()

  if (insErr) {
    // 23505 = otro reintento ganó la carrera del índice único — todo bien
    if (insErr.code === "23505") return NextResponse.json({ duplicate: true })
    console.error("[WEBHOOK RESEND] insert error:", insErr.message)
    return NextResponse.json({ error: "db" }, { status: 500 })
  }

  // ── Recuperar el cuerpo; si falla, la fila queda con placeholder ───────
  if (emailId) {
    try {
      let html: string | null = null
      const { data: full } = await resend.emails.get(emailId)
      const fullBody = full as unknown as { html?: string | null; text?: string | null } | null
      if (fullBody?.html) html = fullBody.html
      else if (fullBody?.text) html = `<pre style="white-space:pre-wrap;font-family:sans-serif">${esc(fullBody.text)}</pre>`

      if (!html) {
        // endpoint de received emails (por si emails.get no cubre entrantes)
        const res = await fetch(`https://api.resend.com/emails/receiving/${emailId}`, {
          headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
        })
        if (res.ok) {
          const j = (await res.json()) as { html?: string | null; text?: string | null }
          if (j.html) html = j.html
          else if (j.text) html = `<pre style="white-space:pre-wrap;font-family:sans-serif">${esc(j.text)}</pre>`
        }
      }

      if (html) {
        await db.from("email_log").update({ html }).eq("id", (fila as { id: string }).id)
      } else {
        await db
          .from("email_log")
          .update({ raw_meta: { ...(event.data as object), body_fetch_error: "sin html ni text" } })
          .eq("id", (fila as { id: string }).id)
      }
    } catch (e) {
      console.error("[WEBHOOK RESEND] body fetch error:", e)
      await db
        .from("email_log")
        .update({ raw_meta: { ...(event.data as object), body_fetch_error: String(e) } })
        .eq("id", (fila as { id: string }).id)
        .then(() => {}, () => {})
    }
  }

  return NextResponse.json({ ok: true })
}
