import type { ReactNode } from "react"
import { PayefyLogo } from "@/components/layout/payefy-logo"

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden"
      style={{ background: "linear-gradient(145deg, #004238 0%, #00281f 100%)" }}
    >
      {/* Fondo de puntos que anima lento */}
      <div
        className="bg-dot-pattern absolute inset-0 pointer-events-none"
        style={{ animation: "none" }}
        aria-hidden
      />

      {/* Card con animación de entrada */}
      <div className="animate-login relative z-10 w-full max-w-[400px]">
        <div
          className="overflow-hidden rounded-[22px]"
          style={{
            background: "#fff",
            boxShadow:
              "0 32px 64px rgba(0,0,0,.40), 0 8px 24px rgba(0,0,0,.28), 0 2px 6px rgba(0,0,0,.16)",
          }}
        >
          {/* Cabecera oscura */}
          <div
            className="flex flex-col items-center gap-3 px-8 pt-8 pb-7"
            style={{
              background: "linear-gradient(145deg, #004238 0%, #063a30 100%)",
            }}
          >
            <PayefyLogo size={36} variant="light" />
            <div className="text-center">
              <p
                className="text-xs font-medium tracking-widest uppercase"
                style={{ color: "rgba(168,248,152,.65)" }}
              >
                Portal de Onboarding
              </p>
            </div>
          </div>

          {/* Cuerpo blanco */}
          <div className="px-8 py-7">{children}</div>
        </div>

        <p
          className="mt-5 text-center text-xs tracking-wide"
          style={{ color: "rgba(168,248,152,.35)" }}
        >
          Payefy · KYC
        </p>
      </div>
    </div>
  )
}
