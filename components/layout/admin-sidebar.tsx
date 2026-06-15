"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  KanbanSquare,
  Building2,
  Users,
  BarChart2,
  LogOut,
  Menu,
  X,
} from "lucide-react"
import { signOut } from "@/app/(auth)/actions"
import { cn } from "@/lib/utils"
import { PayefyLogo } from "./payefy-logo"

const NAV_LINKS = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/kanban", label: "Kanban", icon: KanbanSquare },
  { href: "/admin/tracking", label: "Seguimiento", icon: BarChart2 },
  { href: "/admin/clients", label: "Clientes", icon: Building2 },
  { href: "/admin/leads", label: "Leads", icon: Users },
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
    <div className="flex flex-col h-full w-64 bg-slate-900 text-white">
      {/* Logo + brand */}
      <div className="flex items-center justify-between px-4 h-14 border-b border-slate-700 shrink-0">
        <div className="flex items-center gap-2.5">
          <PayefyLogo size={28} />
          <div className="leading-none">
            <p className="font-bold text-white text-sm">Payefy Equipo</p>
            <p className="text-xs text-slate-400 mt-0.5">Panel interno</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* User info + rol badge */}
      <div className="px-4 py-3 border-b border-slate-700 shrink-0">
        {roleLabel && (
          <span className="bg-slate-800 text-slate-300 text-xs px-2 py-0.5 rounded mb-1.5 inline-block">
            {roleLabel}
          </span>
        )}
        <p className="text-sm text-slate-300 truncate">{fullName || "Usuario"}</p>
        <p className="text-xs text-slate-500 truncate">{email}</p>
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
                isActive
                  ? "bg-emerald-700 text-white font-medium"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              )}
            >
              <link.icon className="h-4 w-4 shrink-0" />
              {link.label}
            </Link>
          )
        })}
      </nav>

      {/* Sign out */}
      <div className="p-3 border-t border-slate-700 shrink-0">
        <form action={signOut}>
          <button
            type="submit"
            className="flex items-center gap-2 text-slate-400 hover:text-red-400 text-sm transition-colors px-3 py-2 w-full rounded-md hover:bg-slate-800"
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
        <header className="fixed top-0 left-0 right-0 z-40 h-14 bg-slate-900 flex items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <PayefyLogo size={24} />
            <span className="font-bold text-white text-sm">Payefy Equipo</span>
          </div>
          <button
            onClick={() => setMobileOpen(true)}
            className="text-slate-300 hover:text-white p-1"
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
