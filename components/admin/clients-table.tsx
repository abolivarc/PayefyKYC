"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Search } from "lucide-react"
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

const STATUS_MAP: Record<
  string,
  { label: string; pip: string; bg: string; text: string; border: string }
> = {
  draft: {
    label: "Borrador",
    pip: "#5B7168",
    bg: "#F3F7F4",
    text: "#5B7168",
    border: "#E4ECE7",
  },
  documents_pending: {
    label: "Docs enviados",
    pip: "#1D4ED8",
    bg: "#EFF4FF",
    text: "#1D4ED8",
    border: "#DBE5FF",
  },
  in_compliance_review: {
    label: "En revisión",
    pip: "#1D4ED8",
    bg: "#EFF4FF",
    text: "#1D4ED8",
    border: "#DBE5FF",
  },
  changes_requested: {
    label: "Cambios sol.",
    pip: "#c9772f",
    bg: "#fdf1e6",
    text: "#c9772f",
    border: "#f8d8b0",
  },
  approved_compliance: {
    label: "Aprobado",
    pip: "#1f7a4d",
    bg: "#e7f6ec",
    text: "#1f7a4d",
    border: "#b8e8ca",
  },
  in_provider_review: {
    label: "Con proveedor",
    pip: "#1D4ED8",
    bg: "#EFF4FF",
    text: "#1D4ED8",
    border: "#DBE5FF",
  },
  provider_changes_requested: {
    label: "Cambios prov.",
    pip: "#c9772f",
    bg: "#fdf1e6",
    text: "#c9772f",
    border: "#f8d8b0",
  },
  approved_provider: {
    label: "Aprobado prov.",
    pip: "#1f7a4d",
    bg: "#e7f6ec",
    text: "#1f7a4d",
    border: "#b8e8ca",
  },
  contracts_pending: {
    label: "Contratos pend.",
    pip: "#1D4ED8",
    bg: "#EFF4FF",
    text: "#1D4ED8",
    border: "#DBE5FF",
  },
  contracts_signed: {
    label: "Contratos firm.",
    pip: "#1f7a4d",
    bg: "#e7f6ec",
    text: "#1f7a4d",
    border: "#b8e8ca",
  },
  activation_pending: {
    label: "Pend. activación",
    pip: "#1D4ED8",
    bg: "#EFF4FF",
    text: "#1D4ED8",
    border: "#DBE5FF",
  },
  activated: {
    label: "Activo ✓",
    pip: "#1f7a4d",
    bg: "#e7f6ec",
    text: "#1f7a4d",
    border: "#b8e8ca",
  },
  rejected: {
    label: "Rechazado",
    pip: "#d1622f",
    bg: "#fef2f2",
    text: "#d1622f",
    border: "#fbd5c5",
  },
  archived: {
    label: "Archivado",
    pip: "#5B7168",
    bg: "#F3F7F4",
    text: "#5B7168",
    border: "#E4ECE7",
  },
}

const PRODUCT_MAP: Record<
  string,
  { label: string; bg: string; text: string; border: string }
> = {
  cards: {
    label: "Tarjetas",
    bg: "#EEF2FF",
    text: "#4338CA",
    border: "#E0E5FF",
  },
  terminals: {
    label: "Terminal",
    bg: "#F0FDFA",
    text: "#0F766E",
    border: "#CCF0EA",
  },
}

type FilterTab = "all" | "review" | "changes" | "approved"

const FILTER_STATUSES: Record<FilterTab, string[]> = {
  all: [],
  review: [
    "documents_pending",
    "in_compliance_review",
    "in_provider_review",
    "activation_pending",
    "contracts_pending",
  ],
  changes: ["changes_requested", "provider_changes_requested"],
  approved: [
    "approved_compliance",
    "approved_provider",
    "contracts_signed",
    "activated",
  ],
}

