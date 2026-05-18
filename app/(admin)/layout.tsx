import type { ReactNode } from "react"
import { createClient } from "@/lib/supabase/server"
import { AdminSidebar } from "@/components/layout/admin-sidebar"

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let fullName: string | null = null
  let email = user?.email ?? ""

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", user.id)
      .single()

    if (profile) {
      fullName = profile.full_name
      email = profile.email
    }
  }

  return (
    <div className="flex min-h-screen">
      <AdminSidebar email={email} fullName={fullName} />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
