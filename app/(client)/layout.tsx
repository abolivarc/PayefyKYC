import type { ReactNode } from "react"
import type { Metadata } from "next"
import { createClient } from "@/lib/supabase/server"
import { Header } from "@/components/layout/header"
import { UserNav } from "@/components/layout/user-nav"
import { SiteFooter } from "@/components/layout/site-footer"

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
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-2 focus:left-2
          focus:bg-white focus:text-slate-900 focus:px-4 focus:py-2 focus:rounded-lg focus:shadow-lg"
      >
        Saltar al contenido
      </a>
      <Header variant="client" userNav={<UserNav email={email} fullName={fullName} />} />
      <main id="contenido" className="flex-1" style={{ background: "#F3F7F4" }}>
        {children}
      </main>
      <div className="py-6" style={{ background: "#F3F7F4" }}>
        <SiteFooter variant="light" />
      </div>
    </div>
  )
}
