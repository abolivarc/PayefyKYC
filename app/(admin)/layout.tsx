import type { ReactNode } from "react"
import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { AdminSidebar } from "@/components/layout/admin-sidebar"

export const metadata: Metadata = {
  title: { template: "%s | Payefy Equipo", default: "Payefy Equipo — Panel interno" },
  description: "Panel de administración interno de Payefy",
}

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let fullName: string | null = null
  let email = user?.email ?? ""
  let role: string | null = null

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email, role, must_change_password")
      .eq("id", user.id)
      .single()

    if (profile) {
      fullName = profile.full_name
      email = profile.email
      role = profile.role

      // Primer ingreso con contraseña temporal → configurar contraseña.
      // La página vive en el grupo (admin-auth), fuera de este layout: sin loop.
      const mustChange = (profile as unknown as { must_change_password?: boolean })
        .must_change_password
      if (mustChange) redirect("/admin/cambiar-contrasena")
    }
  }

  return (
    <div className="flex min-h-screen admin-shell">
      <AdminSidebar email={email} fullName={fullName} role={role} />
      <main className="flex-1 overflow-auto pt-14 md:pt-0" style={{ background: "var(--admin-bg)" }}>{children}</main>
    </div>
  )
}
