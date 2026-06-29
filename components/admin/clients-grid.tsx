"use client"

import { useMemo, useState, useRef, useEffect } from "react"
import Link from "next/link"
import { Search, FolderOpen, LayoutGrid, List, MoreHorizontal } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"
import { DeleteClientButton } from "@/components/admin/delete-client-button"

type App = {
  id: string
  status: string
  products: { name: string; code: string } | null
}

type Company = {
  id: string
  legal_name: string
  tax_id: string | null
  created_at: string
  applications: App[]
}

interface Props {
  companies: Company[]
  isSuperAdmin: boolean
}

/* ── Status pills (token-only, no hex) ──────────────────────────── */
const STATUS_MAP: Record<string, { label: string; pill: string; pip: string }> = {
  draft:                      { label: "Borrador",         pill: "bg-muted text-muted-foreground border-border",     pip: "bg-tertiary"  },
  documents_pending:          { label: "Docs enviados",    pill: "bg-info-tint text-info border-info/20",            pip: "bg-info"      },
  in_compliance_review:       { label: "En revisión",      pill: "bg-info-tint text-info border-info/20",            pip: "bg-info"      },
  changes_requested:          { label: "Cambios sol.",     pill: "bg-warning-tint text-warning border-warning/20",   pip: "bg-warning"   },
  approved_compliance:        { label: "Aprobado",         pill: "bg-success-tint text-success border-success/20",   pip: "bg-success"   },
  in_provider_review:         { label: "Con proveedor",    pill: "bg-info-tint text-info border-info/20",            pip: "bg-info"      },
  provider_changes_requested: { label: "Cambios prov.",    pill: "bg-warning-tint text-warning border-warning/20",   pip: "bg-warning"   },
  approved_provider:          { label: "Aprobado prov.",   pill: "bg-success-tint text-success border-success/20",   pip: "bg-success"   },
  contracts_pending:          { label: "Contratos pend.",  pill: "bg-info-tint text-info border-info/20",            pip: "bg-info"      },
  contracts_signed:           { label: "Contratos firm.",  pill: "bg-success-tint text-success border-success/20",   pip: "bg-success"   },
  activation_pending:         { label: "Pend. activación", pill: "bg-info-tint text-info border-info/20",            pip: "bg-info"      },
  activated:                  { label: "Activo ✓",         pill: "bg-success-tint text-success border-success/20",   pip: "bg-success"   },
  rejected:                   { label: "Rechazado",        pill: "bg-danger-tint text-danger border-danger/20",      pip: "bg-danger"    },
  archived:                   { label: "Archivado",        pill: "bg-muted text-muted-foreground border-border",     pip: "bg-tertiary"  },
}

/* ── Product chips (semantic product tokens) ─────────────────────── */
const PRODUCT_MAP: Record<string, { label: string; chip: string }> = {
  cards:     { label: "Tarjetas", chip: "bg-product-cards-tint text-product-cards border border-product-cards/20"             },
  terminals: { label: "Terminal", chip: "bg-product-terminals-tint text-product-terminals border border-product-terminals/20" },
}

/* ── Filter tabs ────────────────────────────────────────────────── */
type FilterTab = "all" | "review" | "changes" | "approved"

const FILTER_STATUSES: Record<FilterTab, string[]> = {
  all:      [],
  review:   ["documents_pending", "in_compliance_review", "in_provider_review", "activation_pending", "contracts_pending"],
  changes:  ["changes_requested", "provider_changes_requested"],
  approved: ["approved_compliance", "approved_provider", "contracts_signed", "activated"],
}

/* ── Folder accent by worst status ─────────────────────────────── */
function folderAccent(apps: App[]): { icon: string; bg: string } {
  const ss = apps.map((a) => a.status)
  if (ss.some((s) => s === "rejected"))
    return { icon: "text-danger",  bg: "bg-danger-tint"  }
  if (ss.some((s) => ["changes_requested", "provider_changes_requested"].includes(s)))
    return { icon: "text-warning", bg: "bg-warning-tint" }
  if (ss.some((s) => ["in_compliance_review", "in_provider_review", "documents_pending", "activation_pending", "contracts_pending"].includes(s)))
    return { icon: "text-info",    bg: "bg-info-tint"    }
  if (ss.some((s) => ["approved_compliance", "approved_provider", "contracts_signed", "activated"].includes(s)))
    return { icon: "text-success", bg: "bg-mint-tint"    }
  return { icon: "text-tertiary",  bg: "bg-secondary"   }
}

