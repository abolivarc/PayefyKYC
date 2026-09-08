/* eslint-disable @next/next/no-img-element */
"use client"

// Documento de propuesta comercial — se renderiza en pantalla y se captura
// página por página (html2canvas-pro + jsPDF) para generar el PDF descargable.
import {
  ProposalData,
  ProposalCalculations,
  ENTITY_TYPE_LABELS,
  IVA_RATE,
  calculateProposal,
  formatCurrency,
  AMEX_FLOOR_RATE,
  INTERNATIONAL_FLOOR_RATE,
  qualifiesForComodato,
} from "@/lib/proposals/types"

// ─── Paleta de marca ─────────────────────────────────────────────
const INK = "#0B2B22"      // verde casi negro — titulares
const DEEP = "#004238"     // verde Payefy
const MINT = "#AEFF99"     // acento
const GREEN = "#0B7A44"    // positivo
const GRAY = "#6B7F78"     // texto secundario
const LINE = "#E4ECE7"     // bordes
const CANVAS = "#F4F8F6"   // fondos suaves

const LOGO = "/proposals/payefy-logo-dark.png"
const TERMINAL_IMG = "/proposals/terminal-smart.png"
const TERMINAL_VERTICAL_IMG = "/proposals/terminal-card-vertical.png"
const CARD_IMG = "/proposals/payefy-card.png"

const rateWithIVA = (rate: number) => (rate * IVA_RATE).toFixed(2)

const pageClass =
  "proposal-pdf-page bg-white w-[210mm] h-[297mm] mx-auto box-border flex flex-col relative overflow-hidden"

const today = () =>
  new Date().toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })

// ─── Cabecera de páginas interiores ──────────────────────────────
function RunningHead({ eyebrow, page, total }: { eyebrow: string; page: number; total: number }) {
  return (
    <div
      className="flex items-center justify-between px-[14mm] shrink-0"
      style={{ height: "18mm", borderBottom: `1px solid ${LINE}` }}
    >
      <div className="flex items-center gap-3">
        <img src={LOGO} alt="Payefy" style={{ height: 22 }} />
        <span style={{ width: 1, height: 16, background: LINE }} />
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", color: GRAY }}>
          {eyebrow}
        </span>
      </div>
      <span style={{ fontSize: 10, color: GRAY }}>
        {page} / {total}
      </span>
    </div>
  )
}

function Foot({ note }: { note?: string }) {
  return (
    <div
      className="mt-auto flex items-center justify-between px-[14mm] shrink-0"
      style={{ height: "13mm", borderTop: `1px solid ${LINE}`, fontSize: 9, color: GRAY }}
    >
      <span>{note ?? "Propuesta válida por 30 días · No representa un contrato vinculante"}</span>
      <span style={{ fontWeight: 700, color: DEEP }}>payefy.me</span>
    </div>
  )
}

// ─── Tarjeta de tasa ─────────────────────────────────────────────
function RateCard({
  label,
  value,
  accent = false,
}: {
  label: string
  value: number
  accent?: boolean
}) {
  return (
    <div
      style={{
        background: accent ? DEEP : "#fff",
        border: `1px solid ${accent ? DEEP : LINE}`,
        borderRadius: 14,
        padding: "14px 16px",
        flex: 1,
      }}
    >
      <p style={{ margin: 0, fontSize: 9, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: accent ? MINT : GRAY }}>
        {label}
      </p>
      <p style={{ margin: "6px 0 0", fontSize: 30, fontWeight: 800, lineHeight: 1, letterSpacing: "-.03em", color: accent ? "#fff" : INK, fontFamily: "var(--font-display)" }}>
        {value}
        <span style={{ fontSize: 16, fontWeight: 700 }}>%</span>
      </p>
      <p style={{ margin: "4px 0 0", fontSize: 9, color: accent ? "rgba(255,255,255,.6)" : "#9BAFA7" }}>
        {rateWithIVA(value)}% con IVA
      </p>
    </div>
  )
}

