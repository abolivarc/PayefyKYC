"use client"

import Link from "next/link"
import { signOut } from "@/app/(auth)/actions"
import { NotificationBell } from "@/components/layout/notification-bell"

interface UserNavProps {
  email: string
  fullName: string | null
}

function getInitials(name: string | null, email: string): string {
  if (name) {
    return name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase()
  }
  return email[0]?.toUpperCase() ?? "?"
}

export function UserNav({ email, fullName }: UserNavProps) {
  const display = fullName || email
  const initials = getInitials(fullName, email)

  return (
    <div className="flex items-center gap-2">
      <NotificationBell variant="light" />

      {/* Chip del usuario → editar perfil (nombre, correo, contraseña) */}
      <Link
        href="/profile"
        title="Editar mi perfil"
        className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold transition-all hover:brightness-125"
        style={{
          background: "rgba(255,255,255,0.08)",
          border: "1px solid rgba(255,255,255,0.16)",
          color: "#fff",
          maxWidth: 220,
          textDecoration: "none",
        }}
      >
        <span
          className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
          style={{ background: "rgba(168,248,152,0.18)", color: "#A8F898" }}
        >
          {initials}
        </span>
        <span className="truncate text-xs hidden sm:inline" style={{ maxWidth: 140 }}>
          {display}
        </span>
      </Link>

      <form action={signOut}>
        <button
          type="submit"
          className="text-xs font-semibold px-3 py-1.5 rounded-full transition-all"
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.14)",
            color: "rgba(255,255,255,0.7)",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.12)"
            ;(e.currentTarget as HTMLElement).style.color = "#fff"
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)"
            ;(e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.7)"
          }}
        >
          Salir
        </button>
      </form>
    </div>
  )
}
