"use client"

import { useMemo, useState, useRef, useEffect } from "react"
import Link from "next/link"
import { Search, FolderOpen, LayoutGrid, List, MoreHorizontal, Trash2 } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"
import { DeleteClientDialog } from "@/components/admin/delete-client-button"

type App = {
  id: string
  status: string
  products: { name: string; code: string } | null
}

type Company = {
  id: string
  legal_name: string
  internal_alias: string | null
  tax_id: string | null
  created_at: string
  applications: App[]
}

interface Props {
  companies: Company[]
  isSuperAdmin: boolean
}

/* ── Status pills ───────────────────────────────────────────────── */
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

/* ── Product chips ──────────────────────────────────────────────── */
const PRODUCT_MAP: Record<string, { label: string; chip: string }> = {
  cards:     { label: "Tarjetas", chip: "bg-product-cards-tint text-product-cards border border-product-cards/20"             },
  terminals: { label: "Terminal", chip: "bg-product-terminals-tint text-product-terminals border border-product-terminals/20" },
}

/* ── Product tabs ───────────────────────────────────────────────── */
type ProductTab = "all" | "terminals" | "cards"

const PRODUCT_TABS: { key: ProductTab; label: string; activeChip: string }[] = [
  { key: "all",       label: "Todos",    activeChip: "bg-brand-tint border-transparent text-primary font-semibold" },
  { key: "terminals", label: "Terminal", activeChip: "bg-product-terminals-tint border-product-terminals/30 text-product-terminals font-semibold" },
  { key: "cards",     label: "Tarjetas", activeChip: "bg-product-cards-tint border-product-cards/30 text-product-cards font-semibold" },
]

/* ── Filter tabs ────────────────────────────────────────────────── */
type FilterTab = "all" | "review" | "changes" | "approved"

const FILTER_STATUSES: Record<FilterTab, string[]> = {
  all:      [],
  review:   ["documents_pending", "in_compliance_review", "in_provider_review", "activation_pending", "contracts_pending"],
  changes:  ["changes_requested", "provider_changes_requested"],
  approved: ["approved_compliance", "approved_provider", "contracts_signed", "activated"],
}

/* ── Card accent by worst status ────────────────────────────────── */
function cardAccent(apps: App[]): { stripe: string; avatarBg: string; avatarColor: string } {
  const ss = apps.map((a) => a.status)
  if (ss.some((s) => s === "rejected"))
    return { stripe: "#d1622f", avatarBg: "#fef2f2", avatarColor: "#d1622f" }
  if (ss.some((s) => ["changes_requested", "provider_changes_requested"].includes(s)))
    return { stripe: "#c9772f", avatarBg: "#fdf1e6", avatarColor: "#c9772f" }
  if (ss.some((s) => ["in_compliance_review", "in_provider_review", "documents_pending", "activation_pending", "contracts_pending"].includes(s)))
    return { stripe: "#1D4ED8", avatarBg: "#EFF4FF", avatarColor: "#1D4ED8" }
  if (ss.some((s) => ["approved_compliance", "approved_provider", "contracts_signed", "activated"].includes(s)))
    return { stripe: "#1f7a4d", avatarBg: "#e7f6ec", avatarColor: "#1f7a4d" }
  return { stripe: "#E4ECE7", avatarBg: "#F3F7F4", avatarColor: "#5B7168" }
}

/* ── Per-card ⋯ dropdown ─────────────────────────────────────────── */
function CardMenu({ company, apps, isSuperAdmin }: { company: Company; apps: App[]; isSuperAdmin: boolean }) {
  const [open, setOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onMouse(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setOpen(false) }
    document.addEventListener("mousedown", onMouse)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onMouse)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  return (
    <div ref={ref} className="relative z-10">
      <button
        type="button"
        aria-label="Opciones"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen((v) => !v) }}
        className="flex items-center justify-center min-h-[36px] min-w-[36px] rounded-md text-tertiary hover:text-foreground hover:bg-secondary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-1.5 w-44 bg-card border border-border rounded-md shadow z-50 overflow-hidden py-0.5"
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
            <button
              type="button"
              role="menuitem"
              onClick={() => { setOpen(false); setDeleteOpen(true) }}
              className="flex w-full items-center gap-2 px-3 min-h-[44px] text-sm text-destructive hover:bg-destructive/5 transition-colors border-t border-border"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Eliminar
            </button>
          )}
        </div>
      )}

      {/* Fuera del menú desplegable: sobrevive al cierre del menú */}
      {isSuperAdmin && (
        <DeleteClientDialog
          companyId={company.id}
          legalName={company.legal_name}
          taxId={company.tax_id ?? ""}
          open={deleteOpen}
          onClose={() => setDeleteOpen(false)}
        />
      )}
    </div>
  )
}