export function ClientsTable({ companies, isSuperAdmin }: Props) {
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<FilterTab>("all")
  const router = useRouter()

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
      all: companies.length,
      review: companies.filter((c) =>
        c.applications.some((a) => FILTER_STATUSES.review.includes(a.status))
      ).length,
      changes: companies.filter((c) =>
        c.applications.some((a) => FILTER_STATUSES.changes.includes(a.status))
      ).length,
      approved: companies.filter((c) =>
        c.applications.some((a) => FILTER_STATUSES.approved.includes(a.status))
      ).length,
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
      {/* Toolbar */}
      <div className="flex items-center gap-2.5 mb-4 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search
            className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none"
            style={{ color: "#8A9E94" }}
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por razón social o RFC…"
            className="w-full pl-10 pr-4 py-2.5 text-sm outline-none transition-all"
            style={{
              background: "#fff",
              borderColor: "#E4ECE7",
              border: "1px solid #E4ECE7",
              borderRadius: 12,
              color: "#0F2A22",
              fontFamily: "var(--font-sans)",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "rgba(168,248,152,.60)"
              e.currentTarget.style.boxShadow = "0 0 0 4px rgba(168,248,152,.25)"
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "#E4ECE7"
              e.currentTarget.style.boxShadow = "none"
            }}
          />
        </div>

        {/* Filter chips */}
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium transition-all"
            style={{
              borderRadius: 999,
              border: "1px solid transparent",
              ...(filter === tab.key
                ? { background: "#e7f6ec", borderColor: "transparent", color: "#1f7a4d", fontWeight: 600 }
                : { background: "#fff", borderColor: "#E4ECE7", color: "#5B7168" }),
            }}
          >
            {tab.label}
            <span className="font-mono opacity-60 text-[11px]">{counts[tab.key]}</span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div
        className="overflow-hidden"
        style={{
          background: "#fff",
          border: "1px solid #E4ECE7",
          borderRadius: 22,
          boxShadow: "0 1px 2px rgba(15,42,34,.04), 0 1px 3px rgba(15,42,34,.06)",
        }}
      >
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr style={{ background: "#F8FAF9" }}>
                {["Empresa", "RFC", "Producto(s) / Estado", "Registro", ""].map((h, i) => (
                  <th
                    key={i}
                    className="px-5 py-3 whitespace-nowrap border-b"
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      color: "#8A9E94",
                      borderColor: "#E4ECE7",
                      textAlign: "left",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-16 text-center"
                    style={{ color: "#8A9E94", fontSize: 14 }}
                  >
                    {search ? `Sin resultados para "${search}"` : "Sin clientes registrados"}
                  </td>
                </tr>
              ) : (
                filtered.map((company) => {
                  const apps = company.applications ?? []
                  const reviewHref = apps[0]
                    ? `/admin/applications/${apps[0].id}/review`
                    : null
                  const timeAgo = formatDistanceToNow(new Date(company.created_at), {
                    addSuffix: true,
                    locale: es,
                  })
                  return (
                    <tr
                      key={company.id}
                      className="table-row-hover border-b last:border-0"
                      style={{ borderColor: "#E4ECE7" }}
                      onClick={() => {
                        if (reviewHref) router.push(reviewHref)
                      }}
                    >
                      <td className="px-5 py-3.5">
                        <div
                          className="font-semibold text-sm leading-tight"
                          style={{ color: "#0F2A22", letterSpacing: "-0.01em" }}
                        >
                          {company.legal_name}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 hidden sm:table-cell">
                        <span
                          className="text-sm"
                          style={{
                            fontFamily: "var(--font-mono, monospace)",
                            color: "#5B7168",
                            letterSpacing: "0.02em",
                          }}
                        >
                          {company.tax_id ?? "—"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex flex-col gap-1.5 items-start">
                          {apps.length === 0 ? (
                            <span className="text-xs" style={{ color: "#8A9E94" }}>
                              Sin solicitudes
                            </span>
                          ) : (
                            apps.map((app) => {
                              const prod = app.products?.code ? PRODUCT_MAP[app.products.code] : null
                              const st = STATUS_MAP[app.status] ?? STATUS_MAP.draft
                              return (
                                <div key={app.id} className="flex items-center gap-1.5 flex-wrap">
                                  {prod && (
                                    <span
                                      className="inline-flex items-center px-2 py-0.5 text-[11px] font-semibold border"
                                      style={{
                                        borderRadius: 999,
                                        background: prod.bg,
                                        color: prod.text,
                                        borderColor: prod.border,
                                      }}
                                    >
                                      {prod.label}
                                    </span>
                                  )}
                                  <span
                                    className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-semibold border"
                                    style={{
                                      borderRadius: 999,
                                      background: st.bg,
                                      color: st.text,
                                      borderColor: st.border,
                                    }}
                                  >
                                    <span
                                      className="w-1.5 h-1.5 rounded-full shrink-0"
                                      style={{ background: st.pip }}
                                    />
                                    {st.label}
                                  </span>
                                </div>
                              )
                            })
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 hidden md:table-cell">
                        <span className="text-sm" style={{ color: "#5B7168" }}>
                          {timeAgo}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div
                          className="flex items-center justify-end gap-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {reviewHref && (
                            <Link
                              href={reviewHref}
                              className="inline-flex items-center gap-1 text-xs font-semibold"
                              style={{ color: "#1f7a4d" }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              Ver
                              <span className="row-arrow">→</span>
                            </Link>
                          )}
                          {isSuperAdmin && (
                            <DeleteClientButton
                              companyId={company.id}
                              legalName={company.legal_name}
                              taxId={company.tax_id ?? ""}
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
