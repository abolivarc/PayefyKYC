import type { ReactNode } from "react"

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-[400px] bg-white rounded-xl border shadow p-8">
        <h1 className="text-2xl font-bold text-center mb-1">PayefyKYC</h1>
        {children}
      </div>
    </div>
  )
}
