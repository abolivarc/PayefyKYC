import type { Metadata } from "next"
import { TermsContent } from "@/components/legal/terms-content"
import { SiteFooter } from "@/components/layout/site-footer"

export const metadata: Metadata = {
  title: "Términos y Condiciones | Payefy",
  description:
    "Términos y Condiciones de uso de la plataforma de onboarding de Payefy, S.A.P.I. de C.V.",
}

/**
 * Versión pública (sin sesión) de los Términos y Condiciones.
 * La puerta de aceptación para clientes vive en /terminos (portal).
 */
export default function PublicTermsPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center py-10 px-4">
      <main className="w-full max-w-3xl bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <TermsContent />
      </main>
      <SiteFooter variant="light" className="mt-8" />
    </div>
  )
}
