"use client"

import { useMemo, useState } from "react"
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
    pip: "#334155",
    bg: "#F1F5F9",
    text: "#334155",
    border: "#E2E8F0",
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
    pip: "#92400E",
    bg: "#FFF7ED",
    text: "#92400E",
    border: "#FCEBD2",
  },
  approved_compliance: {
    label: "Aprobado",
    pip: "#047857",
    bg: "#E7F8EF",
    text: "#047857",
    border: "#CBEFDB",
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
    pip: "#92400E",
    bg: "#FFF7ED",
    text: "#92400E",
    border: "#FCEBD2",
  },
  approved_provider: {
    label: "Aprobado prov.",
    pip: "#047857",
    bg: "#E7F8EF",
    text: "#047857",
    border: "#CBEFDB",
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
    pip: "#047857",
    bg: "#E7F8EF",
    text: "#047857",
    border: "#CBEFDB",
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
    pip: "#047857",
    bg: "#E7F8EF",
    text: "#047857",
    border: "#CBEFDB",
  },
  rejected: {
    label: "Rechazado",
    pip: "#B91C1C",
    bg: "#FEF2F2",
    text: "#B91C1C",
    border: "#FBDADA",
  },
  archived: {
    label: "Archivado",
    pip: "#334155",
    bg: "#F1F5F9",
    text: "#334155",
    border: "#E2E8F0",
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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return companies.filter((c) => {
      const matchSearch =
        !q ||
        c.legal_name.toLowerCase().includes(q) ||
        (c.tax_id ?? "").toLowerCase().includes(q)
      const matchFilter =
        filter === "all" ||
        c.applications.some((a) =>
          FILTER_STATUSES[filter].includes(a.status)
        )
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
        c.applications.some((a) =>
          FILTER_STATUSES.changes.includes(a.status)
        )
      ).length,
      approved: companies.filter((c) =>
        c.applications.some((a) =>
          FILTER_STATUSES.approved.includes(a.status)
        )
      ).length,
    }),
    [companies]
  )

  const tabs: { key: FilterTab; label: string }[] = [
    { key: "all", label: "Todos" },
    { key: "review", label: "En revisión" },
    { key: "changes", label: "Cambios" },
    { key: "approved", label: "Aprobados" },
  ]

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center gap-2.5 mb-4 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none"
            style={{ color: "#8A99A8" }}
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por razón social o RFC…"
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border outline-none transition-all"
            style={{
              background: "#fff",
              borderColor: "#E7ECF1",
              color: "#0F1B2A",
              fontFamily: "var(--font-sans)",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "#00B36A"
              e.currentTarget.style.boxShadow =
                "0 0 0 3px rgba(0,179,106,0.12)"
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "#E7ECF1"
              e.currentTarget.style.boxShadow = "none"
            }}
          />
        </div>

        {/* Filter chips */}
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-full border transition-all"
            style={
              filter === tab.key
                ? {
                    background: "#E7FAF0",
                    borderColor: "transparent",
                    color: "#00B36A",
                    fontWeight: 600,
                  }
                : {
                    background: "#fff",
                    borderColor: "#E7ECF1",
                    color: "#5A6B7B",
                  }
            }
          >
            {tab.label}
            <span className="font-mono opacity-60 text-[11px]">
              {counts[tab.key]}
            </span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{
          background: "#fff",
          borderColor: "#E7ECF1",
          boxShadow: "0 1px 2px rgba(16,30,45,0.05)",
        }}
      >
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr style={{ background: "#FBFCFD" }}>
                {["Empresa", "RFC", "Producto(s) / Estado", "Registro", "Acción"].map(
                  (h, i) => (
                    <th
                      key={h}
                      className="px-5 py-3 whitespace-nowrap border-b"
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        letterSpacing: "0.05em",
                        textTransform: "uppercase",
                        color: "#8A99A8",
                        borderColor: "#E7ECF1",
                        textAlign: i === 4 ? "right" : "left",
                      }}
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-16 text-center"
                    style={{ color: "#8A99A8", fontSize: 14 }}
                  >
                    {search
                      ? `Sin resultados para "${search}"`
                      : "Sin clientes registrados"}
                  </td>
                </tr>
              ) : (
                filtered.map((company) => {
                  const apps = company.applications ?? []
                  const timeAgo = formatDistanceToNow(
                    new Date(company.created_at),
                    { addSuffix: true, locale: es }
                  )
                  return (
                    <tr
                      key={company.id}
                      className="table-row-hover border-b last:border-0"
                      style={{ borderColor: "#E7ECF1" }}
                    >
                      <td className="px-5 py-3.5">
                        <div
                          className="font-semibold text-sm leading-tight"
                          style={{
                            color: "#0F1B2A",
                            letterSpacing: "-0.01em",
                          }}
                        >
                          {company.legal_name}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 hidden sm:table-cell">
                        <span
                          className="text-sm"
                          style={{
                            fontFamily:
                              "var(--font-mono, monospace)",
                            color: "#5A6B7B",
                            letterSpacing: "0.02em",
                          }}
                        >
                          {company.tax_id ?? "—"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex flex-col gap-1.5 items-start">
                          {apps.length === 0 ? (
                            <span
                              className="text-xs"
                              style={{ color: "#8A99A8" }}
                            >
                              Sin solicitudes
                            </span>
                          ) : (
                            apps.map((app) => {
                              const prod =
                                app.products?.code
                                  ? PRODUCT_MAP[app.products.code]
                                  : null
                              const st =
                                STATUS_MAP[app.status] ??
                                STATUS_MAP.draft
                              return (
                                <div
                                  key={app.id}
                                  className="flex items-center gap-1.5 flex-wrap"
                                >
                                  {prod && (
                                    <span
                                      className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border"
                                      style={{
                                        background: prod.bg,
                                        color: prod.text,
                                        borderColor: prod.border,
                                      }}
                                    >
                                      {prod.label}
                                    </span>
                                  )}
                                  <span
                                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold border"
                                    style={{
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
                        <span
                          className="text-sm"
                          style={{ color: "#5A6B7B" }}
                        >
                          {timeAgo}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-2">
                          {apps[0] && (
                            <Link
                              href={`/admin/applications/${apps[0].id}/review`}
                              className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all"
                              style={{
                                background: "#fff",
                                color: "#00B36A",
                                borderColor: "#E7ECF1",
                              }}
                              onMouseEnter={(e) => {
                                ;(
                                  e.currentTarget as HTMLElement
                                ).style.background = "#E7FAF0"
                                ;(
                                  e.currentTarget as HTMLElement
                                ).style.borderColor = "transparent"
                              }}
                              onMouseLeave={(e) => {
                                ;(
                                  e.currentTarget as HTMLElement
                                ).style.background = "#fff"
                                ;(
                                  e.currentTarget as HTMLElement
                                ).style.borderColor = "#E7ECF1"
                              }}
                            >
                              Revisar
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
