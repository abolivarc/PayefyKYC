"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, KanbanSquare, Building2, Users } from "lucide-react"
import { signOut } from "@/app/(auth)/actions"
import { buttonVariants } from "@/components/ui/button"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const NAV_LINKS = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/kanban", label: "Kanban", icon: KanbanSquare },
  { href: "/admin/clients", label: "Clientes", icon: Building2 },
  { href: "/admin/leads", label: "Leads", icon: Users },
]

interface Props {
  fullName: string | null
  email: string
}

export function AdminSidebar({ fullName, email }: Props) {
  const pathname = usePathname()

  return (
    <aside className="flex flex-col w-56 shrink-0 border-r bg-background min-h-screen">
      {/* Logo */}
      <div className="h-14 flex items-center px-4 border-b">
        <span className="text-xl font-semibold">PayefyKYC</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {NAV_LINKS.map((link) => {
          const isActive =
            pathname === link.href ||
            pathname.startsWith(link.href + "/")
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                buttonVariants({
                  variant: isActive ? "secondary" : "ghost",
                  size: "sm",
                }),
                "w-full justify-start gap-2"
              )}
            >
              <link.icon className="h-4 w-4 shrink-0" />
              {link.label}
            </Link>
          )
        })}
      </nav>

      {/* User info + sign out */}
      <div className="p-3 border-t space-y-1">
        <p className="text-xs text-muted-foreground px-1 truncate">
          {fullName || email}
        </p>
        <form action={signOut}>
          <Button
            type="submit"
            variant="outline"
            size="sm"
            className="w-full"
          >
            Cerrar sesión
          </Button>
        </form>
      </div>
    </aside>
  )
}
