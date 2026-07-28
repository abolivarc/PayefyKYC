import { redirect } from "next/navigation"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { getStaffContext } from "@/lib/auth/staff"
import { StaffUsersPanel, type StaffRow } from "@/components/admin/staff-users-panel"

export const metadata = { title: "Usuarios | Payefy Admin" }

export default async function UsuariosPage() {
  const ctx = await getStaffContext()
  if (!ctx) redirect("/admin/login")
  // Solo super_admin administra al equipo
  if (!ctx.isSuperAdmin) redirect("/admin/dashboard")

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: users } = await admin
    .from("profiles")
    .select("id, email, full_name, role, is_active, must_change_password, created_at")
    .neq("role", "client")
    .order("created_at", { ascending: true })

  const rows = (users ?? []) as unknown as StaffRow[]
  const agentes = rows.filter((u) => u.role === "sales_agent").length

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100%" }}>
      <header style={{ padding: "24px 32px 16px" }}>
        <h1 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 800, letterSpacing: "-.02em", lineHeight: 1.1, color: "var(--admin-text, #0F1B2A)" }}>
          Usuarios del equipo
        </h1>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--admin-text-muted, #5A6B7B)" }}>
          <b style={{ color: "var(--admin-text, #0F1B2A)", fontWeight: 600 }}>{rows.length}</b>{" "}
          cuenta(s) internas · {agentes} agente(s) comercial(es)
        </p>
      </header>
      <div style={{ padding: "0 32px 40px" }}>
        <StaffUsersPanel users={rows} currentUserId={ctx.userId} />
      </div>
    </div>
  )
}
