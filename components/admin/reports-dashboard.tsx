"use client"

import type { CSSProperties } from "react"
import { useMemo, useState } from "react"
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend,
} from "recharts"

const PRIMARY = "#004238"
const ACCENT = "#AEFF99"
const COLORS = [PRIMARY, "#0f6e56", "#5f6b64", "#2d6b5f", "#1a4a40"]

// ── Types ────────────────────────────────────────────────
export type AppSummary = {
  id: string
  status: string
  createdAt: string
  updatedAt: string
  productCode: string
  productName: string
  docsPct: number
}

export type MonthlyPoint = {
  month: string
  count: number
}

const STATUS_LABELS: Record<string, string> = {
  draft: "Borrador",
  documents_pending: "Docs enviados",
  in_compliance_review: "En revisión",
  changes_requested: "Cambios sol.",
  approved_compliance: "Aprobado comp.",
  in_provider_review: "Con proveedor",
  provider_changes_requested: "Cambios prov.",
  approved_provider: "Aprobado prov.",
  contracts_pending: "Contratos pend.",
  contracts_signed: "Contratos firm.",
  activation_pending: "Pend. activación",
  activated: "Activado",
  rejected: "Rechazado",
}

const STATUS_ORDER = [
  "draft","documents_pending","in_compliance_review","changes_requested",
  "approved_compliance","in_provider_review","provider_changes_requested",
  "approved_provider","contracts_pending","contracts_signed",
  "activation_pending","activated","rejected",
]

// ── KPI card ─────────────────────────────────────────────
function KpiCard({ label, value, sub, accent }: {
  label: string; value: string | number; sub?: string; accent?: boolean
}) {
  return (
    <div style={{ background:"#fff", border:"1px solid #e3e8e5", borderRadius:10,
      padding:"14px 18px", borderTop: accent ? `3px solid ${PRIMARY}` : undefined }}>
      <p style={{ fontSize:12, color:"#5f6b64", margin:0 }}>{label}</p>
      <p style={{ fontSize:28, fontWeight:700, margin:"4px 0 0", letterSpacing:"-.5px",
        color: accent ? PRIMARY : "#16201b" }}>{value}</p>
      {sub && <p style={{ fontSize:11, color:"#8a948e", marginTop:2 }}>{sub}</p>}
    </div>
  )
}

// ── Custom tooltip ───────────────────────────────────────
function ChartTooltip({
  active, payload, label
}: {
  active?: boolean
  payload?: { name: string; value: number }[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background:"#fff", border:"1px solid #d3dbd6", borderRadius:7,
      padding:"8px 12px", fontSize:12 }}>
      {label && <p style={{ fontWeight:600, margin:"0 0 4px" }}>{label}</p>}
      {payload.map((p) => (
        <p key={p.name} style={{ margin:0, color:"#5f6b64" }}>
          {p.name}: <strong>{p.value}</strong>
        </p>
      ))}
    </div>
  )
}

// ── Shared card style ────────────────────────────────────
const card: CSSProperties = {
  background:"#fff", border:"1px solid #e3e8e5", borderRadius:10, padding:"20px 22px"
}
const cardTitle: CSSProperties = {
  fontSize:12, fontWeight:600, textTransform:"uppercase",
  letterSpacing:".04em", color:"#5f6b64", margin:"0 0 16px"
}

// ── Main component ───────────────────────────────────────
interface Props {
  apps: AppSummary[]
  monthlyActivations: MonthlyPoint[]
}

