import type { ReactNode } from "react"
import { PayefyLogo } from "./payefy-logo"

interface HeaderProps {
  userNav: ReactNode
  variant?: "client" | "admin"
}

export function Header({ userNav, variant = "client" }: HeaderProps) {
  if (variant === "client") {
    return (
      <header className="sticky top-0 z-50 w-full border-b border-gray-100 bg-white">
        <div className="flex h-14 items-center px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <PayefyLogo size={30} />
            <div className="leading-none">
              <p className="font-bold text-sm" style={{ color: "#004238", letterSpacing: "-.3px" }}>payefy</p>
              <p className="text-xs text-gray-400 mt-0.5">Portal del Cliente</p>
            </div>
          </div>
          <div className="ml-auto">{userNav}</div>
        </div>
      </header>
    )
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background">
      <div className="flex h-14 items-center px-4 sm:px-6">
        <div className="text-xl font-semibold">Payefy Equipo</div>
        <div className="ml-auto">{userNav}</div>
      </div>
    </header>
  )
}
