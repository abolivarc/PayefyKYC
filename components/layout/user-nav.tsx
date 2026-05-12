"use client"

import { signOut } from "@/app/(auth)/actions"
import { Button } from "@/components/ui/button"

interface UserNavProps {
  email: string
  fullName: string | null
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join("")
}

export function UserNav({ email, fullName }: UserNavProps) {
  const display = fullName || email
  const initials = getInitials(fullName || email)

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground select-none">
          {initials}
        </div>
        <span className="hidden text-sm font-medium sm:block">{display}</span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={async () => {
          await signOut()
        }}
      >
        Cerrar sesión
      </Button>
    </div>
  )
}