export function ReportsDashboard({ apps, monthlyActivations }: Props) {
  const [productFilter, setProductFilter] = useState<"all" | "cards" | "terminals">("all")
  const [periodDays, setPeriodDays] = useState<30 | 60 | 90 | 0>(0)

  const filtered = useMemo(() => {
    let rows = apps
    if (productFilter !== "all") rows = rows.filter((a) => a.productCode === productFilter)
    if (periodDays > 0) {
      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - periodDays)
      rows = rows.filter((a) => new Date(a.createdAt) >= cutoff)
    }
    return rows
  }, [apps, productFilter, periodDays])

  const totalApps = filtered.length
  const activatedCount = filtered.filter((a) => a.status === "activated").length
  const rejectedCount = filtered.filter((a) => a.status === "rejected").length
  const inProcessCount = filtered.filter((a) => a.status !== "activated" && a.status !== "rejected").length
  const conversionRate = totalApps > 0 ? Math.round((activatedCount / totalApps) * 100) : 0

  const pipelineData = STATUS_ORDER
    .map((s) => ({ label: STATUS_LABELS[s] ?? s, count: filtered.filter((a) => a.status === s).length }))
    .filter((d) => d.count > 0)

  const productData = [
    { name: "Tarjetas", count: filtered.filter((a) => a.productCode === "cards").length },
    { name: "Terminales", count: filtered.filter((a) => a.productCode === "terminals").length },
  ].filter((d) => d.count > 0)

  const docsData = [
    { range: "0–25%", count: filtered.filter((a) => a.docsPct <= 25).length },
    { range: "26–50%", count: filtered.filter((a) => a.docsPct > 25 && a.docsPct <= 50).length },
    { range: "51–75%", count: filtered.filter((a) => a.docsPct > 50 && a.docsPct <= 75).length },
    { range: "76–99%", count: filtered.filter((a) => a.docsPct > 75 && a.docsPct < 100).length },
    { range: "100%", count: filtered.filter((a) => a.docsPct === 100).length },
  ].filter((d) => d.count > 0)

  return (
    <div style={{ padding:"24px 32px 64px", maxWidth:1280, margin:"0 auto",
      fontFamily:"var(--font-sans), -apple-system, BlinkMacSystemFont, sans-serif",
      fontSize:14, color:"var(--admin-text, #0F1B2A)" }}>

      {/* Header + filters */}
      <header style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between",
        gap:14, marginBottom:24, flexWrap:"wrap" }}>
        <div>
          <h1 style={{ margin:0, fontFamily:"var(--font-display)", fontSize:26, fontWeight:800, letterSpacing:"-.02em", lineHeight:1.1, color:"var(--admin-text, #0F1B2A)" }}>Reportes y métricas</h1>
          <p style={{ margin:"4px 0 0", fontSize:13, color:"var(--admin-text-muted, #5A6B7B)" }}>Panel interno · Payefy Equipo</p>
        </div>

        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          {/* Product filter */}
          <div style={{ display:"flex", gap:4, background:"#fff", border:"1px solid #e3e8e5",
            borderRadius:999, padding:3 }}>
            {(["all","cards","terminals"] as const).map((p) => {
              const lbl = p === "all" ? "Todos" : p === "cards" ? "Tarjetas" : "Terminales"
              return (
                <button key={p} onClick={() => setProductFilter(p)}
                  style={{ fontSize:12, padding:"5px 13px", borderRadius:999, border:"none", cursor:"pointer",
                    fontWeight: productFilter === p ? 600 : 400,
                    background: productFilter === p ? PRIMARY : "transparent",
                    color: productFilter === p ? "#fff" : "#5f6b64" }}>
                  {lbl}
                </button>
              )
            })}
          </div>

          {/* Period filter */}
          <div style={{ display:"flex", gap:4, background:"#fff", border:"1px solid #e3e8e5",
            borderRadius:999, padding:3 }}>
            {([30,60,90,0] as const).map((d) => (
              <button key={d} onClick={() => setPeriodDays(d)}
                style={{ fontSize:12, padding:"5px 13px", borderRadius:999, border:"none", cursor:"pointer",
                  fontWeight: periodDays === d ? 600 : 400,
                  background: periodDays === d ? PRIMARY : "transparent",
                  color: periodDays === d ? "#fff" : "#5f6b64" }}>
                {d === 0 ? "Todo" : `${d}d`}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* KPIs */}
      <section style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",
        gap:12, marginBottom:20 }}>
        <KpiCard label="Total solicitudes" value={totalApps} accent />
        <KpiCard label="Activadas" value={activatedCount} sub={`${conversionRate}% conversión`} />
        <KpiCard label="En proceso" value={inProcessCount} />
        <KpiCard label="Rechazadas" value={rejectedCount} />
        <KpiCard label="Tasa de conversión" value={`${conversionRate}%`} sub="activadas / total" />
      </section>

      {/* Pipeline + Product split */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_280px] gap-4 mb-5">
        <div style={card}>
          <p style={cardTitle}>Distribución del pipeline</p>
          {pipelineData.length === 0 ? (
            <p style={{ color:"#8a948e", fontSize:13 }}>Sin datos para el filtro seleccionado.</p>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(200, pipelineData.length * 36)}>
              <BarChart data={pipelineData} layout="vertical"
                margin={{ top:0, right:20, left:0, bottom:0 }}>
                <XAxis type="number" tick={{ fontSize:11, fill:"#8a948e" }} />
                <YAxis dataKey="label" type="category" width={135}
                  tick={{ fontSize:11, fill:"#5f6b64" }} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="count" name="Solicitudes" fill={PRIMARY} radius={[0,4,4,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div style={card}>
          <p style={cardTitle}>Por producto</p>
          {productData.length === 0 ? (
            <p style={{ color:"#8a948e", fontSize:13 }}>Sin datos.</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={productData} dataKey="count" nameKey="name"
                  cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3}>
                  {productData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
                <Legend iconType="circle" iconSize={8}
                  formatter={(v) => <span style={{ fontSize:12, color:"#5f6b64" }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Docs completion + Monthly activations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div style={card}>
          <p style={cardTitle}>Completitud de documentos</p>
          {docsData.length === 0 ? (
            <p style={{ color:"#8a948e", fontSize:13 }}>Sin datos.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={docsData} margin={{ top:0, right:10, left:-10, bottom:0 }}>
                <XAxis dataKey="range" tick={{ fontSize:11, fill:"#5f6b64" }} />
                <YAxis tick={{ fontSize:11, fill:"#8a948e" }} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="count" name="Solicitudes" radius={[4,4,0,0]}>
                  {docsData.map((d, i) => (
                    <Cell key={i} fill={d.range === "100%" ? "#0f6e56" : PRIMARY} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div style={card}>
          <p style={cardTitle}>Activaciones por mes (últimos 6 meses)</p>
          {monthlyActivations.every((m) => m.count === 0) ? (
            <p style={{ color:"#8a948e", fontSize:13 }}>Sin activaciones registradas aún.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={monthlyActivations}
                margin={{ top:0, right:10, left:-10, bottom:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e3e8e5" />
                <XAxis dataKey="month" tick={{ fontSize:11, fill:"#5f6b64" }} />
                <YAxis tick={{ fontSize:11, fill:"#8a948e" }} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} />
                <Line type="monotone" dataKey="count" name="Activadas"
                  stroke={PRIMARY} strokeWidth={2}
                  dot={{ fill:PRIMARY, r:4 }}
                  activeDot={{ r:6, fill:ACCENT, stroke:PRIMARY }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  )
}
