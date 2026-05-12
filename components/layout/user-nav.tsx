"use client"

import { signOut } from "@/app/(auth)/actions"
import { Button } from "@/components/ui/button"

interface UserNavProps {
  email: string
  fullName: string | null
}

export function UserNav({ email, fullName }: UserNavProps) {
  const display = fullName || email

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-muted-foreground hidden sm:inline">
        {display}
      </span>
      <form action={signOut}>
        <Button type="submit" variant="outline" size="sm">
          Cerrar sesión
        </Button>
      </form>
    </div>
  )
}
