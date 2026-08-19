import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { MailInbox } from "@/components/admin/mail-inbox"

export const metadata = { title: "Correos | Payefy Admin" }

/**
 * Bandeja unificada de correos del sistema — SOLO super admin.
 * Muestra todo lo que la plataforma envió: a clientes, a Elizabeth, a
 * Francisco… aunque Alejandro no haya venido en copia.
 */
export default async function CorreosPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/admin/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()
  if (profile?.role !== "super_admin") redirect("/admin/dashboard")

  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: rows } = await admin
    .from("email_log")
    .select("id, sent_at, to_email, subject, status, error, application_id, applications(companies(legal_name, internal_alias))")
    .order("sent_at", { ascending: false })
    .limit(400)

  const mails = ((rows ?? []) as unknown as {
    id: string
    sent_at: string
    to_email: string
    subject: string
    status: string
    error: string | null
    application_id: string | null
    applications: { companies: { legal_name: string; internal_alias: string | null } | null } | null
  }[]).map((r) => ({
    id: r.id,
    sentAt: r.sent_at,
    to: r.to_email,
    subject: r.subject,
    status: r.status,
    error: r.error,
    applicationId: r.application_id,
    company: r.applications?.companies?.internal_alias || r.applications?.companies?.legal_name || null,
  }))

  return (
    <div style={{ padding: "24px 32px 40px" }}>
      <header style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "var(--admin-text, #0F2A22)" }}>
          Correos del sistema
        </h1>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--admin-text-muted, #5B7168)" }}>
          Todo lo que la plataforma envía — a clientes y al equipo — aunque no vengas
          en copia. Solo tú ves esta bandeja. Se registra desde el 19&nbsp;ago&nbsp;2026;
          las respuestas que la gente escribe desde su propio correo no pasan por aquí.
        </p>
      </header>
      <MailInbox mails={mails} />
    </div>
  )
}