/* ── Per-card ⋯ dropdown ─────────────────────────────────────────
   stopPropagation keeps the card's cover Link from triggering.     */
function CardMenu({
  company,
  apps,
  isSuperAdmin,
}: {
  company: Company
  apps: App[]
  isSuperAdmin: boolean
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onMouse(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", onMouse)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onMouse)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label="Opciones"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setOpen((v) => !v)
        }}
        className="flex items-center justify-center min-h-[44px] min-w-[44px] rounded-md text-tertiary hover:text-foreground hover:bg-secondary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 bottom-full mb-1.5 w-44 bg-card border border-border rounded-md shadow z-50 overflow-hidden py-0.5"
          onClick={(e) => e.stopPropagation()}
        >
          {apps[0] && (
            <Link
              href={`/admin/applications/${apps[0].id}/review`}
              role="menuitem"
              className="flex items-center px-3 min-h-[44px] text-sm text-foreground hover:bg-secondary transition-colors"
              onClick={() => setOpen(false)}
            >
              Revisar expediente
            </Link>
          )}
          {isSuperAdmin && (
            <div
              role="menuitem"
              className="border-t border-border mt-0.5 pt-0.5 px-1 pb-1"
              onClick={() => setOpen(false)}
            >
              <DeleteClientButton
                companyId={company.id}
                legalName={company.legal_name}
                taxId={company.tax_id ?? ""}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ── Skeleton card ──────────────────────────────────────────────── */
function SkeletonCard() {
  return (
    <div className="flex flex-col rounded-lg border border-border bg-card p-4 gap-3 motion-safe:animate-pulse">
      <div className="w-9 h-9 rounded-md bg-secondary" />
      <div className="space-y-1.5">
        <div className="h-3.5 bg-secondary rounded w-4/5" />
        <div className="h-3 bg-secondary rounded w-2/3" />
        <div className="h-3 bg-secondary rounded w-1/2 mt-0.5" />
      </div>
      <div className="flex gap-1">
        <div className="h-5 w-14 bg-secondary rounded" />
        <div className="h-5 w-16 bg-secondary rounded" />
      </div>
      <div className="flex items-center justify-between pt-2 border-t border-border">
        <div className="h-3 w-14 bg-secondary rounded" />
        <div className="h-5 w-5 bg-secondary rounded" />
      </div>
    </div>
  )
}

/* ══ Main component ════════════════════════════════════════════════ */
export function ClientsGrid({ companies, isSuperAdmin }: Props) {
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<FilterTab>("all")
  const [view, setView] = useState<"grid" | "list">("grid")

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return companies.filter((c) => {
      const matchSearch =
        !q ||
        c.legal_name.toLowerCase().includes(q) ||
        (c.tax_id ?? "").toLowerCase().includes(q)
      const matchFilter =
        filter === "all" ||
        c.applications.some((a) => FILTER_STATUSES[filter].includes(a.status))
      return matchSearch && matchFilter
    })
  }, [companies, search, filter])

  const counts = useMemo(
    () => ({
      all:      companies.length,
      review:   companies.filter((c) => c.applications.some((a) => FILTER_STATUSES.review.includes(a.status))).length,
      changes:  companies.filter((c) => c.applications.some((a) => FILTER_STATUSES.changes.includes(a.status))).length,
      approved: companies.filter((c) => c.applications.some((a) => FILTER_STATUSES.approved.includes(a.status))).length,
    }),
    [companies]
  )

  const tabs: { key: FilterTab; label: string }[] = [
    { key: "all",      label: "Todos"       },
    { key: "review",   label: "En revisión" },
    { key: "changes",  label: "Cambios"     },
    { key: "approved", label: "Aprobados"   },
  ]

  return (
    <div>
      {/* ── Toolbar: 2 rows — search+toggle on top, chips below ─── */}
      <div className="mb-4 space-y-2">
        {/* Row 1: search + view toggle */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-tertiary pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por razón social o RFC…"
              className="w-full pl-9 pr-3 py-2 text-sm rounded-md border border-border bg-card text-foreground placeholder:text-tertiary outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-ring/30"
            />
          </div>
          <div className="flex items-center gap-0.5 border border-border rounded-md p-0.5 shrink-0">
            <button
              type="button"
              aria-label="Vista de cuadrícula"
              aria-pressed={view === "grid"}
              onClick={() => setView("grid")}
              className={`flex items-center justify-center w-8 h-8 rounded transition-colors ${
                view === "grid"
                  ? "bg-secondary text-foreground"
                  : "text-tertiary hover:text-foreground"
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              aria-label="Vista de lista"
              aria-pressed={view === "list"}
              onClick={() => setView("list")}
              className={`flex items-center justify-center w-8 h-8 rounded transition-colors ${
                view === "list"
                  ? "bg-secondary text-foreground"
                  : "text-tertiary hover:text-foreground"
              }`}
            >
              <List className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Row 2: filter chips — horizontal scroll on narrow viewports */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide pb-0.5">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFilter(tab.key)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-full border whitespace-nowrap transition-colors ${
                filter === tab.key
                  ? "bg-brand-tint border-transparent text-primary font-semibold"
                  : "bg-card border-border text-muted-foreground hover:bg-secondary"
              }`}
            >
              {tab.label}
              <span className="font-mono opacity-60 text-[11px]">{counts[tab.key]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Empty state ────────────────────────────────────────────── */}
      {filtered.length === 0 && (
        <div className="rounded-lg border border-border bg-card py-16 text-center">
          <FolderOpen className="h-8 w-8 text-tertiary mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            {search
              ? `Sin resultados para "${search}"`
              : "Sin clientes registrados"}
          </p>
        </div>
      )}

      {/* ── Grid view ──────────────────────────────────────────────── */}
      {filtered.length > 0 && view === "grid" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {filtered.map((company) => {
            const apps = company.applications ?? []
            const reviewHref = apps[0]
              ? `/admin/applications/${apps[0].id}/review`
              : "#"
            const { icon, bg } = folderAccent(apps)
            const timeAgo = formatDistanceToNow(new Date(company.created_at), {
              addSuffix: true,
              locale: es,
            })

            return (
              <div
                key={company.id}
                className="group relative flex flex-col rounded-lg border border-border bg-card p-4 gap-3 hover:shadow motion-safe:transition-shadow"
              >
                {/* Cover link (keyboard + click nav) */}
                <Link
                  href={reviewHref}
                  className="absolute inset-0 rounded-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none z-0"
                  aria-label={`Revisar ${company.legal_name}`}
                />

                {/* Folder icon */}
                <div
                  className={`w-9 h-9 rounded-md flex items-center justify-center shrink-0 relative z-10 pointer-events-none ${bg}`}
                >
                  <FolderOpen className={`h-5 w-5 ${icon}`} />
                </div>

                {/* Name + RFC */}
                <div className="relative z-10 pointer-events-none">
                  <p
                    className="text-sm font-semibold text-foreground leading-snug line-clamp-2"
                    title={company.legal_name}
                  >
                    {company.legal_name}
                  </p>
                  {company.tax_id && (
                    <p className="font-mono text-xs text-muted-foreground mt-0.5 tracking-wide">
                      {company.tax_id}
                    </p>
                  )}
                </div>

                {/* Chips */}
                <div className="relative z-10 flex flex-col gap-1 pointer-events-none">
                  {apps.length === 0 ? (
                    <span className="text-xs text-tertiary">Sin solicitudes</span>
                  ) : (
                    apps.map((app) => {
                      const prod = app.products?.code
                        ? PRODUCT_MAP[app.products.code]
                        : null
                      const st = STATUS_MAP[app.status] ?? STATUS_MAP.draft
                      return (
                        <div key={app.id} className="flex items-center gap-1 flex-wrap">
                          {prod && (
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold ${prod.chip}`}>
                              {prod.label}
                            </span>
                          )}
                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-semibold border ${st.pill}`}>
                            <span className={`w-1 h-1 rounded-full shrink-0 ${st.pip}`} />
                            {st.label}
                          </span>
                        </div>
                      )
                    })
                  )}
                </div>

                {/* Footer */}
                <div className="relative z-10 flex items-center justify-between mt-auto pt-2 border-t border-border">
                  <span className="text-xs text-tertiary pointer-events-none">
                    {timeAgo}
                  </span>
                  <CardMenu
                    company={company}
                    apps={apps}
                    isSuperAdmin={isSuperAdmin}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── List view ──────────────────────────────────────────────── */}
      {filtered.length > 0 && view === "list" && (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          {filtered.map((company, i) => {
            const apps = company.applications ?? []
            const reviewHref = apps[0]
              ? `/admin/applications/${apps[0].id}/review`
              : "#"
            const { icon, bg } = folderAccent(apps)
            const timeAgo = formatDistanceToNow(new Date(company.created_at), {
              addSuffix: true,
              locale: es,
            })

            return (
              <div
                key={company.id}
                className={`group relative flex items-center gap-4 px-4 py-3 hover:bg-secondary transition-colors ${
                  i < filtered.length - 1 ? "border-b border-border" : ""
                }`}
              >
                {/* Cover link */}
                <Link
                  href={reviewHref}
                  className="absolute inset-0 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring focus-visible:outline-none z-0"
                  aria-label={`Revisar ${company.legal_name}`}
                />

                {/* Icon */}
                <div
                  className={`shrink-0 w-8 h-8 rounded-md flex items-center justify-center relative z-10 pointer-events-none ${bg}`}
                >
                  <FolderOpen className={`h-4 w-4 ${icon}`} />
                </div>

                {/* Name + RFC */}
                <div className="flex-1 min-w-0 relative z-10 pointer-events-none">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {company.legal_name}
                  </p>
                  {company.tax_id && (
                    <p className="font-mono text-xs text-muted-foreground">
                      {company.tax_id}
                    </p>
                  )}
                </div>

                {/* Chips */}
                <div className="hidden md:flex items-center gap-1.5 flex-wrap relative z-10 pointer-events-none">
                  {apps.map((app) => {
                    const prod = app.products?.code
                      ? PRODUCT_MAP[app.products.code]
                      : null
                    const st = STATUS_MAP[app.status] ?? STATUS_MAP.draft
                    return (
                      <div key={app.id} className="flex items-center gap-1">
                        {prod && (
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold ${prod.chip}`}>
                            {prod.label}
                          </span>
                        )}
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-semibold border ${st.pill}`}>
                          <span className={`w-1 h-1 rounded-full shrink-0 ${st.pip}`} />
                          {st.label}
                        </span>
                      </div>
                    )
                  })}
                </div>

                {/* Date */}
                <span className="hidden lg:block text-xs text-tertiary shrink-0 relative z-10 pointer-events-none">
                  {timeAgo}
                </span>

                {/* Menu */}
                <div className="relative z-10 shrink-0">
                  <CardMenu
                    company={company}
                    apps={apps}
                    isSuperAdmin={isSuperAdmin}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ── Skeleton export (used by loading.tsx) ─────────────────────── */
export function ClientsGridSkeleton() {
  return (
    <div>
      <div className="mb-4 space-y-2">
        <div className="flex items-center gap-2">
          <div className="h-9 flex-1 bg-secondary rounded-md motion-safe:animate-pulse" />
          <div className="h-9 w-[68px] bg-secondary rounded-md motion-safe:animate-pulse" />
        </div>
        <div className="flex gap-1.5">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-8 w-20 bg-secondary rounded-full motion-safe:animate-pulse" />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {Array.from({ length: 10 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  )
}
