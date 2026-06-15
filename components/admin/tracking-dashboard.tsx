"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { ContractManager } from "./contract-manager"
import { EmailComposer } from "./email-composer"
import { exportExpediente } from "@/app/(admin)/admin/tracking/export-action"
import * as XLSX from "xlsx"

// ── Types ──────────────────────────────────────────────
type DocItem = {
  name: string
  status: string
  isRequired: boolean
  code: string
  fieldType: string
  isChecked: boolean
}

type BitacoraEntry = {
  createdAt: string
  label: string
  actorName: string
}

export type AppRow = {
  id: string
  status: string
  transferStatus: string
  updatedAt: string
  company: {
    legalName: string
    taxId: string | null
    personType: string | null
    contactEmail: string | null
  }
  product: { code: string; name: string }
  docs: { total: number; uploaded: number; approved: number }
  contracts: {
    payefy: string | null
    transfer_increase: string | null
    transfer_contract: string | null
  }
  documentList: DocItem[]
  bitacora: BitacoraEntry[]
}

// ── Status labels ───────────────────────────────────────
const STATUS_LABELS: Record<string, string> = {
  draft: "Borrador",
  documents_pending: "Docs enviados",
  in_compliance_review: "En revisión",
  changes_requested: "Cambios sol.",
  approved_compliance: "Aprobado",
  in_provider_review: "En rev. proveedor",
  provider_changes_requested: "Cambios proveedor",
  approved_provider: "Aprobado proveedor",
  contracts_pending: "Contratos pend.",
  contracts_signed: "Contratos firmados",
  activation_pending: "Pend. activación",
  activated: "Activado",
  rejected: "Rechazado",
}

const AUDIT_ACTION_LABELS: Record<string, string> = {
  application_submitted: "Expediente enviado",
  status_changed: "Cambio de estatus",
  document_approved: "Documento aprobado",
  document_rejected: "Documento rechazado",
  changes_requested: "Cambios solicitados",
  application_activated: "Expediente activado",
  application_rejected: "Expediente rechazado",
  terms_accepted: "T&C aceptados",
}

const TRANSFER_STATUS_LABELS: Record<string, string> = {
  not_sent: "—",
  sent: "Enviado",
  changes_requested: "Cambios sol.",
  approved: "Aprobado",
}

// ── Status ordering ─────────────────────────────────────
const STATUS_ORDER = [
  "draft","documents_pending","in_compliance_review","changes_requested",
  "approved_compliance","in_provider_review","provider_changes_requested",
  "approved_provider","contracts_pending","contracts_signed",
  "activation_pending","activated","rejected",
]
function statusIndex(s: string) { return STATUS_ORDER.indexOf(s) === -1 ? 0 : STATUS_ORDER.indexOf(s) }

function compliancePill(status: string): { label: string; cls: PillCls } | null {
  const idx = statusIndex(status)
  if (idx < statusIndex("in_compliance_review")) return null
  if (status === "changes_requested") return { label: "Cambios sol.", cls: "warn" }
  if (idx >= statusIndex("approved_compliance")) return { label: "OK", cls: "ok" }
  return { label: "En revisión", cls: "warn" }
}

function transferPill(transferStatus: string): { label: string; cls: PillCls } | null {
  if (transferStatus === "not_sent" || !transferStatus) return null
  if (transferStatus === "approved") return { label: "Aprobado", cls: "ok" }
  if (transferStatus === "changes_requested") return { label: "Cambios sol.", cls: "warn" }
  return { label: "Enviado", cls: "warn" }
}

type DotState = "on" | "mid" | "off"
function contractDotState(contractStatus: string | null): DotState {
  if (!contractStatus || contractStatus === "pending") return "off"
  if (contractStatus === "sent") return "mid"
  if (contractStatus === "signed") return "on"
  if (contractStatus === "not_applicable") return "off"
  return "off"
}

function progressColor(pct: number) {
  if (pct >= 80) return "#0f6e56"
  if (pct >= 50) return "#92500b"
  return "#a32d2d"
}

