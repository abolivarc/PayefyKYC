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

  // La puerta de Términos y Condiciones vive en el middleware: un redirect()
  // lanzado desde un layout deja la página en blanco en navegaciones suaves.

  return (
    <div className="min-h-screen flex flex-col">
      <Header variant="client" userNav={<UserNav email={email} fullName={fullName} />} />
      <main className="flex-1" style={{ background: "#F3F7F4" }}>{children}</main>
    </div>
  )
}
