import type { ReactNode } from "react"
import type { Metadata } from "next"
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
      .select("full_name, email, role")
      .eq("id", user.id)
      .single()

    if (profile) {
      fullName = profile.full_name
      email = profile.email
      role = profile.role
    }
  }

  return (
    <div className="flex min-h-screen">
      <AdminSidebar email={email} fullName={fullName} role={role} />
      <main className="flex-1 overflow-auto bg-slate-50">{children}</main>
    </div>
  )
}