type PillCls = "ok" | "warn" | "bad" | "neu"
function statusPillCls(status: string): PillCls {
  if (status === "activated") return "ok"
  if (status === "rejected") return "bad"
  if (["changes_requested","provider_changes_requested"].includes(status)) return "bad"
  if (statusIndex(status) >= statusIndex("approved_compliance")) return "ok"
  if (statusIndex(status) >= statusIndex("in_compliance_review")) return "warn"
  return "neu"
}

// ── Filter chips ────────────────────────────────────────
type Filter = "all" | "proceso" | "transfer" | "firmar" | "completadas"
const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "Todas" },
  { id: "proceso", label: "En proceso" },
  { id: "transfer", label: "Con proveedor" },
  { id: "firmar", label: "Por firmar" },
  { id: "completadas", label: "Completadas" },
]

function matchesFilter(app: AppRow, filter: Filter): boolean {
  if (filter === "all") return true
  if (filter === "proceso") return statusIndex(app.status) <= statusIndex("approved_compliance")
  if (filter === "transfer") return ["in_provider_review","provider_changes_requested","approved_provider"].includes(app.status)
  if (filter === "firmar") return ["contracts_pending","contracts_signed","activation_pending"].includes(app.status)
  if (filter === "completadas") return app.status === "activated"
  return true
}

// ── Atoms ───────────────────────────────────────────────
function Pill({ label, cls }: { label: string; cls: PillCls }) {
  const styles: Record<PillCls, { background: string; color: string }> = {
    ok:  { background: "#e1f5ee", color: "#0f6e56" },
    warn:{ background: "#faeeda", color: "#92500b" },
    bad: { background: "#fceaea", color: "#a32d2d" },
    neu: { background: "#eef1ef", color: "#5f6b64" },
  }
  return (
    <span style={{ ...styles[cls], display:"inline-flex", alignItems:"center", fontSize:12,
      padding:"3px 9px", borderRadius:999, whiteSpace:"nowrap", fontWeight:500 }}>
      {label}
    </span>
  )
}

function Dot({ state, letter }: { state: DotState; letter: string }) {
  const styles: Record<DotState, { background: string; color: string }> = {
    on:  { background:"#e1f5ee", color:"#0f6e56" },
    mid: { background:"#faeeda", color:"#92500b" },
    off: { background:"#eef1ef", color:"#b4bcb7" },
  }
  return (
    <span style={{ ...styles[state], width:19, height:19, borderRadius:"50%",
      display:"inline-flex", alignItems:"center", justifyContent:"center",
      fontSize:9, fontWeight:700 }}>
      {letter}
    </span>
  )
}

function DocStatusIcon({ doc }: { doc: DocItem }) {
  // check_or_upload: if is_checked, show green check (checkbox style)
  if (doc.fieldType === "check_or_upload" && doc.isChecked) {
    return (
      <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="#0f6e56" strokeWidth={2}>
        <rect x={4} y={4} width={16} height={16} rx={3} />
        <path d="m8 12 3 3 5-6" />
      </svg>
    )
  }
  if (doc.status === "approved") {
    return (
      <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="#0f6e56" strokeWidth={2}>
        <circle cx={12} cy={12} r={9} /><path d="m8 12 3 3 5-6" />
      </svg>
    )
  }
  if (doc.status === "rejected" || doc.status === "changes_requested") {
    return (
      <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="#a32d2d" strokeWidth={2}>
        <circle cx={12} cy={12} r={9} /><path d="M12 7v6M12 16v.5" />
      </svg>
    )
  }
  if (doc.status === "pending_review") {
    return (
      <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="#92500b" strokeWidth={2}>
        <circle cx={12} cy={12} r={9} /><path d="M12 7v5l3 2" />
      </svg>
    )
  }
  return (
    <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="#b4bcb7" strokeWidth={2}>
      <rect x={4} y={4} width={16} height={16} rx={3} />
    </svg>
  )
}

function auditEntryLabel(entry: BitacoraEntry): string {
  const mapped = AUDIT_ACTION_LABELS[entry.label]
  return mapped ?? entry.label
}