/* ── Skeleton card ──────────────────────────────────────────────── */
function SkeletonCard() {
  return (
    <div className="flex flex-col overflow-hidden motion-safe:animate-pulse" style={{ background: "#fff", border: "1px solid #E4ECE7", borderRadius: 22 }}>
      <div className="h-1 bg-[#E4ECE7]" />
      <div className="p-5 flex flex-col gap-3">
        <div className="flex items-start justify-between">
          <div className="w-12 h-12 bg-secondary" style={{ borderRadius: 14 }} />
          <div className="w-8 h-8 bg-secondary rounded-md" />
        </div>
        <div className="space-y-1.5">
          <div className="h-4 bg-secondary rounded w-4/5" />
          <div className="h-3 bg-secondary rounded w-2/3" />
        </div>
        <div className="flex gap-1.5">
          <div className="h-5 w-14 bg-secondary rounded-full" />
          <div className="h-5 w-20 bg-secondary rounded-full" />
        </div>
      </div>
      <div className="px-5 py-3 flex items-center justify-between" style={{ borderTop: "1px solid #F0F4F1" }}>
        <div className="h-3 w-16 bg-secondary rounded" />
        <div className="h-3 w-14 bg-secondary rounded" />
      </div>
    </div>
  )
}

/* ══ Main component ════════════════════════════════════════════════ */
export function ClientsGrid({ companies, isSuperAdmin }: Props) {
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<FilterTab>("all")
  const [product, setProduct] = useState<ProductTab>("all")
  const [view, setView] = useState<"grid" | "list">("grid")

  // Un comercio puede tener los dos productos: aparece en ambos filtros
  const hasProduct = (c: Company, code: ProductTab) =>
    code === "all" || c.applications.some((a) => a.products?.code === code)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return companies.filter((c) => {
      // El alias también busca: es lo que el equipo recuerda del cliente
      const matchSearch =
        !q ||
        c.legal_name.toLowerCase().includes(q) ||
        (c.tax_id ?? "").toLowerCase().includes(q) ||
        (c.internal_alias ?? "").toLowerCase().includes(q)
      const matchFilter =
        filter === "all" || c.applications.some((a) => FILTER_STATUSES[filter].includes(a.status))
      return matchSearch && matchFilter && hasProduct(c, product)
    })
  }, [companies, search, filter, product])

  // Los conteos de estado respetan el producto elegido, y viceversa
  const counts = useMemo(() => {
    const base = companies.filter((c) => hasProduct(c, product))
    return {
      all:      base.length,
      review:   base.filter((c) => c.applications.some((a) => FILTER_STATUSES.review.includes(a.status))).length,
      changes:  base.filter((c) => c.applications.some((a) => FILTER_STATUSES.changes.includes(a.status))).length,
      approved: base.filter((c) => c.applications.some((a) => FILTER_STATUSES.approved.includes(a.status))).length,
    }
  }, [companies, product])

  const productCounts = useMemo(() => {
    const base =
      filter === "all"
        ? companies
        : companies.filter((c) => c.applications.some((a) => FILTER_STATUSES[filter].includes(a.status)))
    return {
      all:       base.length,
      terminals: base.filter((c) => hasProduct(c, "terminals")).length,
      cards:     base.filter((c) => hasProduct(c, "cards")).length,
    }
  }, [companies, filter])

  const tabs: { key: FilterTab; label: string }[] = [
    { key: "all",      label: "Todos"       },
    { key: "review",   label: "En revisión" },
    { key: "changes",  label: "Cambios"     },
    { key: "approved", label: "Aprobados"   },
  ]

  return (
    <div>
      {/* ── Toolbar ─────────────────────────────────────────────── */}
      <div className="mb-5 space-y-2">
        <div className="flex items-center gap-2">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-tertiary pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por razón social, alias o RFC…"
              className="w-full pl-9 pr-3 h-10 text-sm rounded-md border border-border bg-card text-foreground placeholder:text-tertiary outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-ring/30"
            />
          </div>
          <div className="flex items-center gap-0.5 border border-border rounded-md p-0.5 shrink-0">
            <button type="button" aria-label="Vista de cuadrícula" aria-pressed={view === "grid"} onClick={() => setView("grid")} className={`flex items-center justify-center w-8 h-8 rounded transition-colors ${view === "grid" ? "bg-secondary text-foreground" : "text-tertiary hover:text-foreground"}`}>
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
            <button type="button" aria-label="Vista de lista" aria-pressed={view === "list"} onClick={() => setView("list")} className={`flex items-center justify-center w-8 h-8 rounded transition-colors ${view === "list" ? "bg-secondary text-foreground" : "text-tertiary hover:text-foreground"}`}>
              <List className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide pb-0.5">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFilter(tab.key)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full border whitespace-nowrap transition-colors ${
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

        {/* Producto: se combina con el filtro de estado de arriba */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide pb-0.5">
          <span className="text-[11px] text-tertiary shrink-0 pr-0.5">Producto</span>
          {PRODUCT_TABS.map((tab) => {
            const active = product === tab.key
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setProduct(tab.key)}
                aria-pressed={active}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full border whitespace-nowrap transition-colors ${
                  active
                    ? tab.activeChip
                    : "bg-card border-border text-muted-foreground hover:bg-secondary"
                }`}
              >
                {tab.label}
                <span className="font-mono opacity-60 text-[11px]">{productCounts[tab.key]}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Empty state ─────────────────────────────────────────── */}
      {filtered.length === 0 && (
        <div style={{ background: "#fff", border: "1px solid #E4ECE7", borderRadius: 22 }} className="py-16 text-center">
          <FolderOpen className="h-8 w-8 text-tertiary mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            {search ? `Sin resultados para "${search}"` : "Sin clientes registrados"}
          </p>
        </div>
      )}

      {/* ── Grid view ──────────────────────────────────────────── */}
      {filtered.length > 0 && view === "grid" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((company) => {
            const apps = company.applications ?? []
            const reviewHref = apps[0] ? `/admin/applications/${apps[0].id}/review` : "#"
            const { stripe, avatarBg, avatarColor } = cardAccent(apps)
            const timeAgo = formatDistanceToNow(new Date(company.created_at), { addSuffix: true, locale: es })

            return (
              <div
                key={company.id}
                className="group relative flex flex-col hover:shadow-[0_6px_24px_rgba(15,42,34,.12)] transition-shadow duration-200"
                style={{ background: "#fff", border: "1px solid #E4ECE7", borderRadius: 22 }}
              >
                {/* Cover link */}
                <Link
                  href={reviewHref}
                  className="absolute inset-0 focus-visible:ring-2 focus-visible:ring-[rgba(168,248,152,.6)] focus-visible:outline-none z-0"
                  style={{ borderRadius: 22 }}
                  aria-label={`Revisar ${company.legal_name}`}
                />

                {/* Top accent stripe */}
                <div className="h-[3px] shrink-0" style={{ background: stripe, borderRadius: "22px 22px 0 0" }} />

                {/* Card body */}
                <div className="p-5 flex flex-col gap-3 flex-1">
                  {/* Avatar + menu */}
                  <div className="flex items-start justify-between">
                    <div
                      className="w-12 h-12 flex items-center justify-center font-black text-lg select-none relative z-10 pointer-events-none"
                      style={{ background: avatarBg, color: avatarColor, borderRadius: 14 }}
                    >
                      {company.legal_name[0]?.toUpperCase() ?? "?"}
                    </div>
                    <CardMenu company={company} apps={apps} isSuperAdmin={isSuperAdmin} />
                  </div>

                  {/* Name + RFC */}
                  <div className="relative z-10 pointer-events-none">
                    {/* El alias va arriba: es el nombre con el que el equipo
                        reconoce al cliente, la razón social casi nunca coincide */}
                    {company.internal_alias && (
                      <p
                        className="text-xs font-semibold mb-0.5 truncate"
                        style={{ color: "#1f7a4d" }}
                        title={`Alias interno: ${company.internal_alias}`}
                      >
                        {company.internal_alias}
                      </p>
                    )}
                    <p
                      className="font-bold leading-snug line-clamp-2 mb-0.5"
                      style={{ fontSize: 15, color: "#0F2A22" }}
                      title={company.legal_name}
                    >
                      {company.legal_name}
                    </p>
                    {company.tax_id && (
                      <p className="font-mono text-xs tracking-wide" style={{ color: "#8A9E94" }}>
                        {company.tax_id}
                      </p>
                    )}
                  </div>

                  {/* Status chips — cada solicitud lleva a su propio expediente */}
                  <div className="relative z-10 flex flex-col gap-1.5 mt-auto">
                    {apps.length === 0 ? (
                      <span className="text-xs pointer-events-none" style={{ color: "#8A9E94" }}>Sin solicitudes</span>
                    ) : (
                      apps.map((app) => {
                        const prod = app.products?.code ? PRODUCT_MAP[app.products.code] : null
                        const st = STATUS_MAP[app.status] ?? STATUS_MAP.draft
                        return (
                          <Link
                            key={app.id}
                            href={`/admin/applications/${app.id}/review`}
                            className="flex items-center gap-1.5 flex-wrap rounded-md hover:opacity-80 transition-opacity"
                            title={`Revisar expediente de ${prod?.label ?? "producto"}`}
                          >
                            {prod && (
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${prod.chip}`}>
                                {prod.label}
                              </span>
                            )}
                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${st.pill}`}>
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${st.pip}`} />
                              {st.label}
                            </span>
                          </Link>
                        )
                      })
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div
                  className="px-5 pb-4 pt-3 flex items-center justify-between relative z-10"
                  style={{ borderTop: "1px solid #F0F4F1" }}
                >
                  <span className="text-[11px] pointer-events-none" style={{ color: "#8A9E94" }}>
                    {timeAgo}
                  </span>
                  <span className="text-[11px] font-medium pointer-events-none" style={{ color: "#5B7168" }}>
                    {apps.length} {apps.length === 1 ? "solicitud" : "solicitudes"}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── List view ──────────────────────────────────────────── */}
      {filtered.length > 0 && view === "list" && (
        <div style={{ background: "#fff", border: "1px solid #E4ECE7", borderRadius: 22, overflow: "hidden" }}>
          {filtered.map((company, i) => {
            const apps = company.applications ?? []
            const reviewHref = apps[0] ? `/admin/applications/${apps[0].id}/review` : "#"
            const { stripe, avatarBg, avatarColor } = cardAccent(apps)
            const timeAgo = formatDistanceToNow(new Date(company.created_at), { addSuffix: true, locale: es })

            return (
              <div
                key={company.id}
                className={`group relative flex items-center gap-4 px-5 py-3.5 hover:bg-[#F8FAF9] transition-colors ${
                  i < filtered.length - 1 ? "border-b border-[#F0F4F1]" : ""
                }`}
              >
                <Link
                  href={reviewHref}
                  className="absolute inset-0 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[rgba(168,248,152,.6)] focus-visible:outline-none z-0"
                  aria-label={`Revisar ${company.legal_name}`}
                />

                {/* Left accent */}
                <div className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full" style={{ background: stripe }} />

                {/* Avatar */}
                <div
                  className="shrink-0 w-9 h-9 flex items-center justify-center font-black text-sm select-none relative z-10 pointer-events-none"
                  style={{ background: avatarBg, color: avatarColor, borderRadius: 10 }}
                >
                  {company.legal_name[0]?.toUpperCase() ?? "?"}
                </div>

                {/* Name + RFC */}
                <div className="flex-1 min-w-0 relative z-10 pointer-events-none">
                  <p className="font-semibold text-sm truncate" style={{ color: "#0F2A22" }}>
                    {company.legal_name}
                    {company.internal_alias && (
                      <span className="ml-2 font-normal" style={{ color: "#1f7a4d" }}>
                        · {company.internal_alias}
                      </span>
                    )}
                  </p>
                  {company.tax_id && (
                    <p className="font-mono text-xs" style={{ color: "#8A9E94" }}>{company.tax_id}</p>
                  )}
                </div>

                {/* Chips */}
                <div className="hidden md:flex items-center gap-1.5 flex-wrap relative z-10 pointer-events-none">
                  {apps.map((app) => {
                    const prod = app.products?.code ? PRODUCT_MAP[app.products.code] : null
                    const st = STATUS_MAP[app.status] ?? STATUS_MAP.draft
                    return (
                      <div key={app.id} className="flex items-center gap-1">
                        {prod && (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${prod.chip}`}>
                            {prod.label}
                          </span>
                        )}
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${st.pill}`}>
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${st.pip}`} />
                          {st.label}
                        </span>
                      </div>
                    )
                  })}
                </div>

                {/* Date */}
                <span className="hidden lg:block text-xs shrink-0 relative z-10 pointer-events-none" style={{ color: "#8A9E94" }}>
                  {timeAgo}
                </span>

                {/* Menu */}
                <div className="relative z-10 shrink-0">
                  <CardMenu company={company} apps={apps} isSuperAdmin={isSuperAdmin} />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ── Skeleton export ────────────────────────────────────────────── */
export function ClientsGridSkeleton() {
  return (
    <div>
      <div className="mb-5 space-y-2">
        <div className="flex items-center gap-2">
          <div className="h-10 flex-1 bg-secondary rounded-md motion-safe:animate-pulse" />
          <div className="h-10 w-[68px] bg-secondary rounded-md motion-safe:animate-pulse" />
        </div>
        <div className="flex gap-1.5">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-7 w-20 bg-secondary rounded-full motion-safe:animate-pulse" />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  )
}
