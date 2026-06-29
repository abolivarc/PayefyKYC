import type { ReactNode } from "react"
import { PayefyLogo } from "@/components/layout/payefy-logo"

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-muted flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="bg-card border border-border rounded-lg p-8">
          <div className="flex justify-center mb-8">
            <PayefyLogo size={32} variant="dark" />
          </div>
          {children}
        </div>
        <p className="mt-5 text-center text-xs text-tertiary tracking-wide">
          Portal del Cliente · Payefy
        </p>
      </div>
    </div>
  )
}