// ── Detail panel ────────────────────────────────────────
function ExpedientePanel({ app, onClose }: { app: AppRow; onClose: () => void }) {
  const pct = app.docs.total > 0 ? Math.round((app.docs.uploaded / app.docs.total) * 100) : 0
  const [showEmailComposer, setShowEmailComposer] = useState(false)
  const [exporting, setExporting] = useState(false)

  async function handleExport() {
    setExporting(true)
    try {
      const result = await exportExpediente(app.id)
      if (result.error || !result.base64 || !result.filename) {
        alert(result.error ?? "Error al exportar")
        return
      }
      const binary = atob(result.base64)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
      const blob = new Blob([bytes.buffer], { type: "application/zip" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = result.filename
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

  return (
    <section style={{ background:"#fff", border:"1px solid #d3dbd6", borderRadius:10,
      padding:"20px 22px", marginTop:24 }}>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between",
        gap:14, flexWrap:"wrap", marginBottom:6 }}>
        <div>
          <div style={{ display:"flex", alignItems:"center", gap:11, flexWrap:"wrap" }}>
            <h2 style={{ margin:0, fontSize:17, fontWeight:600, color:"#16201b" }}>
              {app.company.legalName}
            </h2>
            <Pill label={`${pct}% completo`} cls={pct >= 80 ? "ok" : pct >= 50 ? "warn" : "bad"} />
          </div>
          <p style={{ fontSize:12, color:"#5f6b64", margin:"4px 0 0" }}>
            {app.company.taxId ? `RFC: ${app.company.taxId} · ` : ""}
            {app.company.personType === "persona_fisica" ? "Persona Física · " : app.company.personType === "persona_moral" ? "Persona Moral · " : ""}
            {STATUS_LABELS[app.status] ?? app.status}
          </p>
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
          <button
            onClick={() => setShowEmailComposer(true)}
            style={{ background:"#004238", color:"#AEFF99", border:"none",
              borderRadius:7, fontSize:13, padding:"8px 14px", cursor:"pointer",
              display:"inline-flex", alignItems:"center", gap:6, fontWeight:600 }}
          >
            <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2}>
              <rect x={2} y={5} width={20} height={14} rx={2}/><path d="m22 7-10 5L2 7"/>
            </svg>
            Enviar correo
          </button>
          <button
            onClick={handleExport}
            disabled={exporting}
            style={{ background:"#fff", color:"#004238", border:"1px solid #004238",
              borderRadius:7, fontSize:13, padding:"8px 14px", cursor:exporting ? "not-allowed" : "pointer",
              display:"inline-flex", alignItems:"center", gap:6, fontWeight:500, opacity: exporting ? 0.6 : 1 }}
          >
            <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            {exporting ? "Exportando..." : "Exportar ZIP"}
          </button>
          <Link
            href={`/admin/applications/${app.id}/review`}
            style={{ background:"#004238", color:"#fff", border:"1px solid #004238",
              borderRadius:7, fontSize:13, padding:"8px 14px", textDecoration:"none",
              display:"inline-flex", alignItems:"center", gap:6, fontWeight:500 }}
          >
            Ver expediente completo →
          </Link>
          <button onClick={onClose} style={{ background:"#fff", color:"#5f6b64",
            border:"1px solid #d3dbd6", borderRadius:7, fontSize:13, padding:"8px 14px", cursor:"pointer" }}>
            Cerrar
          </button>
        </div>
        {showEmailComposer && (
          <EmailComposer
            applicationId={app.id}
            clientEmail={app.company.contactEmail ?? undefined}
            onClose={() => setShowEmailComposer(false)}
          />
        )}
      </div>

      <p style={{ fontSize:11, color:"#8a948e", margin:"8px 0 18px",
        display:"flex", alignItems:"center", gap:6 }}>
        <svg viewBox="0 0 24 24" width={13} height={13} fill="none" stroke="currentColor" strokeWidth={2}>
          <rect x={2} y={5} width={20} height={14} rx={2} /><path d="m22 7-10 5L2 7" />
        </svg>
        Correos salen desde a.santibanez@payefy.me
        {app.company.contactEmail && ` · Cliente: ${app.company.contactEmail}`}
      </p>

      {/* Two-column grid — stacks on mobile */}
      <div className="grid grid-cols-1 sm:grid-cols-[1.2fr_1fr] gap-x-8">
        {/* Documentos */}
        <div>
          <p style={{ fontSize:11, textTransform:"uppercase", letterSpacing:".04em",
            color:"#5f6b64", margin:"0 0 6px", fontWeight:600 }}>
            Documentos · {app.docs.total}
          </p>
          {app.documentList.length === 0 ? (
            <p style={{ fontSize:13, color:"#8a948e" }}>Sin documentos registrados</p>
          ) : (
            app.documentList.map((doc, i) => (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:9,
                padding:"5px 0", fontSize:13,
                color: doc.status === "pending_upload" && !doc.isChecked ? "#8a948e" : "#16201b" }}>
                <DocStatusIcon doc={doc} />
                {doc.name}
                {doc.fieldType === "check_or_upload" && (
                  <span style={{ fontSize:10, color:"#8a948e" }}>(casilla o doc)</span>
                )}
                {!doc.isRequired && (
                  <span style={{ fontSize:10, color:"#b4bcb7" }}>(opc.)</span>
                )}
              </div>
            ))
          )}
        </div>

        {/* Contratos + Bitácora */}
        <div>
          {app.product.code === "cards" && (
            <>
              <ContractManager applicationId={app.id} contracts={app.contracts} />
              <div style={{ marginBottom:16 }} />
            </>
          )}

          <p style={{ fontSize:11, textTransform:"uppercase", letterSpacing:".04em",
            color:"#5f6b64", margin:"0 0 6px", fontWeight:600 }}>
            Bitácora
          </p>
          {app.bitacora.length === 0 ? (
            <p style={{ fontSize:12, color:"#8a948e" }}>Sin actividad registrada</p>
          ) : (
            <div style={{ fontSize:12, color:"#5f6b64", lineHeight:1.7 }}>
              {app.bitacora.map((entry, i) => (
                <div key={i}>
                  <span style={{ color:"#16201b", fontWeight:600 }}>
                    {format(new Date(entry.createdAt), "dd MMM", { locale: es })}
                  </span>
                  {" — "}
                  {auditEntryLabel(entry)}
                  {entry.actorName !== "Sistema" && (
                    <span style={{ color:"#8a948e" }}> ({entry.actorName})</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

// ── Main dashboard ──────────────────────────────────────
export function TrackingDashboard({ applications }: { applications: AppRow[] }) {
  const [activeTab, setActiveTab] = useState<"cards" | "terminals">("cards")
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<Filter>("all")
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const tabApps = useMemo(
    () => applications.filter((a) => a.product.code === activeTab),
    [applications, activeTab]
  )

  const filtered = useMemo(() => {
    let rows = tabApps.filter((a) => matchesFilter(a, filter))
    if (search.trim()) {
      const q = search.toLowerCase()
      rows = rows.filter(
        (a) => a.company.legalName.toLowerCase().includes(q) ||
               (a.company.taxId ?? "").toLowerCase().includes(q)
      )
    }
    return rows
  }, [tabApps, filter, search])

  const selectedApp = filtered.find((a) => a.id === selectedId) ?? null

  // KPIs
  const active = tabApps.filter((a) => a.status !== "activated" && a.status !== "rejected")
  const avgPct = active.length > 0
    ? Math.round(active.reduce((sum, a) => sum + (a.docs.total > 0 ? (a.docs.uploaded / a.docs.total) * 100 : 0), 0) / active.length)
    : 0
  const waitingTransfer = tabApps.filter((a) => a.transferStatus === "sent").length
  const pendingSign = tabApps.filter((a) =>
    ["contracts_pending","contracts_signed","activation_pending"].includes(a.status)
  ).length

  const isCards = activeTab === "cards"

  function handleExportExcel() {
    const DOT_LABEL: Record<DotState, string> = { on: "Firmado", mid: "Enviado", off: "—" }
    const rows = filtered.map((app) => {
      const pct = app.docs.total > 0 ? Math.round((app.docs.uploaded / app.docs.total) * 100) : 0
      const compliance = compliancePill(app.status)
      const transfer = transferPill(app.transferStatus)
      const dotP = contractDotState(app.contracts.payefy)
      const dotA = contractDotState(app.contracts.transfer_increase)
      const dotT = contractDotState(app.contracts.transfer_contract)
      return {
        Empresa: app.company.legalName,
        RFC: app.company.taxId ?? "",
        Producto: app.product.name,
        "Avance%": pct,
        Docs: `${app.docs.uploaded}/${app.docs.total}`,
        Compliance: compliance?.label ?? "—",
        Transfer: transfer?.label ?? "—",
        "Contrato P": DOT_LABEL[dotP],
        "Contrato A": DOT_LABEL[dotA],
        "Contrato T": DOT_LABEL[dotT],
        Estatus: STATUS_LABELS[app.status] ?? app.status,
        "Última act.": format(new Date(app.updatedAt), "dd/MM/yyyy", { locale: es }),
      }
    })
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Seguimiento")
    const date = format(new Date(), "yyyyMMdd")
    XLSX.writeFile(wb, `Seguimiento_${activeTab}_${date}.xlsx`)
  }

  return (
    <div style={{ padding:"20px 24px 64px", maxWidth:1280, margin:"0 auto",
      fontFamily:"-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      fontSize:14, color:"#16201b" }}>

      {/* Header */}
      <header style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
        gap:16, marginBottom:22, flexWrap:"wrap" }}>
        <div>
          <h1 style={{ margin:0, fontSize:18, fontWeight:600 }}>Seguimiento de altas</h1>
          <p style={{ margin:"3px 0 0", fontSize:12, color:"#5f6b64" }}>Panel interno · Payefy Equipo</p>
        </div>
        <div style={{ display:"flex", gap:4, background:"#fff", border:"1px solid #e3e8e5",
          borderRadius:999, padding:3 }}>
          {(["cards","terminals"] as const).map((tab) => (
            <button key={tab} onClick={() => { setActiveTab(tab); setSelectedId(null); setFilter("all"); setSearch("") }}
              style={{ fontSize:13, padding:"6px 15px", borderRadius:999, border:"none", cursor:"pointer",
                fontWeight: activeTab === tab ? 600 : 400,
                background: activeTab === tab ? "#004238" : "transparent",
                color: activeTab === tab ? "#fff" : "#5f6b64" }}>
              {tab === "cards" ? "Tarjetas" : "Terminales"}
            </button>
          ))}
        </div>
      </header>

      {/* KPIs */}
      <section style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",
        gap:12, marginBottom:20 }}>
        {[
          { label:"En proceso", value: active.length, sub:"solicitudes activas" },
          { label:"Avance promedio", value:`${avgPct}%`, sub:"docs completados" },
          { label:"Enviado a proveedor", value: waitingTransfer, sub:"esperando respuesta" },
          { label:"Pendientes de firma", value: pendingSign, sub:"contratos por cerrar" },
        ].map((k) => (
          <div key={k.label} style={{ background:"#fff", border:"1px solid #e3e8e5", borderRadius:10, padding:"14px 16px" }}>
            <p style={{ fontSize:12, color:"#5f6b64", margin:0 }}>{k.label}</p>
            <p style={{ fontSize:26, fontWeight:600, margin:"4px 0 0", letterSpacing:"-.4px" }}>{k.value}</p>
            <p style={{ fontSize:11, color:"#8a948e", marginTop:2 }}>{k.sub}</p>
          </div>
        ))}
      </section>

      {/* Toolbar */}
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14, flexWrap:"wrap" }}>
        <div style={{ flex:1, minWidth:200, display:"flex", alignItems:"center", gap:8,
          background:"#fff", border:"1px solid #e3e8e5", borderRadius:7,
          padding:"8px 12px", color:"#8a948e", fontSize:13 }}>
          <svg viewBox="0 0 24 24" width={15} height={15} fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx={11} cy={11} r={7}/><path d="m21 21-4.3-4.3"/>
          </svg>
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar empresa o RFC…"
            style={{ border:"none", outline:"none", fontSize:13, color:"#16201b",
              background:"transparent", flex:1, minWidth:0 }} />
        </div>
        {FILTERS.map((f) => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            style={{ fontSize:12, padding:"7px 13px",
              border: filter === f.id ? "1px solid #004238" : "1px solid #e3e8e5",
              background: filter === f.id ? "#e7f0ea" : "#fff",
              borderRadius:7, color: filter === f.id ? "#004238" : "#5f6b64",
              cursor:"pointer", whiteSpace:"nowrap", fontWeight: filter === f.id ? 600 : 400 }}>
            {f.label}
          </button>
        ))}
        <button
          onClick={handleExportExcel}
          disabled={filtered.length === 0}
          style={{ fontSize:12, padding:"7px 13px", border:"1px solid #e3e8e5",
            background:"#fff", borderRadius:7, color:"#5f6b64", cursor:"pointer",
            whiteSpace:"nowrap", display:"inline-flex", alignItems:"center", gap:5,
            opacity: filtered.length === 0 ? 0.4 : 1 }}>
          <svg viewBox="0 0 24 24" width={13} height={13} fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/>
            <polyline points="9 15 12 18 15 15"/>
          </svg>
          Exportar Excel ({filtered.length})
        </button>
      </div>

      {/* Table */}
      <div style={{ background:"#fff", border:"1px solid #e3e8e5", borderRadius:10, overflow:"auto" }}>
        {filtered.length === 0 ? (
          <p style={{ padding:"32px 20px", textAlign:"center", color:"#8a948e" }}>
            No hay solicitudes que coincidan con los filtros seleccionados.
          </p>
        ) : (
          <table style={{ borderCollapse:"collapse", width:"100%",
            minWidth: isCards ? 920 : 700, fontSize:13 }}>
            <thead>
              <tr>
                {[
                  "Empresa",
                  "Avance",
                  "Docs",
                  ...(isCards
                    ? ["Compliance","Proveedor","Contratos · P · A · T"]
                    : ["Revisión"]),
                  "Estatus",
                  "",
                ].map((h) => (
                  <th key={h} style={{ position:"sticky", top:0, background:"#fff",
                    textAlign:"left", fontWeight:600, color:"#5f6b64", fontSize:11,
                    letterSpacing:".03em", textTransform:"uppercase",
                    padding:"12px 14px", borderBottom:"1px solid #d3dbd6", whiteSpace:"nowrap" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((app) => {
                const pct = app.docs.total > 0
                  ? Math.round((app.docs.uploaded / app.docs.total) * 100) : 0
                const compliance = compliancePill(app.status)
                const transfer = transferPill(app.transferStatus)
                const dotP = contractDotState(app.contracts.payefy)
                const dotA = contractDotState(app.contracts.transfer_increase)
                const dotT = contractDotState(app.contracts.transfer_contract)
                const isSelected = selectedId === app.id

                return (
                  <tr key={app.id}
                    onClick={() => setSelectedId(isSelected ? null : app.id)}
                    style={{ borderBottom:"1px solid #e3e8e5",
                      background: isSelected ? "#e7f0ea" : undefined, cursor:"pointer" }}
                    onMouseEnter={(e) => { if (!isSelected) (e.currentTarget as HTMLTableRowElement).style.background = "#fafcfb" }}
                    onMouseLeave={(e) => { if (!isSelected) (e.currentTarget as HTMLTableRowElement).style.background = "" }}>

                    {/* Empresa */}
                    <td style={{ padding:"13px 14px", fontWeight:600 }}>
                      {app.company.legalName}
                      {app.company.taxId && (
                        <span style={{ display:"block", fontSize:11, color:"#8a948e",
                          fontFamily:"monospace", marginTop:1, fontWeight:400 }}>
                          {app.company.taxId}
                        </span>
                      )}
                    </td>

                    {/* Avance */}
                    <td style={{ padding:"13px 14px" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:9 }}>
                        <div style={{ width:62, height:6, borderRadius:999,
                          background:"#eef1ef", overflow:"hidden" }}>
                          <div style={{ height:"100%", width:`${pct}%`, borderRadius:999,
                            background: progressColor(pct) }} />
                        </div>
                        <span style={{ fontVariantNumeric:"tabular-nums", color:"#5f6b64", minWidth:32 }}>
                          {pct}%
                        </span>
                      </div>
                    </td>

                    {/* Docs */}
                    <td style={{ padding:"13px 14px", color:"#5f6b64", fontVariantNumeric:"tabular-nums" }}>
                      {app.docs.uploaded}/{app.docs.total}
                    </td>

                    {isCards ? (
                      <>
                        {/* Compliance */}
                        <td style={{ padding:"13px 14px" }}>
                          {compliance ? <Pill label={compliance.label} cls={compliance.cls} />
                            : <span style={{ color:"#b4bcb7" }}>—</span>}
                        </td>

                        {/* Proveedor */}
                        <td style={{ padding:"13px 14px" }}>
                          {transfer ? <Pill label={transfer.label} cls={transfer.cls} />
                            : <span style={{ color:"#b4bcb7" }}>—</span>}
                        </td>

                        {/* P·A·T dots */}
                        <td style={{ padding:"13px 14px" }}>
                          <div style={{ display:"flex", gap:5 }}>
                            <Dot state={dotP} letter="P" />
                            <Dot state={dotA} letter="A" />
                            <Dot state={dotT} letter="T" />
                          </div>
                        </td>
                      </>
                    ) : (
                      <td style={{ padding:"13px 14px" }}>
                        {compliance ? <Pill label={compliance.label} cls={compliance.cls} />
                          : <span style={{ color:"#b4bcb7" }}>—</span>}
                      </td>
                    )}

                    {/* Estatus */}
                    <td style={{ padding:"13px 14px" }}>
                      <Pill label={STATUS_LABELS[app.status] ?? app.status}
                        cls={statusPillCls(app.status)} />
                    </td>

                    {/* Link */}
                    <td style={{ padding:"13px 14px", textAlign:"right" }}
                      onClick={(e) => e.stopPropagation()}>
                      <Link href={`/admin/applications/${app.id}/review`}
                        style={{ display:"inline-flex", alignItems:"center", gap:6,
                          fontSize:12, padding:"6px 11px", border:"1px solid #d3dbd6",
                          background:"#fff", borderRadius:7, color:"#16201b", textDecoration:"none" }}>
                        <svg viewBox="0 0 24 24" width={14} height={14} fill="none"
                          stroke="currentColor" strokeWidth={2}>
                          <path d="m22 7-10 5L2 7"/><rect x={2} y={5} width={20} height={14} rx={2}/>
                        </svg>
                        Revisar
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Legend — cards only */}
      {isCards && (
        <div style={{ display:"flex", gap:18, flexWrap:"wrap", fontSize:12, color:"#8a948e",
          margin:"10px 2px 26px", alignItems:"center" }}>
          <span style={{ display:"flex", alignItems:"center", gap:5 }}><Dot state="on" letter="P"/> firmado</span>
          <span style={{ display:"flex", alignItems:"center", gap:5 }}><Dot state="mid" letter="A"/> enviado / pend. firma</span>
          <span style={{ display:"flex", alignItems:"center", gap:5 }}><Dot state="off" letter="T"/> no iniciado</span>
          <span style={{ marginLeft:"auto" }}>P = contrato Payefy · A = carta Transfer · T = contrato Transfer</span>
        </div>
      )}

      {/* Detail panel */}
      {selectedApp && (
        <ExpedientePanel app={selectedApp} onClose={() => setSelectedId(null)} />
      )}
    </div>
  )
}
