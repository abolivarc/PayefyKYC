import type { ReactNode } from "react"
import Image from "next/image"

interface HeaderProps {
  userNav: ReactNode
  variant?: "client" | "admin"
}

export function Header({ userNav, variant = "client" }: HeaderProps) {
  if (variant === "client") {
    return (
      <header
        className="sticky top-0 z-50 w-full"
        style={{ background: "var(--header-bg, #0A1410)", borderBottom: "1px solid rgba(168,248,152,0.08)" }}
      >
        <div className="flex h-14 items-center px-4 sm:px-6 gap-3">
          <Image
            src="/brand/payefy-wordmark-mint.png"
            alt="Payefy"
            width={104}
            height={28}
            style={{ height: 28, width: "auto" }}
            priority
          />
          <span
            className="text-xs border-l pl-2.5 ml-0.5 hidden sm:block"
            style={{ color: "rgba(168,248,152,0.45)", borderColor: "rgba(168,248,152,0.15)" }}
          >
            Portal del Cliente
          </span>
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
