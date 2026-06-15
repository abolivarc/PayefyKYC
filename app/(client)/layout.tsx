import type { ReactNode } from "react"
import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { createClient } from "@/lib/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { Header } from "@/components/layout/header"
import { UserNav } from "@/components/layout/user-nav"

export const metadata: Metadata = {
  title: { template: "%s | PayefyKYC", default: "PayefyKYC — Portal del Cliente" },
  description: "Portal de onboarding KYC para empresas con Payefy",
}

const CURRENT_TERMS_VERSION = "v1-2026"

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

  // ── T&C gate ─────────────────────────────────────────
  // Skip gate on the /terminos page itself to avoid redirect loop
  const hdrs = await headers()
  const pathname = hdrs.get("x-pathname") ?? ""
  const isTerminosPage = pathname.startsWith("/terminos")

  if (user && !isTerminosPage) {
    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const { data: membership } = await admin
      .from("company_users")
      .select("company_id, companies(terms_accepted_at, terms_version)")
      .eq("user_id", user.id)
      .single()

    if (membership) {
      const company = (membership.companies as unknown) as {
        terms_accepted_at: string | null
        terms_version: string | null
      } | null
      const needsTerms =
        !company?.terms_accepted_at ||
        company.terms_version !== CURRENT_TERMS_VERSION

      if (needsTerms) {
        redirect("/terminos")
      }
    }
  }
  // ─────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex flex-col">
      <Header variant="client" userNav={<UserNav email={email} fullName={fullName} />} />
      <main className="flex-1 bg-gray-50">{children}</main>
    </div>
  )
}
