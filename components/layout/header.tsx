import type { ReactNode } from "react"
import Image from "next/image"

interface HeaderProps {
  userNav: ReactNode
  variant?: "client" | "admin"
}

export function Header({ userNav, variant = "client" }: HeaderProps) {
  if (variant === "client") {
    return (
      <header className="sticky top-0 z-50 w-full border-b border-gray-100 bg-white">
        <div className="flex h-14 items-center px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <Image
              src="/payefy-logo-dark.png"
              alt="Payefy"
              width={120}
              height={28}
              style={{ height: 28, width: "auto" }}
              priority
            />
            <span className="text-xs text-gray-400 border-l border-gray-200 pl-2 ml-1">Portal del Cliente</span>
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
