import type { ReactNode } from "react"
import type { Metadata } from "next"
import { createClient } from "@/lib/supabase/server"
import { Header } from "@/components/layout/header"
import { UserNav } from "@/components/layout/user-nav"

export const metadata: Metadata = {
  title: { template: "%s | PayefyKYC", default: "PayefyKYC — Portal del Cliente" },
  description: "Portal de onboarding KYC para empresas con Payefy",
}

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
      <Header variant="client" userNav={<UserNav email={email} fullName={fullName} />} />
      {/* Barra de bienvenida sutil */}
      <div className="hidden sm:block bg-slate-50 border-b border-slate-100 py-1 px-6">
        <p className="text-xs text-slate-500">
          Bienvenido al portal de onboarding KYC de Payefy
        </p>
      </div>
      <main className="flex-1 bg-slate-50">{children}</main>
    </div>
  )
}
