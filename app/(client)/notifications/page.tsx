import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { NotificationsInbox } from "@/components/client/notifications-inbox"

export const metadata = { title: "Notificaciones | Payefy" }

export default async function NotificationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: notifications } = await supabase
    .from("notifications")
    .select("id, type, title, message, image_urls, is_read, created_at, related_application_id")
    .eq("recipient_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100)

  return (
    <div style={{ background: "#F4F8F6", minHeight: "100vh" }}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "24px 24px 64px" }}>
        <h1
          style={{
            margin: "0 0 4px",
            fontFamily: "var(--font-display)",
            fontSize: 22,
            fontWeight: 800,
            letterSpacing: "-.02em",
            color: "#0F1B2A",
          }}
        >
          Notificaciones
        </h1>
        <p style={{ margin: "0 0 24px", fontSize: 13, color: "#5A6B7B" }}>
          Actualizaciones sobre tu expediente y solicitudes
        </p>
        <NotificationsInbox initialItems={notifications ?? []} />
      </div>
    </div>
  )
}
