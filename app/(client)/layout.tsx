import type { ReactNode } from "react"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Header } from "@/components/layout/header"
import { UserNav } from "@/components/layout/user-nav"

export default async function ClientLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name, email")
    .eq("id", user.id)
    .single()

  if (!profile || profile.role !== "client") redirect("/admin/dashboard")

  return (
    <div className="min-h-screen flex flex-col">
      <Header
        userNav={<UserNav email={profile.email} fullName={profile.full_name} />}
      />
      <main className="flex-1">{children}</main>
    </div>
  )
}
