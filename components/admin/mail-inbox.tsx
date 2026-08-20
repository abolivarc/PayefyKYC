"use client"

import { useMemo, useState } from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Search, X } from "lucide-react"

export interface MailRow {
  id: string
  sentAt: string
  to: string
  from?: string | null
  direction?: string
  subject: string
  status: string
  error: string | null
  applicationId: string | null
  company: string | null
}

const TABS = [
  { key: "todos", label: "Todos" },
  { key: "recibidos", label: "Recibidos" },
  { key: "clientes", label: "Clientes" },
  { key: "eli", label: "Elizabeth" },
  { key: "fran", label: "Francisco" },
  { key: "yo", label: "Para mí" },
] as const
type TabKey = (typeof TABS)[number]["key"]

function categoria(to: string): TabKey {
  const t = to.toLowerCase()
  if (t.includes("e.lopez@payefy.me")) return "eli"
  if (t.includes("francisco.sosa@payefy.me")) return "fran"
  if (t.includes("a.santibanez@payefy.me")) return "yo"
  return "clientes"
}

export function MailInbox({ mails }: { mails: MailRow[] }) {
  const [tab, setTab] = useState<TabKey>("todos")
  const [search, setSearch] = useState("")
  const [openId, setOpenId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return mails.filter((m) => {
      const esInbound = m.direction === "inbound"
      const matchTab =
        tab === "todos" ||
        (tab === "recibidos" ? esInbound : !esInbound && categoria(m.to) === tab)
      const matchQ =
        !q ||
        m.subject.toLowerCase().includes(q) ||
        m.to.toLowerCase().includes(q) ||
        (m.from ?? "").toLowerCase().includes(q) ||
        (m.company ?? "").toLowerCase().includes(q)
      return matchTab && matchQ
    })
  }, [mails, tab, search])

  const counts = useMemo(() => {
    const c: Record<TabKey, number> = { todos: mails.length, recibidos: 0, clientes: 0, eli: 0, fran: 0, yo: 0 }
    for (const m of mails) {
      if (m.direction === "inbound") c.recibidos++
      else c[categoria(m.to)]++
    }
    return c
  }, [mails])

  return (
    <div>
      {/* Toolbar */}
      <div className="mb-4 space-y-2">
        <div className="relative max-w-xl">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-tertiary" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por asunto, destinatario o empresa…"
            className="h-10 w-full rounded-md border border-border bg-card pl-9 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
          />
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                tab === t.key
                  ? "border-transparent bg-brand-tint font-semibold text-primary"
                  : "border-border bg-card text-muted-foreground hover:bg-secondary"
              }`}
            >
              {t.label}
              <span className="font-mono text-[11px] opacity-60">{counts[t.key]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Lista */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {filtered.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">
            Sin correos con ese filtro. (La bandeja registra desde el 19 ago 2026.)
          </p>
        ) : (
          filtered.map((m, i) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setOpenId(m.id)}
              className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-secondary ${
                i < filtered.length - 1 ? "border-b border-border" : ""
              }`}
            >
              <span
                className="w-36 shrink-0 truncate text-xs font-semibold"
                style={{
                  color:
                    m.direction === "inbound"
                      ? "#B45309"
                      : categoria(m.to) === "clientes"
                        ? "#1f7a4d"
                        : categoria(m.to) === "yo"
                          ? "#8A9E94"
                          : "#1D4ED8",
                }}
                title={m.direction === "inbound" ? `De: ${m.from ?? "?"}` : m.to}
              >
                {m.direction === "inbound" ? (m.from ?? "?").split("@")[0] : m.to.split("@")[0]}
              </span>
              {m.direction === "inbound" && (
                <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                  recibido
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-foreground">
                  {m.subject}
                </span>
                {m.company && (
                  <span className="block truncate text-xs text-muted-foreground">{m.company}</span>
                )}
              </span>
              {m.status === "error" && (
                <span className="shrink-0 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-bold text-red-600">
                  no salió
                </span>
              )}
              <span className="w-28 shrink-0 text-right font-mono text-[11px] text-muted-foreground">
                {format(new Date(m.sentAt), "d MMM HH:mm", { locale: es })}
              </span>
            </button>
          ))
        )}
      </div>

      {openId && <MailViewer id={openId} onClose={() => setOpenId(null)} mails={mails} />}
    </div>
  )
}

function MailViewer({ id, onClose, mails }: { id: string; onClose: () => void; mails: MailRow[] }) {
  const meta = mails.find((m) => m.id === id)
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />
      <div className="relative z-10 flex h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border bg-background shadow-lg">
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">{meta?.subject}</p>
            <p className="truncate text-xs text-muted-foreground">
              {meta?.direction === "inbound" ? `De: ${meta?.from ?? "?"}` : `Para: ${meta?.to}`}
              {meta?.sentAt && ` · ${format(new Date(meta.sentAt), "d MMM yyyy HH:mm", { locale: es })}`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="shrink-0 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {/* El cuerpo llega por API para no cargar 400 HTML completos en la lista */}
        <iframe
          title="Correo"
          src={`/api/admin/email-log/${id}`}
          sandbox=""
          className="h-full w-full flex-1 bg-white"
        />
      </div>
    </div>
  )
}