// ─── PÁGINA 1 · Portada ──────────────────────────────────────────
function CoverPage({
  data,
  calc,
}: {
  data: Partial<ProposalData>
  calc: ProposalCalculations
}) {
  const isComparative = data.proposalType === "comparative"
  const showSavings = isComparative && calc.annualSavings > 0
  // Enfoque comercial: la general muestra SOLO tasas — ningún monto en pesos
  // que le haga la calculadora del costo al cliente. En la comparativa los
  // pesos sí aparecen porque ahí son ahorro, no costo.

  return (
    <>
      {/* Bloque superior verde */}
      <div style={{ background: DEEP, padding: "16mm 14mm 14mm", position: "relative" }}>
        <div style={{ position: "absolute", right: "-18mm", top: "-18mm", width: "70mm", height: "70mm", borderRadius: "50%", background: "rgba(174,255,153,.08)" }} />
        <div className="flex items-start justify-between relative">
          <div>
            <img src={LOGO} alt="Payefy" style={{ height: 30, filter: "brightness(0) invert(1)" }} />
            <p style={{ margin: "18px 0 0", fontSize: 10, fontWeight: 700, letterSpacing: ".18em", textTransform: "uppercase", color: MINT }}>
              {showSavings ? "Propuesta de ahorro" : "Propuesta comercial"}
            </p>
            <h1 style={{ margin: "8px 0 0", fontFamily: "var(--font-display)", fontSize: 34, lineHeight: 1.05, fontWeight: 800, letterSpacing: "-.03em", color: "#fff", maxWidth: "115mm" }}>
              {data.businessName}
            </h1>
            <p style={{ margin: "10px 0 0", fontSize: 13, color: "rgba(255,255,255,.72)" }}>
              {data.sectorFamilia}
              {data.mccCode ? ` · MCC ${data.mccCode}` : ""}
            </p>
          </div>
          <img src={TERMINAL_IMG} alt="Terminal Payefy" style={{ width: "84mm", objectFit: "contain", marginTop: "8mm", flexShrink: 0 }} />
        </div>
      </div>

      <div className="flex-1 flex flex-col px-[14mm] pt-[10mm]">
        {/* Protagonista en el verde menta del logo — comparativa: el ahorro;
            general: las tasas mismas, sin un solo peso calculado */}
        {showSavings ? (
          <div style={{ background: MINT, borderRadius: 20, padding: "20px 24px" }}>
            <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", color: DEEP }}>
              Ahorro anual estimado vs {data.competitorName}
            </p>
            <p style={{ margin: "6px 0 0", fontFamily: "var(--font-display)", fontSize: 46, fontWeight: 800, lineHeight: 1, letterSpacing: "-.035em", color: DEEP }}>
              {formatCurrency(calc.annualSavings)}
            </p>
            <p style={{ margin: "8px 0 0", fontSize: 12, color: "#2E5548" }}>
              {calc.savingsPercentage.toFixed(1)}% menos de lo que pagas hoy · {formatCurrency(calc.monthlySavings)} cada mes
            </p>
          </div>
        ) : (
          <div style={{ background: MINT, borderRadius: 20, padding: "18px 24px 16px" }}>
            <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", color: DEEP }}>
              Tus tasas Payefy — negociadas para tu giro
            </p>
            <div className="flex" style={{ marginTop: 10 }}>
              {[
                { k: "Débito", v: data.negotiatedDebitRate || 0 },
                { k: "Crédito", v: data.negotiatedCreditRate || 0 },
                { k: "AMEX", v: data.negotiatedAmexRate ?? AMEX_FLOOR_RATE },
                { k: "Internacional", v: data.negotiatedInternationalRate ?? INTERNATIONAL_FLOOR_RATE },
              ].map((t, i) => (
                <div key={t.k} style={{ flex: 1, paddingLeft: i > 0 ? 16 : 0, borderLeft: i > 0 ? "1px solid rgba(0,66,56,.18)" : "none" }}>
                  <p style={{ margin: 0, fontSize: 9, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: "#2E5548" }}>
                    {t.k}
                  </p>
                  <p style={{ margin: "4px 0 0", fontFamily: "var(--font-display)", fontSize: 34, fontWeight: 800, lineHeight: 1, letterSpacing: "-.03em", color: DEEP }}>
                    {t.v}
                    <span style={{ fontSize: 17, fontWeight: 700 }}>%</span>
                  </p>
                  <p style={{ margin: "3px 0 0", fontSize: 9, color: "#2E5548", opacity: 0.75 }}>{rateWithIVA(t.v)}% con IVA</p>
                </div>
              ))}
            </div>
            <p style={{ margin: "12px 0 0", fontSize: 11.5, color: "#2E5548" }}>
              Sin renta, sin permanencia y sin cargos ocultos: pagas solo por lo que cobras.
            </p>
          </div>
        )}

        {/* Datos del negocio */}
        <div className="grid grid-cols-3 gap-3 mt-[8mm]">
          {[
            { k: "Volumen mensual", v: formatCurrency(data.monthlyVolume || 0) },
            { k: "Ticket promedio", v: data.averageTicket ? formatCurrency(data.averageTicket) : "—" },
            { k: "Tipo de entidad", v: data.entityType ? ENTITY_TYPE_LABELS[data.entityType] : "—" },
          ].map((it) => (
            <div key={it.k} style={{ background: CANVAS, borderRadius: 14, padding: "12px 14px" }}>
              <p style={{ margin: 0, fontSize: 9, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: GRAY }}>
                {it.k}
              </p>
              <p style={{ margin: "5px 0 0", fontSize: 15, fontWeight: 700, color: INK, lineHeight: 1.25 }}>
                {it.v}
              </p>
            </div>
          ))}
        </div>

        {/* Comparativa: el cambio en números · General: tasas de un vistazo */}
        {showSavings ? (
          <>
            <p style={{ margin: "10mm 0 8px", fontSize: 10, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", color: GRAY }}>
              El cambio en números
            </p>
            <div className="flex items-stretch gap-3">
              <div style={{ flex: 1, background: "#fff", border: `1px solid ${LINE}`, borderRadius: 14, padding: "14px 16px" }}>
                <p style={{ margin: 0, fontSize: 9, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: "#B4443A" }}>
                  Pagas hoy con {data.competitorName}
                </p>
                <p style={{ margin: "6px 0 0", fontSize: 26, fontWeight: 800, lineHeight: 1, letterSpacing: "-.03em", color: "#B4443A", fontFamily: "var(--font-display)" }}>
                  {formatCurrency(calc.competitorMonthlyCost)}
                </p>
                <p style={{ margin: "4px 0 0", fontSize: 9, color: "#9BAFA7" }}>al mes en comisiones</p>
              </div>
              <div style={{ flex: 1, background: DEEP, borderRadius: 14, padding: "14px 16px" }}>
                <p style={{ margin: 0, fontSize: 9, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: MINT }}>
                  Pagarías con Payefy
                </p>
                <p style={{ margin: "6px 0 0", fontSize: 26, fontWeight: 800, lineHeight: 1, letterSpacing: "-.03em", color: "#fff", fontFamily: "var(--font-display)" }}>
                  {formatCurrency(calc.payefyMonthlyCost)}
                </p>
                <p style={{ margin: "4px 0 0", fontSize: 9, color: "rgba(255,255,255,.6)" }}>misma operación, mismas tarjetas</p>
              </div>
              <div style={{ flex: 1, background: MINT, borderRadius: 14, padding: "14px 16px" }}>
                <p style={{ margin: 0, fontSize: 9, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: DEEP }}>
                  Se queda en tu negocio
                </p>
                <p style={{ margin: "6px 0 0", fontSize: 26, fontWeight: 800, lineHeight: 1, letterSpacing: "-.03em", color: DEEP, fontFamily: "var(--font-display)" }}>
                  {formatCurrency(calc.monthlySavings)}
                </p>
                <p style={{ margin: "4px 0 0", fontSize: 9, color: "#2E5548" }}>cada mes, desde el primer mes</p>
              </div>
            </div>
          </>
        ) : null}

        {/* Propuesta de valor — la comparativa vende el CAMBIO, la general el ARRANQUE */}
        <div className="grid grid-cols-3 gap-3" style={{ marginTop: "9mm" }}>
          {(showSavings
            ? [
                { t: "Cambiarte no cuesta nada", s: "Sin costo de alta, sin penalizaciones y sin plazos forzosos." },
                { t: "Mismo negocio, más margen", s: "Sigues cobrando igual: solo baja la comisión de cada venta." },
                { t: "Migración acompañada", s: "Un ejecutivo lleva tu alta completa sin detener tu operación." },
              ]
            : [
                { t: "Sin renta ni permanencia", s: "Pagas solo por lo que cobras. Sin contratos forzosos." },
                { t: "Tu dinero al día siguiente", s: "Depósito directo a tu cuenta, sin retenciones." },
                { t: "Un equipo, no un call center", s: "Ejecutivo asignado y soporte 24/7." },
              ]
          ).map((v) => (
            <div key={v.t} style={{ border: `1px solid ${LINE}`, borderRadius: 14, padding: "13px 15px" }}>
              <p style={{ margin: 0, fontSize: 12.5, fontWeight: 800, color: INK, lineHeight: 1.3, letterSpacing: "-.01em" }}>
                {v.t}
              </p>
              <p style={{ margin: "5px 0 0", fontSize: 10.5, color: GRAY, lineHeight: 1.45 }}>{v.s}</p>
            </div>
          ))}
        </div>

        {/* Contacto */}
        <div className="mt-auto mb-[6mm] flex items-end justify-between" style={{ borderTop: `1px solid ${LINE}`, paddingTop: 14 }}>
          <div>
            <p style={{ margin: 0, fontSize: 9, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: GRAY }}>
              Preparada para
            </p>
            <p style={{ margin: "4px 0 0", fontSize: 14, fontWeight: 700, color: INK }}>{data.contactName}</p>
            <p style={{ margin: 0, fontSize: 12, color: GRAY }}>
              {data.contactEmail}
              {data.contactPhone ? ` · ${data.contactPhone}` : ""}
            </p>
          </div>
          <p style={{ margin: 0, fontSize: 11, color: GRAY, textAlign: "right" }}>
            {today()}
            <br />
            <span style={{ fontWeight: 700, color: DEEP }}>Vigencia 30 días</span>
          </p>
        </div>
      </div>
    </>
  )
}

// ─── PÁGINA 2 · Tasas y ahorro ───────────────────────────────────
function RatesPage({
  data,
  calc,
  page,
  total,
}: {
  data: Partial<ProposalData>
  calc: ProposalCalculations
  page: number
  total: number
}) {
  const isComparative = data.proposalType === "comparative"
  const amex = data.negotiatedAmexRate ?? AMEX_FLOOR_RATE
  const intl = data.negotiatedInternationalRate ?? INTERNATIONAL_FLOOR_RATE

  const rows: { label: string; comp?: number; payefy: number }[] = [
    { label: "Débito", comp: data.competitorDebitRate, payefy: data.negotiatedDebitRate || 0 },
    { label: "Crédito", comp: data.competitorCreditRate, payefy: data.negotiatedCreditRate || 0 },
    ...(data.competitorAmexRate !== undefined ? [{ label: "AMEX", comp: data.competitorAmexRate, payefy: amex }] : []),
    ...(data.competitorInternationalRate !== undefined
      ? [{ label: "Internacional", comp: data.competitorInternationalRate, payefy: intl }]
      : []),
  ]

  const maxCost = Math.max(calc.competitorAnnualCost, calc.payefyAnnualCost, 1)

  return (
    <>
      <RunningHead eyebrow="Tasas y ahorro" page={page} total={total} />
      <div className="flex-1 px-[14mm] pt-[9mm] flex flex-col">
        <h2 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 800, letterSpacing: "-.025em", color: INK }}>
          {isComparative ? "Lo que pagas hoy vs. lo que pagarías con Payefy" : "Tus tasas, claras y por escrito"}
        </h2>
        <p style={{ margin: "6px 0 0", fontSize: 12.5, color: GRAY, maxWidth: "150mm", lineHeight: 1.5 }}>
          {isComparative
            ? `Cálculo sobre tu volumen real de ${formatCurrency(data.monthlyVolume || 0)} mensuales. Todas las cifras incluyen IVA.`
            : "Una tasa fija por tipo de tarjeta y nada más: sin renta, sin mínimos y sin letras chicas."}
        </p>

        {isComparative ? (
          <>
            {/* Tabla comparativa */}
            <table className="w-full mt-[8mm]" style={{ borderCollapse: "separate", borderSpacing: 0, fontSize: 12 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 9, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: GRAY }}>
                    Tipo de tarjeta
                  </th>
                  <th style={{ textAlign: "center", padding: "10px 12px", fontSize: 9, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "#B4443A" }}>
                    {data.competitorName}
                  </th>
                  <th style={{ textAlign: "center", padding: "10px 12px", fontSize: 9, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: MINT, background: DEEP, borderRadius: "10px 10px 0 0" }}>
                    Payefy
                  </th>
                  <th style={{ textAlign: "center", padding: "10px 12px", fontSize: 9, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: GREEN }}>
                    Diferencia
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const diff = (r.comp || 0) - r.payefy
                  return (
                    <tr key={r.label}>
                      <td style={{ padding: "11px 12px", fontWeight: 600, color: INK, borderTop: `1px solid ${LINE}` }}>
                        {r.label}
                      </td>
                      <td style={{ padding: "11px 12px", textAlign: "center", color: "#B4443A", borderTop: `1px solid ${LINE}` }}>
                        {r.comp}%
                      </td>
                      <td style={{ padding: "11px 12px", textAlign: "center", fontWeight: 800, color: "#fff", background: DEEP, borderRadius: i === rows.length - 1 ? "0 0 10px 10px" : 0 }}>
                        {r.payefy}%
                      </td>
                      <td style={{ padding: "11px 12px", textAlign: "center", fontWeight: 700, color: diff > 0 ? GREEN : GRAY, borderTop: `1px solid ${LINE}` }}>
                        {diff > 0 ? `−${diff.toFixed(2)} pts` : "igual"}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {/* Barras de costo anual */}
            <div style={{ marginTop: "9mm" }}>
              <p style={{ margin: "0 0 10px", fontSize: 10, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: GRAY }}>
                Costo anual estimado
              </p>
              {[
                { name: data.competitorName || "Actual", value: calc.competitorAnnualCost, color: "#D6604D" },
                { name: "Payefy", value: calc.payefyAnnualCost, color: DEEP },
              ].map((b) => (
                <div key={b.name} className="flex items-center gap-3 mb-2.5">
                  <span style={{ width: "26mm", fontSize: 11, fontWeight: 600, color: INK, textAlign: "right" }}>
                    {b.name}
                  </span>
                  <div style={{ flex: 1, background: CANVAS, borderRadius: 8, height: 34, position: "relative" }}>
                    <div
                      style={{
                        width: `${Math.max((b.value / maxCost) * 100, 22)}%`,
                        height: "100%",
                        background: b.color,
                        borderRadius: 8,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "flex-end",
                        paddingRight: 12,
                      }}
                    >
                      <span style={{ color: "#fff", fontSize: 12, fontWeight: 800 }}>
                        {formatCurrency(b.value)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Resumen del ahorro */}
            <div className="grid grid-cols-3 gap-3" style={{ marginTop: "8mm" }}>
              {[
                { k: "Pagas hoy", v: formatCurrency(calc.competitorMonthlyCost), s: "al mes" },
                { k: "Pagarías con Payefy", v: formatCurrency(calc.payefyMonthlyCost), s: "al mes" },
              ].map((it) => (
                <div key={it.k} style={{ background: CANVAS, borderRadius: 14, padding: "13px 15px" }}>
                  <p style={{ margin: 0, fontSize: 9, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: GRAY }}>{it.k}</p>
                  <p style={{ margin: "5px 0 0", fontSize: 20, fontWeight: 800, color: INK, fontFamily: "var(--font-display)", letterSpacing: "-.02em" }}>{it.v}</p>
                  <p style={{ margin: 0, fontSize: 10, color: "#9BAFA7" }}>{it.s}</p>
                </div>
              ))}
              <div style={{ background: DEEP, borderRadius: 14, padding: "13px 15px" }}>
                <p style={{ margin: 0, fontSize: 9, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: MINT }}>Tu ahorro</p>
                <p style={{ margin: "5px 0 0", fontSize: 20, fontWeight: 800, color: "#fff", fontFamily: "var(--font-display)", letterSpacing: "-.02em" }}>
                  {formatCurrency(calc.annualSavings)}
                </p>
                <p style={{ margin: 0, fontSize: 10, color: "rgba(255,255,255,.65)" }}>al año</p>
              </div>
            </div>

            {/* La cifra que se recuerda: el ahorro proyectado a 3 años */}
            {calc.annualSavings > 0 && (
              <div style={{ marginTop: "6mm", background: MINT, borderRadius: 14, padding: "12px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
                <p style={{ margin: 0, fontSize: 11.5, fontWeight: 700, color: DEEP, lineHeight: 1.4 }}>
                  Proyección a 3 años: dinero que se queda en tu negocio
                  <br />
                  <span style={{ fontWeight: 400, fontSize: 10.5, color: "#2E5548" }}>en lugar de irse en comisiones, con tu volumen actual</span>
                </p>
                <p style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 800, letterSpacing: "-.03em", color: DEEP, whiteSpace: "nowrap" }}>
                  {formatCurrency(calc.annualSavings * 3)}
                </p>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="flex gap-3" style={{ marginTop: "8mm" }}>
              <RateCard label="Débito" value={data.negotiatedDebitRate || 0} accent />
              <RateCard label="Crédito" value={data.negotiatedCreditRate || 0} accent />
              <RateCard label="AMEX" value={amex} />
              <RateCard label="Internacional" value={intl} />
            </div>

            {/* Lo único que va en pesos en la general: los ceros */}
            <div className="grid grid-cols-3 gap-3" style={{ marginTop: "8mm" }}>
              {[
                { k: "Renta mensual", s: "hoy y siempre" },
                { k: "Costo de alta", s: "sin letras chicas" },
                { k: "Permanencia forzosa", s: "te quedas porque quieres" },
              ].map((it) => (
                <div key={it.k} style={{ background: MINT, borderRadius: 14, padding: "14px 16px" }}>
                  <p style={{ margin: 0, fontSize: 9, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: DEEP }}>{it.k}</p>
                  <p style={{ margin: "5px 0 0", fontSize: 21, fontWeight: 800, color: DEEP, fontFamily: "var(--font-display)", letterSpacing: "-.02em" }}>$0</p>
                  <p style={{ margin: 0, fontSize: 10, color: "#2E5548" }}>{it.s}</p>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Qué incluye */}
        <p style={{ margin: "10mm 0 8px", fontSize: 10, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", color: GRAY }}>
          {isComparative ? "Incluido sin costo extra" : "Esa comisión ya lo incluye todo"}
        </p>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2">
          {[
            // Regla comercial: el comodato solo se menciona si el volumen califica
            qualifiesForComodato(data.monthlyVolume)
              ? "Terminal en comodato: el equipo sin costo mientras operes con Payefy"
              : "Terminal física o virtual para cobros con tarjeta",
            "Depósito directo a tu cuenta al siguiente día hábil",
            "Tasas diferenciadas por tipo de tarjeta",
            "Dashboard de transacciones en tiempo real",
            "Soporte técnico dedicado 24/7",
            "Sin renta mensual ni costos ocultos",
          ].map((t) => (
            <div key={t} className="flex items-start gap-2">
              <span style={{ width: 16, height: 16, borderRadius: "50%", background: "#E7F8EF", color: GREEN, fontSize: 10, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                ✓
              </span>
              <span style={{ fontSize: 11.5, color: "#3E5049", lineHeight: 1.45 }}>{t}</span>
            </div>
          ))}
        </div>

        {/* El único "enemigo" disponible sin comparativa: no cobrar con tarjeta */}
        {!isComparative && (
          <div style={{ marginTop: "8mm", background: CANVAS, borderRadius: 14, padding: "13px 18px" }}>
            <p style={{ margin: 0, fontSize: 12, color: "#3E5049", lineHeight: 1.55 }}>
              <strong style={{ color: DEEP }}>Cobrar con tarjeta no es un gasto:</strong> es
              la venta que ya no se te va cuando el cliente no trae efectivo — y el
              cliente que regresa porque pagar contigo fue fácil.
            </p>
          </div>
        )}
      </div>
      <Foot />
    </>
  )
}

// ─── PÁGINA · Payefy Card ────────────────────────────────────────
function DispersionPage({
  data,
  calc,
  page,
  total,
}: {
  data: Partial<ProposalData>
  calc: ProposalCalculations
  page: number
  total: number
}) {
  const feeBase = data.dispersionFeeBase || 0.5
  const instantFee = data.instantFeeRate ?? 1.0

  // Ejemplo con el volumen real del comercio
  const volume = data.monthlyVolume || 0
  const neto = volume - calc.payefyMonthlyCost
  const fee = neto * (feeBase / 100) * IVA_RATE
  const disponible = neto - fee

  return (
    <>
      <RunningHead eyebrow="Payefy Card" page={page} total={total} />
      <div className="flex-1 px-[14mm] pt-[9mm] flex flex-col">
        <div className="flex items-start justify-between gap-6">
          <div style={{ maxWidth: "112mm" }}>
            <h2 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 800, letterSpacing: "-.025em", color: INK }}>
              Dispón de tu dinero el mismo día
            </h2>
            <p style={{ margin: "8px 0 0", fontSize: 12.5, color: GRAY, lineHeight: 1.55 }}>
              En lugar de esperar la transferencia bancaria, tus fondos quedan
              disponibles en tarjetas Payefy físicas y virtuales que tú controlas
              desde la app. <strong style={{ color: INK }}>Tú sigues facturando normalmente.</strong>
            </p>
          </div>
          <img src={CARD_IMG} alt="Tarjeta Payefy" style={{ height: "32mm", objectFit: "contain", flexShrink: 0 }} />
        </div>

        {/* Precios */}
        <div className="flex gap-3" style={{ marginTop: "9mm" }}>
          <div style={{ flex: 1, background: CANVAS, borderRadius: 16, padding: "16px 18px" }}>
            <p style={{ margin: 0, fontSize: 9, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: GRAY }}>
              Depósito estándar
            </p>
            <p style={{ margin: "6px 0 0", fontSize: 32, fontWeight: 800, lineHeight: 1, color: INK, fontFamily: "var(--font-display)", letterSpacing: "-.03em" }}>
              {feeBase}<span style={{ fontSize: 17 }}>% + IVA</span>
            </p>
            <p style={{ margin: "8px 0 0", fontSize: 11, color: GRAY }}>Fondos al siguiente día hábil</p>
          </div>
          <div style={{ flex: 1, background: DEEP, borderRadius: 16, padding: "16px 18px" }}>
            <p style={{ margin: 0, fontSize: 9, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: MINT }}>
              Disponibilidad inmediata
            </p>
            <p style={{ margin: "6px 0 0", fontSize: 32, fontWeight: 800, lineHeight: 1, color: "#fff", fontFamily: "var(--font-display)", letterSpacing: "-.03em" }}>
              {instantFee}<span style={{ fontSize: 17 }}>% + IVA</span>
            </p>
            <p style={{ margin: "8px 0 0", fontSize: 11, color: "rgba(255,255,255,.7)" }}>El mismo día, bajo demanda</p>
          </div>
        </div>

        <p style={{ margin: "6mm 0 0", fontSize: 11.5, color: GRAY, lineHeight: 1.5 }}>
          La comisión aplica <strong style={{ color: INK }}>solo sobre el monto que decidas dispersar</strong> a
          tus tarjetas. Sin montos mínimos ni máximos, y tú eliges día a día si
          prefieres el depósito estándar o el inmediato.
        </p>

        {/* Beneficios */}
        <p style={{ margin: "9mm 0 8px", fontSize: 10, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", color: GRAY }}>
          Qué incluye
        </p>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2">
          {[
            "Tarjetas Visa físicas y virtuales",
            "App móvil de control de gastos",
            "Tarjetas para tu equipo con límites",
            "Reportes y conciliación en tiempo real",
          ].map((t) => (
            <div key={t} className="flex items-start gap-2">
              <span style={{ width: 16, height: 16, borderRadius: "50%", background: "#E7F8EF", color: GREEN, fontSize: 10, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                ✓
              </span>
              <span style={{ fontSize: 11.5, color: "#3E5049", lineHeight: 1.45 }}>{t}</span>
            </div>
          ))}
        </div>

        {/* Ejemplo con su volumen */}
        {volume > 0 && (
          <div style={{ marginTop: "9mm", border: `1px solid ${LINE}`, borderRadius: 16, overflow: "hidden" }}>
            <div style={{ background: CANVAS, padding: "10px 18px" }}>
              <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: DEEP }}>
                Con tu volumen de {formatCurrency(volume)} al mes
              </p>
            </div>
            <div style={{ padding: "12px 18px" }}>
              {[
                { k: "Ventas del mes", v: formatCurrency(volume), muted: true },
                { k: "Comisiones de terminal", v: `− ${formatCurrency(calc.payefyMonthlyCost)}`, muted: true },
                { k: `Fee de dispersión (${feeBase}% + IVA)`, v: `− ${formatCurrency(fee)}`, muted: true },
              ].map((r) => (
                <div key={r.k} className="flex items-center justify-between" style={{ padding: "5px 0", fontSize: 11.5, color: GRAY }}>
                  <span>{r.k}</span>
                  <span>{r.v}</span>
                </div>
              ))}
              <div className="flex items-center justify-between" style={{ borderTop: `1px solid ${LINE}`, marginTop: 6, paddingTop: 10 }}>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: INK }}>
                  Disponible en tus tarjetas
                </span>
                <span style={{ fontSize: 20, fontWeight: 800, color: GREEN, fontFamily: "var(--font-display)", letterSpacing: "-.02em" }}>
                  {formatCurrency(disponible)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Ideal si */}
        <div style={{ marginTop: "7mm", background: CANVAS, borderRadius: 16, padding: "16px 20px" }}>
          <p style={{ margin: "0 0 8px", fontSize: 10, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: DEEP }}>
            Es para ti si
          </p>
          {[
            "Necesitas liquidez inmediata para pagar proveedores o nómina",
            "Quieres dar tarjetas a tu equipo para gastos del negocio",
            "Prefieres control total del flujo de efectivo desde la app",
          ].map((t) => (
            <p key={t} style={{ margin: "0 0 5px", fontSize: 11.5, color: "#3E5049", lineHeight: 1.45 }}>
              · {t}
            </p>
          ))}
        </div>
      </div>
      <Foot />
    </>
  )
}

// ─── PÁGINA · Tecnología a tu medida ─────────────────────────────
// Payefy no solo vende la infraestructura de pagos: también el sistema
// de control operativo hecho a la medida (embebido, con la marca del
// cliente) y la consultoría para construir herramientas que no existen.
const TECH_CAPABILITIES = [
  { t: "Link de pago", s: "Cobra a distancia con un enlace: por WhatsApp, correo o redes sociales." },
  { t: "Cobros recurrentes", s: "Suscripciones y pagos programados que se cobran solos, cada periodo." },
  { t: "Catálogo y precios", s: "Tus productos y costos cargados en el sistema, listos para cobrar sin errores." },
  { t: "Integración con tu POS", s: "Conectamos tu punto de venta para que cobro y ticket sean un solo paso." },
  { t: "Control operativo", s: "Ventas, depósitos y conciliación en tiempo real, en una sola pantalla." },
  { t: "Embebido en tu interfaz", s: "La tecnología vive dentro de tu sistema, con tu marca y tu flujo de trabajo." },
]

function TechPage({ page, total }: { page: number; total: number }) {
  return (
    <>
      <RunningHead eyebrow="Tecnología Payefy" page={page} total={total} />
      <div className="flex-1 px-[14mm] pt-[9mm] flex flex-col">
        <h2 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 800, letterSpacing: "-.025em", color: INK, maxWidth: "150mm" }}>
          Más que cobrar: tu operación completa, en una sola interfaz
        </h2>
        <p style={{ margin: "8px 0 0", fontSize: 12.5, color: GRAY, maxWidth: "155mm", lineHeight: 1.55 }}>
          La infraestructura de pagos es la base. Encima de ella construimos el
          sistema con el que <strong style={{ color: INK }}>controlas tu operación día a día</strong> —
          y si tu negocio necesita algo especial, lo desarrollamos a tu medida.
        </p>

        <div className="grid grid-cols-3 gap-3" style={{ marginTop: "8mm" }}>
          {TECH_CAPABILITIES.map((c) => (
            <div key={c.t} style={{ border: `1px solid ${LINE}`, borderRadius: 14, padding: "14px 16px" }}>
              <p style={{ margin: 0, fontSize: 12.5, fontWeight: 800, color: DEEP, lineHeight: 1.3, letterSpacing: "-.01em" }}>
                {c.t}
              </p>
              <p style={{ margin: "5px 0 0", fontSize: 10.5, color: GRAY, lineHeight: 1.45 }}>{c.s}</p>
            </div>
          ))}
        </div>

        {/* Consultoría de desarrollo a la medida */}
        <div style={{ marginTop: "9mm", background: DEEP, borderRadius: 20, padding: "20px 24px", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", right: "-12mm", top: "-14mm", width: "48mm", height: "48mm", borderRadius: "50%", background: "rgba(174,255,153,.08)" }} />
          <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", color: MINT, position: "relative" }}>
            Consultoría de tecnología
          </p>
          <p style={{ margin: "8px 0 0", fontFamily: "var(--font-display)", fontSize: 19, fontWeight: 800, color: "#fff", letterSpacing: "-.02em", lineHeight: 1.25, maxWidth: "150mm", position: "relative" }}>
            ¿Tu operación necesita algo que no existe todavía? Lo construimos contigo.
          </p>
          <p style={{ margin: "8px 0 0", fontSize: 11.5, color: "rgba(255,255,255,.75)", lineHeight: 1.55, maxWidth: "155mm", position: "relative" }}>
            Nuestro equipo de tecnología diseña herramientas a la medida sobre la
            infraestructura Payefy: desde flujos de cobro especiales hasta sistemas
            completos de control operativo integrados con lo que ya usas. Cuéntanos
            cómo trabajas y te proponemos la solución.
          </p>
        </div>

        <div style={{ marginTop: "7mm", background: CANVAS, borderRadius: 16, padding: "14px 20px" }}>
          <p style={{ margin: "0 0 7px", fontSize: 10, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: DEEP }}>
            Cómo se ve en la práctica
          </p>
          {[
            "Un restaurante con cobros en mesa integrados a su punto de venta y propinas en el mismo flujo",
            "Una escuela con colegiaturas recurrentes y recordatorios automáticos a los padres",
            "Un mayorista con catálogo de precios por cliente y links de pago generados desde su propio sistema",
          ].map((t) => (
            <p key={t} style={{ margin: "0 0 5px", fontSize: 11.5, color: "#3E5049", lineHeight: 1.45 }}>
              · {t}
            </p>
          ))}
        </div>
      </div>
      <Foot />
    </>
  )
}

// ─── Requisitos de documentación (fuente: payefy_requisitos v14.4) ───
const TERMINALS_PF = [
  "Identificación oficial (vigente)",
  "Comprobante de domicilio (no mayor a 2 meses)",
  "Constancia de situación fiscal (no mayor a 2 meses)",
  "Estado de cuenta (no mayor a 2 meses)",
]
const TERMINALS_PM = [
  "Acta constitutiva",
  "Inscripción en el Registro Público de Comercio",
  "Identificación del representante legal (vigente)",
  "Comprobante de domicilio (no mayor a 2 meses)",
  "Constancia de situación fiscal (no mayor a 2 meses)",
  "Estado de cuenta (no mayor a 2 meses)",
]
const TERMINALS_DATA_PF = ["Número de teléfono", "Correo electrónico"]
const TERMINALS_DATA_PM = [
  "Número de teléfono",
  "Correo electrónico",
  "RFC del representante legal",
]

const CARD_DOCS = [
  "Acta constitutiva de la empresa",
  "Última actualización del acta (si aplica)",
  "Poder legal (si aplica)",
  "Constancia e.firma de la empresa",
  "CIF de la empresa",
  "Comprobante de domicilio de la empresa",
  "ID de accionistas con 25%+ de acciones",
  "ID oficial de representantes legales",
  "Prueba de vida de rep. legales (selfie con ID)",
  "Declaración anual o mensual",
  "Opinión de cumplimiento del SAT",
  "Identificación de administradores",
  "Términos y condiciones firmados de forma autógrafa",
  "Carta de constancia de beneficiario controlador",
]
const CARD_DATA = [
  "CURP de accionistas",
  "RFC de accionistas",
  "CURP de representantes legales",
  "RFC de representantes legales",
]

function ReqList({
  title,
  items,
  numbered = true,
  dense = false,
}: {
  title: string
  items: string[]
  numbered?: boolean
  dense?: boolean
}) {
  return (
    <div>
      <p style={{ margin: "0 0 7px", fontSize: 9.5, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: DEEP }}>
        {title}
      </p>
      {items.map((t, i) => (
        <div key={t} className="flex items-start gap-2" style={{ marginBottom: dense ? 3.5 : 5 }}>
          {numbered ? (
            <span style={{ width: 15, height: 15, borderRadius: 5, background: CANVAS, color: DEEP, fontSize: 8.5, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
              {i + 1}
            </span>
          ) : (
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: GREEN, flexShrink: 0, marginTop: 5.5 }} />
          )}
          <span style={{ fontSize: dense ? 10 : 10.8, color: "#3E5049", lineHeight: 1.4 }}>{t}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Recuadro de requisitos de Terminal ──────────────────────────
// Reutilizado: en la página de Documentación (cuando la propuesta incluye
// Tarjeta Payefy) o consolidado dentro de Siguientes pasos (caso común).
function TerminalDocsCard({ data, dense = false }: { data: Partial<ProposalData>; dense?: boolean }) {
  const isMoral = data.entityType === "moral"
  const isCardPresent = data.productType === "terminales"
  const docs = isMoral ? TERMINALS_PM : TERMINALS_PF
  const datos = isMoral ? TERMINALS_DATA_PM : TERMINALS_DATA_PF

  return (
    <div style={{ border: `1px solid ${LINE}`, borderRadius: 16, overflow: "hidden" }}>
      <div style={{ background: DEEP, padding: "9px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: "#fff" }}>
          Terminal Payefy
        </p>
        <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: MINT }}>
          {isMoral ? "Persona Moral" : "Persona Física"} · {isCardPresent ? "Tarjeta presente" : "E-commerce"}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-x-7" style={{ padding: "13px 16px" }}>
        <ReqList title="Documentos" items={docs} dense={dense} />
        <div>
          <ReqList title="Datos que te pediremos" items={datos} numbered={false} dense={dense} />
          <div style={{ marginTop: 10, background: "#F0FAF3", border: "1px solid #CBEFDB", borderRadius: 10, padding: "9px 12px" }}>
            <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: GREEN }}>
              Según tu modalidad
            </p>
            <p style={{ margin: "4px 0 0", fontSize: 10.8, color: "#3E5049", lineHeight: 1.4 }}>
              {isCardPresent
                ? "2 fotos del interior y 2 del exterior de tu negocio"
                : "URL de tu sitio web o link de pago. El sitio debe contar con Términos y Condiciones y Aviso de Privacidad publicados."}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// Notas de formato de los documentos (comparten Documentación y cierre)
function DocFormatNotes() {
  return (
    <p style={{ margin: 0, fontSize: 9.5, color: GRAY, lineHeight: 1.55 }}>
      · Documentos en <strong style={{ color: INK }}>PDF</strong>; fotos e identificaciones en{" "}
      <strong style={{ color: INK }}>JPG</strong>. Las identificaciones deben ir en foto, por ambos lados.
      <br />
      · Cada escritura constitutiva y otorgamiento de poderes debe estar inscrito en el
      Registro Público de la Propiedad y el Comercio.
    </p>
  )
}

// ─── PÁGINA · Documentación requerida ────────────────────────────
function DocsPage({
  data,
  page,
  total,
}: {
  data: Partial<ProposalData>
  page: number
  total: number
}) {
  const isMoral = data.entityType === "moral"

  return (
    <>
      <RunningHead eyebrow="Documentación" page={page} total={total} />
      <div className="flex-1 px-[14mm] pt-[8mm] flex flex-col">
        <h2 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 23, fontWeight: 800, letterSpacing: "-.025em", color: INK }}>
          Lo que necesitamos para tu alta
        </h2>
        <p style={{ margin: "6px 0 0", fontSize: 12, color: GRAY, lineHeight: 1.5 }}>
          Todo se carga en línea desde <strong style={{ color: DEEP }}>payefy.com.mx</strong> con
          tu correo registrado. Te avisamos si falta algo.
        </p>

        {/* Terminal */}
        <div style={{ marginTop: "7mm" }}>
          <TerminalDocsCard data={data} dense />
        </div>

        {/* Tarjeta Payefy */}
        {(
          <div style={{ marginTop: "6mm", border: `1px solid ${LINE}`, borderRadius: 16, overflow: "hidden" }}>
            <div style={{ background: CANVAS, padding: "9px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: INK }}>
                {data.includesCards ? "Tarjeta Payefy" : "Payefy Card · Dispersión con tarjetas"}
              </p>
              <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: isMoral ? GRAY : "#B4443A" }}>
                Solo Persona Moral mexicana
              </p>
            </div>
            {!isMoral && (
              <p style={{ margin: 0, padding: "8px 16px", fontSize: 10.5, color: "#B4443A", background: "#FDF3F2", borderBottom: `1px solid ${LINE}`, lineHeight: 1.4 }}>
                Nota: este producto requiere constituirse como persona moral mexicana.
                Los requisitos de abajo aplicarían una vez constituida la empresa.
              </p>
            )}
            <div className="grid grid-cols-2 gap-x-7" style={{ padding: "13px 16px" }}>
              <ReqList title="Documentos" items={CARD_DOCS} dense />
              <div>
                <ReqList title="Datos que te pediremos" items={CARD_DATA} numbered={false} dense />
                <div style={{ marginTop: 10, background: CANVAS, borderRadius: 10, padding: "9px 12px" }}>
                  <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: GRAY }}>
                    Adicional
                  </p>
                  <p style={{ margin: "4px 0 0", fontSize: 10.5, color: "#3E5049", lineHeight: 1.4 }}>
                    Excel de información complementaria (te lo enviamos para llenar)
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Notas de formato */}
        <div style={{ marginTop: "auto", marginBottom: "5mm", borderTop: `1px solid ${LINE}`, paddingTop: 10 }}>
          <DocFormatNotes />
        </div>
      </div>
      <Foot />
    </>
  )
}

// ─── PÁGINA FINAL · Siguientes pasos ─────────────────────────────
function ClosingPage({
  data,
  calc,
  page,
  total,
}: {
  data: Partial<ProposalData>
  calc: ProposalCalculations
  page: number
  total: number
}) {
  const showSavings = data.proposalType === "comparative" && calc.annualSavings > 0
  // Cuando no hay página de Documentación aparte (propuestas sin Tarjeta
  // Payefy), los requisitos van aquí, consolidados — sin cuartilla propia.
  const docsAqui = !data.includesCards && !data.hasDispersionCards

  return (
    <>
      <RunningHead eyebrow="Siguientes pasos" page={page} total={total} />
      <div className="flex-1 px-[14mm] pt-[9mm] flex flex-col">
        <h2 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 800, letterSpacing: "-.025em", color: INK }}>
          {showSavings ? "El ahorro empieza el primer mes" : "Empezar toma menos de lo que crees"}
        </h2>

        <div className="flex gap-3" style={{ marginTop: "7mm" }}>
          {[
            { n: "1", t: "Cargas tus documentos", s: "En línea, desde la plataforma" },
            { n: "2", t: "Validamos tu expediente", s: "Te avisamos si falta algo" },
            { n: "3", t: "Recibes tu terminal", s: "Y empiezas a cobrar" },
          ].map((s) => (
            <div key={s.n} style={{ flex: 1, background: CANVAS, borderRadius: 16, padding: "16px 18px" }}>
              <span style={{ display: "inline-flex", width: 26, height: 26, borderRadius: "50%", background: DEEP, color: MINT, fontSize: 13, fontWeight: 800, alignItems: "center", justifyContent: "center" }}>
                {s.n}
              </span>
              <p style={{ margin: "10px 0 0", fontSize: 13, fontWeight: 700, color: INK, lineHeight: 1.3 }}>{s.t}</p>
              <p style={{ margin: "3px 0 0", fontSize: 11, color: GRAY }}>{s.s}</p>
            </div>
          ))}
        </div>

        {docsAqui && (
          <>
            <p style={{ margin: "8mm 0 8px", fontSize: 10, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", color: GRAY }}>
              Lo que necesitamos para tu alta — todo en línea desde payefy.com.mx
            </p>
            <TerminalDocsCard data={data} />
            <div style={{ marginTop: "4mm" }}>
              <DocFormatNotes />
            </div>
          </>
        )}

        <div
          className="mt-auto mb-[6mm]"
          style={{ background: DEEP, borderRadius: 20, padding: "22px 26px", position: "relative", overflow: "hidden" }}
        >
          <div style={{ position: "absolute", right: "-10mm", bottom: "-16mm", width: "50mm", height: "50mm", borderRadius: "50%", background: "rgba(174,255,153,.08)" }} />
          <div className="flex items-end justify-between gap-6 relative">
            <div>
              <p style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 21, fontWeight: 800, color: "#fff", letterSpacing: "-.02em" }}>
                ¿Avanzamos, {(data.contactName || "").split(" ")[0] || "equipo"}?
              </p>
              <p style={{ margin: "6px 0 0", fontSize: 12, color: "rgba(255,255,255,.72)", maxWidth: "105mm", lineHeight: 1.5 }}>
                {showSavings
                  ? `Cada mes con tu tasa actual son ${formatCurrency(calc.monthlySavings)} que no regresan. Responde este correo y arrancamos tu cambio hoy mismo — sin detener tu operación.`
                  : "Responde este correo o escríbenos y arrancamos tu alta hoy mismo. Esta propuesta mantiene sus condiciones por 30 días."}
              </p>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: MINT }}>+52 800 953 7909</p>
              <p style={{ margin: "3px 0 0", fontSize: 12, color: "#fff" }}>contacto@payefy.me</p>
              <p style={{ margin: "3px 0 0", fontSize: 12, color: "rgba(255,255,255,.6)" }}>www.payefy.me</p>
            </div>
          </div>
        </div>
      </div>
      <Foot note="Todas las tasas mostradas son sin IVA salvo donde se indique · Propuesta no vinculante" />
    </>
  )
}

// ─── Documento completo ──────────────────────────────────────────
export function ProposalDocument({ data }: { data: Partial<ProposalData> }) {
  const calc = calculateProposal(data)
  const hasDispersion = data.hasDispersionCards
  // La página de Documentación solo existe cuando la propuesta incluye
  // Tarjeta Payefy (dos bloques de requisitos llenan la cuartilla); si no,
  // los requisitos van consolidados dentro de Siguientes pasos.
  const hasDocsPage = !!data.includesCards || !!data.hasDispersionCards
  // Portada · Tasas · [Payefy Card] · Tecnología · [Documentación] · Siguientes pasos
  const total = 4 + (hasDispersion ? 1 : 0) + (hasDocsPage ? 1 : 0)
  const techPage = hasDispersion ? 4 : 3

  return (
    <div id="proposal-document" className="bg-white">
      <div className={pageClass}>
        <CoverPage data={data} calc={calc} />
      </div>

      <div className={pageClass}>
        <RatesPage data={data} calc={calc} page={2} total={total} />
      </div>

      {hasDispersion && (
        <div className={pageClass}>
          <DispersionPage data={data} calc={calc} page={3} total={total} />
        </div>
      )}

      <div className={pageClass}>
        <TechPage page={techPage} total={total} />
      </div>

      {hasDocsPage && (
        <div className={pageClass}>
          <DocsPage data={data} page={techPage + 1} total={total} />
        </div>
      )}

      <div className={pageClass}>
        <ClosingPage data={data} calc={calc} page={total} total={total} />
      </div>
    </div>
  )
}
