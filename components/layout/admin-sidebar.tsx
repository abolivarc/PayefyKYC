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
  Calculator,
  PieChart,
  UserCog,
  UserRound,
  LogOut,
  Menu,
  X,
} from "lucide-react"
import { signOut } from "@/app/(auth)/actions"
import { cn } from "@/lib/utils"
import { NotificationBell } from "@/components/layout/notification-bell"

function getInitials(name: string | null): string {
  if (!name) return "?"
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
}

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  sales_director: "Director",
  compliance: "Compliance",
  sales_agent: "Agente",
  onboarding: "Onboarding",
  accounting: "Contabilidad",
}

const NAV = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/kanban", label: "Kanban", icon: KanbanSquare },
  { href: "/admin/tracking", label: "Seguimiento", icon: BarChart2 },
  { href: "/admin/clients", label: "Clientes", icon: Building2 },
  { href: "/admin/leads", label: "Leads", icon: Users },
  { href: "/admin/proposals", label: "Propuestas", icon: Calculator },
  { href: "/admin/tracking/orders", label: "Pedidos", icon: ShoppingBag },
  { href: "/admin/reportes", label: "Reportes", icon: PieChart },
  { href: "/admin/usuarios", label: "Usuarios", icon: UserCog },
  { href: "/admin/perfil", label: "Mi cuenta", icon: UserRound },
]

// El agente comercial solo navega su propio trabajo
const AGENT_NAV_HREFS = new Set([
  "/admin/proposals",
  "/admin/leads",
  "/admin/clients",
  "/admin/perfil",
])

function navForRole(role: string | null | undefined) {
  if (role === "sales_agent") return NAV.filter((n) => AGENT_NAV_HREFS.has(n.href))
  if (role !== "super_admin") return NAV.filter((n) => n.href !== "/admin/usuarios")
  return NAV
}

interface Props {
  fullName: string | null
  email: string
  role?: string | null
}

function SidebarContent({
  fullName,
  email,
  role,
  onClose,
}: Props & { onClose?: () => void }) {
  const pathname = usePathname()
  const initials = getInitials(fullName)
  const roleLabel = role ? (ROLE_LABELS[role as keyof typeof ROLE_LABELS] ?? role) : null

  return (
    <div
      className="flex flex-col h-full w-64"
      style={{
        background:
          "linear-gradient(180deg, var(--sb-bg, #0E1A26), var(--sb-bg2, #0A141E))",
      }}
    >
      {/* Brand header */}
      <div
        className="flex items-center justify-between px-5 py-4 border-b shrink-0"
        style={{ borderColor: "var(--sb-border, rgba(255,255,255,0.07))" }}
      >
        <div className="flex items-center gap-2.5">
          <Image
            src="/brand/payefy-wordmark-mint.png"
            alt="Payefy"
            width={96}
            height={28}
            className="object-contain"
            priority
          />
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-white/50 hover:text-white transition-colors p-1"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* User info */}
      <div
        className="px-5 py-3.5 border-b shrink-0"
        style={{ borderColor: "var(--sb-border, rgba(255,255,255,0.07))" }}
      >
        <div className="flex items-center gap-2.5">
          {/* Avatar */}
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
            style={{
              background: "rgba(168,248,152,0.18)",
              color: "#A8F898",
              fontFamily: "var(--font-display)",
            }}
          >
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            {roleLabel && (
              <span
                className="mb-0.5"
                style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  fontSize: 11, fontWeight: 700, letterSpacing: ".03em", textTransform: "uppercase",
                  color: "#0B7A44", background: "#EDFBEA",
                  padding: "2px 8px", borderRadius: 999,
                }}
              >
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#0B7A44", flexShrink: 0 }} />
                {roleLabel}
              </span>
            )}
            <p className="text-sm font-medium truncate text-white leading-tight">
              {fullName || "Usuario"}
            </p>
            <p
              className="text-xs truncate leading-tight"
              style={{ color: "var(--sb-text-dim, #7E8FA0)" }}
            >
              {email}
            </p>
          </div>
          <NotificationBell variant="light" />
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto">
        <p
          className="text-[10px] uppercase tracking-widest font-semibold px-3 pb-2"
          style={{ color: "var(--sb-text-dim, #7E8FA0)" }}
        >
          Operación
        </p>
        {navForRole(role).map(({ href, label, icon: Icon }) => {
          const isActive =
            pathname === href ||
            (href !== "/admin/dashboard" &&
              pathname.startsWith(href + "/")) ||
            (href === "/admin/tracking" && pathname === "/admin/tracking")
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={cn(
                "sb-nav-link flex items-center gap-2.5 px-3 py-2 rounded-lg mb-0.5 text-sm",
                isActive ? "active" : ""
              )}
              style={{
                color: isActive
                  ? "#0a3d1e"
                  : "var(--sb-text, #b8e8c8)",
              }}
            >
              <Icon className="h-4 w-4 shrink-0 opacity-80" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Sign out */}
      <div
        className="px-3 pb-4 border-t pt-3 shrink-0"
        style={{ borderColor: "var(--sb-border, rgba(255,255,255,0.07))" }}
      >
        <form action={signOut}>
          <button
            type="submit"
            className="flex items-center gap-2.5 px-3 py-2 w-full rounded-lg text-sm transition-colors"
            style={{ color: "var(--sb-text-dim, #7E8FA0)" }}
            onMouseEnter={(e) => {
              ;(e.currentTarget as HTMLButtonElement).style.background =
                "rgba(255,255,255,0.06)"
              ;(e.currentTarget as HTMLButtonElement).style.color = "#fff"
            }}
            onMouseLeave={(e) => {
              ;(e.currentTarget as HTMLButtonElement).style.background = ""
              ;(e.currentTarget as HTMLButtonElement).style.color =
                "var(--sb-text-dim, #7E8FA0)"
            }}
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
        <header
          className="fixed top-0 left-0 right-0 z-40 h-14 flex items-center justify-between px-5"
          style={{
            background:
              "linear-gradient(90deg, var(--sb-bg, #0E1A26), var(--sb-bg2, #0A141E))",
          }}
        >
          <div className="flex items-center">
            <Image
              src="/brand/payefy-wordmark-mint.png"
              alt="Payefy"
              width={80}
              height={24}
              className="object-contain"
              priority
            />
          </div>
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
