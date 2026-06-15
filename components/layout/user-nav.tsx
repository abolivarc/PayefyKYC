"use client"

import { signOut } from "@/app/(auth)/actions"
import { Button } from "@/components/ui/button"
import { NotificationBell } from "@/components/layout/notification-bell"

interface UserNavProps {
  email: string
  fullName: string | null
}

export function UserNav({ email, fullName }: UserNavProps) {
  const display = fullName || email

  return (
    <div className="flex items-center gap-2">
      <NotificationBell variant="dark" />
      <span className="text-sm text-muted-foreground hidden sm:inline ml-1">
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
