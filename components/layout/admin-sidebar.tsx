"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  KanbanSquare,
  Building2,
  Users,
  BarChart2,
  ShoppingBag,
  LogOut,
  Menu,
  X,
} from "lucide-react"
import { signOut } from "@/app/(auth)/actions"
import { cn } from "@/lib/utils"

const NAV_LINKS = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/kanban", label: "Kanban", icon: KanbanSquare },
  { href: "/admin/tracking", label: "Seguimiento", icon: BarChart2 },
  { href: "/admin/clients", label: "Clientes", icon: Building2 },
  { href: "/admin/leads", label: "Leads", icon: Users },
  { href: "/admin/tracking/orders", label: "Pedidos", icon: ShoppingBag },
]

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  sales_director: "Director",
  compliance: "Compliance",
  sales_agent: "Agente",
  onboarding: "Onboarding",
  accounting: "Contabilidad",
}

interface Props {
  fullName: string | null
  email: string
  role?: string | null
}

function SidebarContent({ fullName, email, role, onClose }: Props & { onClose?: () => void }) {
  const pathname = usePathname()
  const roleLabel = role ? (ROLE_LABELS[role] ?? role) : null

  return (
    <div className="flex flex-col h-full w-64 text-white" style={{ background: "#004238" }}>
      {/* Logo + brand */}
      <div className="flex items-center justify-between px-4 h-14 border-b shrink-0" style={{ borderColor: "rgba(255,255,255,0.12)" }}>
        <div className="flex items-center gap-2">
          <Image
            src="/payefy-logo-light.png"
            alt="Payefy"
            width={100}
            height={22}
            style={{ height: 22, width: "auto" }}
            priority
          />
          <span className="text-xs border-l pl-2 ml-1" style={{ borderColor: "rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.5)" }}>Panel interno</span>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1" style={{ color: "rgba(255,255,255,0.6)" }}>
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* User info + rol badge */}
      <div className="px-4 py-3 border-b shrink-0" style={{ borderColor: "rgba(255,255,255,0.12)" }}>
        {roleLabel && (
          <span className="text-xs px-2 py-0.5 rounded mb-1.5 inline-block" style={{ background: "rgba(174,255,153,0.15)", color: "#AEFF99" }}>
            {roleLabel}
          </span>
        )}
        <p className="text-sm truncate" style={{ color: "rgba(255,255,255,0.85)" }}>{fullName || "Usuario"}</p>
        <p className="text-xs truncate" style={{ color: "rgba(255,255,255,0.45)" }}>{email}</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {NAV_LINKS.map((link) => {
          const isActive =
            pathname === link.href || pathname.startsWith(link.href + "/")
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={onClose}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors",
              )}
              style={isActive
                ? { background: "#AEFF99", color: "#004238", fontWeight: 600 }
                : { color: "rgba(255,255,255,0.72)" }}
              onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,255,255,0.1)" }}
              onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLAnchorElement).style.background = "" }}
            >
              <link.icon className="h-4 w-4 shrink-0" />
              {link.label}
            </Link>
          )
        })}
      </nav>

      {/* Sign out */}
      <div className="p-3 border-t shrink-0" style={{ borderColor: "rgba(255,255,255,0.12)" }}>
        <form action={signOut}>
          <button
            type="submit"
            className="flex items-center gap-2 text-sm transition-colors px-3 py-2 w-full rounded-md"
            style={{ color: "rgba(255,255,255,0.5)" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.08)"; (e.currentTarget as HTMLButtonElement).style.color = "#fff" }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = ""; (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.5)" }}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Cerrar sesión
          </button>
        </form>
      </div>
    </div>
  )
}

export function AdminSidebar({ fullName, email, role }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex shrink-0 min-h-screen">
        <SidebarContent fullName={fullName} email={email} role={role} />
      </aside>

      {/* Mobile: header bar + overlay */}
      <div className="md:hidden">
        <header className="fixed top-0 left-0 right-0 z-40 h-14 flex items-center justify-between px-4" style={{ background: "#004238" }}>
          <Image
            src="/payefy-logo-light.png"
            alt="Payefy"
            width={90}
            height={20}
            style={{ height: 20, width: "auto" }}
            priority
          />
          <button
            onClick={() => setMobileOpen(true)}
            className="p-1"
            style={{ color: "rgba(255,255,255,0.7)" }}
            aria-label="Abrir menú"
          >
            <Menu className="h-6 w-6" />
          </button>
        </header>
        {/* Spacer for fixed header */}
        <div className="h-14" />

        {/* Overlay */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 flex">
            <div
              className="absolute inset-0 bg-black/60"
              onClick={() => setMobileOpen(false)}
            />
            <div className="relative z-10 h-full">
              <SidebarContent
                fullName={fullName}
                email={email}
                role={role}
                onClose={() => setMobileOpen(false)}
              />
            </div>
          </div>
        )}
      </div>
    </>
  )
}
