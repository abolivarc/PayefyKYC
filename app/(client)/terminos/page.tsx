import type { Metadata } from "next"
import { TermsContent } from "@/components/legal/terms-content"
import { TermsAcceptanceForm } from "./terms-form"

export const metadata: Metadata = {
  title: "Términos y Condiciones | Payefy",
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-start justify-center py-10 px-4">
      <div className="w-full max-w-3xl bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <TermsContent />

        {/* Acceptance form */}
        <div className="px-8 pb-8">
          <TermsAcceptanceForm />
        </div>
      </div>
    </div>
  )
}
