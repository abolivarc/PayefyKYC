import type { ReactNode } from "react"
import Image from "next/image"

export default function AdminAuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{ background: "#004238" }}>
      <div className="w-full max-w-[400px] rounded-xl shadow-xl p-8" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}>
        <div className="flex flex-col items-center gap-2 mb-6">
          <Image src="/payefy-mark-light.png" alt="Payefy" width={48} height={48} style={{ height: 48, width: "auto" }} priority />
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white">Portal interno Payefy</h1>
            <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.5)" }}>Acceso exclusivo para empleados</p>
          </div>
        </div>
        {children}
      </div>
    </div>
  )
}
