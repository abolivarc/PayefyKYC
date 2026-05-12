import type { ReactNode } from "react"
import { createClient } from "@/lib/supabase/server"
import { Header } from "@/components/layout/header"
import { UserNav } from "@/components/layout/user-nav"

export default async function ClientLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let profileData: { email: string; full_name: string | null } | null = null

  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("id", user.id)
      .single()
    profileData = data
  }

  const email = profileData?.email ?? user?.email ?? ""
  const fullName = profileData?.full_name ?? null

  return (
    <div className="min-h-screen flex flex-col">
      <Header userNav={<UserNav email={email} fullName={fullName} />} />
      <main className="flex-1">{children}</main>
    </div>
  )
}
