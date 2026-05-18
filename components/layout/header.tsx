import type { ReactNode } from "react"
import { PayefyLogo } from "./payefy-logo"

interface HeaderProps {
  userNav: ReactNode
  variant?: "client" | "admin"
}

export function Header({ userNav, variant = "client" }: HeaderProps) {
  if (variant === "client") {
    return (
      <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white">
        <div className="flex h-14 items-center px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <PayefyLogo size={32} />
            <div className="leading-none">
              <p className="font-semibold text-slate-900 text-sm">PayefyKYC</p>
              <p className="text-xs text-slate-500 mt-0.5">Portal del Cliente</p>
            </div>
          </div>
          <div className="ml-auto">{userNav}</div>
        </div>
      </header>
    )
  }

  // variant === "admin" — usado solo por layouts que no usen AdminSidebar directamente
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background">
      <div className="flex h-14 items-center px-4 sm:px-6">
        <div className="text-xl font-semibold">Payefy Equipo</div>
        <div className="ml-auto">{userNav}</div>
      </div>
    </header>
  )
}
