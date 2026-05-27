import type { ReactNode } from "react"
import { PayefyLogo } from "@/components/layout/payefy-logo"

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50/30 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-[400px] bg-white rounded-xl border border-slate-200 shadow-sm p-8">
        {/* Logo + título */}
        <div className="flex flex-col items-center gap-2 mb-6">
          <PayefyLogo size={40} />
          <div className="text-center">
            <h1 className="text-2xl font-bold text-slate-900">PayefyKYC</h1>
            <p className="text-xs text-slate-500 mt-0.5">Portal de Onboarding</p>
          </div>
        </div>
        {children}
      </div>
    </div>
  )
}
