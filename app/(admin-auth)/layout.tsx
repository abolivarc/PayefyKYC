import type { ReactNode } from "react"
import { PayefyLogo } from "@/components/layout/payefy-logo"

export default function AdminAuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-[400px] bg-slate-800 rounded-xl border border-slate-700 shadow-lg p-8">
        <div className="flex flex-col items-center gap-2 mb-6">
          <PayefyLogo size={40} />
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white">Portal interno Payefy</h1>
            <p className="text-xs text-slate-400 mt-0.5">Acceso exclusivo para empleados</p>
          </div>
        </div>
        {children}
      </div>
    </div>
  )
}
