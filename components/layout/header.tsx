import type { ReactNode } from "react"

interface HeaderProps {
  userNav: ReactNode
}

export function Header({ userNav }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background">
      <div className="flex h-14 items-center px-4 sm:px-6">
        <span className="text-xl font-semibold">PayefyKYC</span>
        <div className="ml-auto">{userNav}</div>
      </div>
    </header>
  )
}
