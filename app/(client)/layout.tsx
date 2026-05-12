import type { ReactNode } from "react"
import { createClient } from "@/lib/supabase/server"
import { Header } from "@/components/layout/header"
import { UserNav } from "@/components/layout/user-nav"

export default async function ClientLayout({ children }: { children: ReactNode }) {
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
    <div className="min-h-screen flex flex-col">
      <Header userNav={<UserNav email={email} fullName={fullName} />} />
      <main className="flex-1">{children}</main>
    </div>
  )
}
