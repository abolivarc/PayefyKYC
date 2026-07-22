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
} from "@/lib/proposals/types"
import {
  Building2, Calendar, CreditCard, Monitor, Link2, Smartphone, BarChart3,
  Headphones, Check, Zap, Shield, Award, Globe, Clock, Wallet, Plus, Receipt,
  FileText, TrendingUp, Phone, Mail,
} from "lucide-react"

const G = "#00A86B" // verde Payefy del documento
const LOGO = "/proposals/payefy-logo-dark.png"
const TERMINAL_IMG = "/proposals/terminal-tpv.png"
const CARD_IMG = "/proposals/payefy-card.png"

const rateWithIVA = (rate: number) => (rate * IVA_RATE).toFixed(2)

const pageClass =
  "proposal-pdf-page bg-white w-[210mm] min-h-[287mm] p-6 mx-auto box-border flex flex-col"

// ─── Header compartido ───────────────────────────────────────────
function PageHeader({ showFull = true }: { showFull?: boolean }) {
  return (
    <div
      className={`flex items-center justify-between ${
        showFull
          ? "mb-4 pb-3 border-b-4 border-[#00A86B]"
          : "mb-3 pb-2 border-b-2 border-[#00A86B]/50"
      }`}
    >
      <div>
        <h1 className={`${showFull ? "text-2xl" : "text-lg"} font-bold text-[#00A86B]`}>
          PROPUESTA COMERCIAL
        </h1>
        {showFull && (
          <p className="text-sm text-gray-500">
            {new Date().toLocaleDateString("es-MX", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        )}
      </div>
      <img src={LOGO} alt="Payefy" className={showFull ? "h-14" : "h-10"} />
    </div>
  )
}

// ─── Gráfica de ahorro (divs — robusta para captura) ─────────────
function SavingsChart({
  competitorCost,
  payefyCost,
  competitorName,
}: {
  competitorCost: number
  payefyCost: number
  competitorName: string
}) {
  const max = Math.max(competitorCost, payefyCost, 1)
  const savings = competitorCost - payefyCost
  const bar = (value: number, color: string, label: string) => (
    <div className="flex items-center gap-2 mb-2">
      <div className="w-20 text-right text-[11px] text-gray-600 shrink-0">{label}</div>
      <div className="flex-1 bg-gray-200/60 rounded h-7 relative overflow-hidden">
        <div
          className="h-full rounded flex items-center justify-end pr-2"
          style={{ width: `${Math.max((value / max) * 100, 12)}%`, background: color }}
        >
          <span className="text-white text-[10px] font-bold whitespace-nowrap">
            {formatCurrency(value)}
          </span>
        </div>
      </div>
    </div>
  )
  return (
    <div className="bg-gray-50 rounded-lg p-4">
      {bar(competitorCost, "#ef4444", competitorName)}
      {bar(payefyCost, G, "Payefy")}
      <div className="mt-2 text-center">
        <p className="text-xs text-gray-600">Costo Anual Estimado</p>
        <div className="flex items-center justify-center gap-6 mt-1">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded bg-red-500" />
            <span className="text-xs">{competitorName}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded" style={{ background: G }} />
            <span className="text-xs">Payefy</span>
          </div>
        </div>
        <p className="mt-1 text-sm font-semibold" style={{ color: G }}>
          Tu ahorro: {formatCurrency(savings)} al año
        </p>
      </div>
    </div>
  )
}

// ─── Página 1: Portada ───────────────────────────────────────────
function CoverPage({
  data,
  calculations,
}: {
  data: Partial<ProposalData>
  calculations: ProposalCalculations
}) {
  const isComparative = data.proposalType === "comparative"
  const hasDispersion = data.hasDispersionCards

  return (
    <div className="h-full flex flex-col flex-1">
      <PageHeader />

      {/* Hero */}
      <div className="bg-gradient-to-r from-[#00A86B] to-[#008F5B] rounded-xl p-5 mb-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-xs uppercase tracking-wider opacity-80 mb-1">
              Preparada para
            </p>
            <h2 className="text-2xl font-bold mb-2">{data.businessName}</h2>
            <p className="text-sm opacity-90">{data.sectorFamilia}</p>
            <div className="flex items-center gap-4 mt-4">
              <div className="bg-white/20 rounded-lg px-3 py-2">
                <p className="text-[10px] uppercase opacity-80">Volumen Mensual</p>
                <p className="text-lg font-bold">
                  {formatCurrency(data.monthlyVolume || 0)}
                </p>
              </div>
              {data.averageTicket ? (
                <div className="bg-white/20 rounded-lg px-3 py-2">
                  <p className="text-[10px] uppercase opacity-80">Ticket Promedio</p>
                  <p className="text-lg font-bold">
                    {formatCurrency(data.averageTicket)}
                  </p>
                </div>
              ) : null}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <img
              src={TERMINAL_IMG}
              alt="Terminal Payefy"
              className="h-32 object-contain"
            />
            {hasDispersion && (
              <img src={CARD_IMG} alt="Tarjeta Payefy" className="h-28 object-contain" />
            )}
          </div>
        </div>
      </div>

      {/* Ahorro destacado (comparativa) */}
      {isComparative && calculations.annualSavings > 0 && (
        <div className="bg-amber-50 border-2 border-amber-400 rounded-xl p-4 mb-4 text-center">
          <p className="text-xs uppercase tracking-wide text-amber-600 mb-1">
            Ahorro Anual Estimado vs {data.competitorName}
          </p>
          <p className="text-4xl font-bold text-amber-600">
            {formatCurrency(calculations.annualSavings)}
          </p>
          <p className="text-sm text-amber-700 mt-1">
            ({calculations.savingsPercentage.toFixed(1)}% de reducción en costos)
          </p>
        </div>
      )}

      {/* Info del negocio */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="h-4 w-4" style={{ color: G }} />
            <h3 className="text-xs uppercase text-gray-500 font-medium">
              Tipo de Entidad
            </h3>
          </div>
          <p className="font-semibold text-sm">
            {data.entityType ? ENTITY_TYPE_LABELS[data.entityType] : ""}
          </p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="h-4 w-4" style={{ color: G }} />
            <h3 className="text-xs uppercase text-gray-500 font-medium">Vigencia</h3>
          </div>
          <p className="font-semibold text-sm">30 días</p>
        </div>
      </div>

      {/* Contacto */}
      <div className="bg-[#00A86B]/5 border border-[#00A86B]/20 rounded-lg p-3 mb-4">
        <h3 className="text-xs uppercase text-gray-500 font-medium mb-2">
          Datos de Contacto
        </h3>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Nombre</p>
            <p className="font-medium">{data.contactName}</p>
          </div>
          <div>
            <p className="text-gray-500">Email</p>
            <p className="font-medium break-all">{data.contactEmail}</p>
          </div>
          <div>
            <p className="text-gray-500">Teléfono</p>
            <p className="font-medium">{data.contactPhone || "—"}</p>
          </div>
        </div>
      </div>

      {/* Productos incluidos */}
      <div className="flex-1 bg-gray-50 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">
          Productos Incluidos en esta Propuesta
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {(() => {
            const productConfig = {
              terminales: { icon: CreditCard, label: "Payefy Terminal", desc: "Terminal de cobro con las mejores tasas", color: G },
              venta_en_linea: { icon: Monitor, label: "Venta en Línea", desc: "Cobros por e-commerce integrado", color: "#3B82F6" },
              link_de_pago: { icon: Link2, label: "Link de Pago", desc: "Cobros con link compartido", color: "#8B5CF6" },
            }
            const product = productConfig[data.productType || "terminales"]
            const Icon = product.icon
            return (
              <div
                className="flex items-center gap-3 bg-white rounded-lg p-3 border"
                style={{ borderColor: `${product.color}50` }}
              >
                <div
                  className="h-10 w-10 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: `${product.color}15` }}
                >
                  <Icon className="h-5 w-5" style={{ color: product.color }} />
                </div>
                <div>
                  <p className="font-semibold text-sm" style={{ color: product.color }}>
                    {product.label}
                  </p>
                  <p className="text-xs text-gray-600">{product.desc}</p>
                </div>
              </div>
            )
          })()}
          {hasDispersion && (
            <div className="flex items-center gap-3 bg-white rounded-lg p-3 border border-amber-400/50">
              <div className="h-10 w-10 bg-amber-100 rounded-full flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="font-semibold text-sm text-amber-600">Payefy Card</p>
                <p className="text-xs text-gray-600">Tarjetas de dispersión</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-auto pt-4 text-center text-xs text-gray-400">
        Página 1 | payefy.me
      </div>
    </div>
  )
}

// ─── Página 2: Producto Terminal ─────────────────────────────────
function TerminalPage({
  data,
  calculations,
  pageNumber,
  totalPages,
}: {
  data: Partial<ProposalData>
  calculations: ProposalCalculations
  pageNumber: number
  totalPages: number
}) {
  const isComparative = data.proposalType === "comparative"
  const amex = data.negotiatedAmexRate ?? AMEX_FLOOR_RATE
  const intl = data.negotiatedInternationalRate ?? INTERNATIONAL_FLOOR_RATE

  const features = [
    { icon: CreditCard, text: "Terminal física o virtual para cobros con tarjeta" },
    { icon: BarChart3, text: "Tasas diferenciadas por tipo de tarjeta" },
    { icon: Building2, text: "Depósito directo a tu cuenta bancaria (T+1)" },
    { icon: Smartphone, text: "Dashboard de transacciones en tiempo real" },
    { icon: Headphones, text: "Soporte técnico dedicado 24/7" },
    { icon: Shield, text: "Sin renta mensual ni costos ocultos" },
  ]

  const compRows: { label: string; comp?: number; payefy: number }[] = [
    { label: "Tasa Débito", comp: data.competitorDebitRate, payefy: data.negotiatedDebitRate || 0 },
    { label: "Tasa Crédito", comp: data.competitorCreditRate, payefy: data.negotiatedCreditRate || 0 },
    ...(data.competitorAmexRate !== undefined
      ? [{ label: "Tasa AMEX", comp: data.competitorAmexRate, payefy: amex }]
      : []),
    ...(data.competitorInternationalRate !== undefined
      ? [{ label: "Tasa Internacional", comp: data.competitorInternationalRate, payefy: intl }]
      : []),
  ]

  return (
    <div className="h-full flex flex-col flex-1">
      {/* Badge */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="bg-[#00A86B] text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">
            Payefy Terminal
          </span>
          <span className="text-gray-400 text-xs">Terminal de Cobro</span>
        </div>
        <div className="bg-[#00A86B]/10 text-[#00A86B] text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded flex items-center gap-1">
          <Award className="h-3 w-3" />
          Máximo Ahorro
        </div>
      </div>

      {/* Hero compacto */}
      <div className="bg-gradient-to-br from-[#00A86B] to-[#006644] text-white rounded-xl p-3 mb-3 flex items-center justify-between">
        <div className="flex-1">
          <h2 className="text-xl font-bold mb-1">Payefy Terminal</h2>
          <p className="text-xs opacity-90 mb-2">
            Terminal punto de venta con las mejores tasas del mercado
          </p>
          <div className="flex items-center gap-2">
            <Zap className="h-3 w-3" />
            <span className="text-[10px]">Depósito al siguiente día hábil</span>
          </div>
        </div>
        <img src={TERMINAL_IMG} alt="Terminal Payefy" className="h-20 object-contain" />
      </div>

      {isComparative && (
        <>
          {/* Tabla comparativa */}
          <div className="mb-2">
            <h3 className="text-xs font-semibold mb-1 text-[#00A86B]">
              Comparativa de Tasas{" "}
              <span className="font-normal text-gray-400">(sin IVA)</span>
            </h3>
            <table className="w-full border-collapse text-[10px]">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border p-1.5 text-left">Concepto</th>
                  <th className="border p-1.5 text-center text-red-600">
                    {data.competitorName}
                  </th>
                  <th className="border p-1.5 text-center text-[#00A86B]">Payefy</th>
                  <th className="border p-1.5 text-center">Diferencia</th>
                </tr>
              </thead>
              <tbody>
                {compRows.map((row, i) => (
                  <tr key={row.label} className={i % 2 === 1 ? "bg-gray-50" : ""}>
                    <td className="border p-1.5">
                      {row.label} <span className="text-gray-400">(sin IVA)</span>
                    </td>
                    <td className="border p-1.5 text-center text-red-600 font-medium">
                      {row.comp}%
                    </td>
                    <td className="border p-1.5 text-center text-[#00A86B] font-medium">
                      {row.payefy}%
                    </td>
                    <td className="border p-1.5 text-center text-[#00A86B] font-medium">
                      {((row.comp || 0) - row.payefy) >= 0 ? "-" : "+"}
                      {Math.abs((row.comp || 0) - row.payefy).toFixed(2)}%
                    </td>
                  </tr>
                ))}
                <tr className="bg-[#00A86B]/10">
                  <td className="border p-1.5 font-semibold">
                    Costo Mensual{" "}
                    <span className="text-gray-500 font-normal">(c/IVA)</span>
                  </td>
                  <td className="border p-1.5 text-center text-red-600 font-bold">
                    {formatCurrency(calculations.competitorMonthlyCost)}
                  </td>
                  <td className="border p-1.5 text-center text-[#00A86B] font-bold">
                    {formatCurrency(calculations.payefyMonthlyCost)}
                  </td>
                  <td className="border p-1.5 text-center text-[#00A86B] font-bold">
                    {formatCurrency(calculations.monthlySavings)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {calculations.annualSavings > 0 && (
            <div className="mb-2">
              <SavingsChart
                competitorCost={calculations.competitorAnnualCost}
                payefyCost={calculations.payefyAnnualCost}
                competitorName={data.competitorName || "Competidor"}
              />
            </div>
          )}
        </>
      )}

      {/* Grid de tasas */}
      <div className="mb-2">
        <h3 className="text-xs font-semibold mb-1 text-[#00A86B]">
          {isComparative ? "Todas las Tasas Payefy (sin IVA)" : "Tasas Negociadas (sin IVA)"}
        </h3>
        <div className="grid grid-cols-4 gap-1">
          {[
            { label: "Débito", value: data.negotiatedDebitRate || 0, bg: "bg-[#00A86B]/10 border-[#00A86B]/20", color: "text-[#00A86B]" },
            { label: "Crédito", value: data.negotiatedCreditRate || 0, bg: "bg-[#00A86B]/10 border-[#00A86B]/20", color: "text-[#00A86B]" },
            { label: "AMEX", value: amex, bg: "bg-blue-50 border-blue-200", color: "text-blue-600" },
            { label: "Internacional", value: intl, bg: "bg-purple-50 border-purple-200", color: "text-purple-600" },
          ].map((r) => (
            <div key={r.label} className={`p-1.5 border rounded text-center ${r.bg}`}>
              <p className="text-[9px] text-gray-500 uppercase">{r.label}</p>
              <p className={`text-sm font-bold ${r.color}`}>{r.value}%</p>
              <p className="text-[8px] text-gray-400">c/IVA: {rateWithIVA(r.value)}%</p>
            </div>
          ))}
        </div>
      </div>

      {/* Qué incluye */}
      <div className="bg-[#00A86B]/5 border border-[#00A86B]/20 rounded-lg p-2 mb-2">
        <h3 className="font-semibold text-[#00A86B] mb-1 text-xs">¿Qué incluye?</h3>
        <div className="grid grid-cols-2 gap-1">
          {features.map((feature, idx) => (
            <div key={idx} className="flex items-center gap-1">
              <div className="h-5 w-5 rounded-full bg-[#00A86B]/10 flex items-center justify-center flex-shrink-0">
                <feature.icon className="h-2.5 w-2.5 text-[#00A86B]" />
              </div>
              <span className="text-[10px] text-gray-700">{feature.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Resumen de costos */}
      {!isComparative ? (
        <div className="bg-white border rounded-lg overflow-hidden mb-2">
          <div className="bg-[#00A86B] text-white px-2 py-1.5">
            <h3 className="font-semibold text-[10px]">
              Costos para {formatCurrency(data.monthlyVolume || 0)}/mes
            </h3>
          </div>
          <div className="p-2">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-[9px] text-gray-500 uppercase">Mensual</p>
                <p className="text-sm font-bold text-gray-800">
                  {formatCurrency(calculations.payefyMonthlyCost)}
                </p>
              </div>
              <div>
                <p className="text-[9px] text-gray-500 uppercase">Neto</p>
                <p className="text-sm font-bold text-gray-800">
                  {formatCurrency((data.monthlyVolume || 0) - calculations.payefyMonthlyCost)}
                </p>
              </div>
              <div>
                <p className="text-[9px] text-gray-500 uppercase">Anual</p>
                <p className="text-sm font-bold text-gray-800">
                  {formatCurrency(calculations.payefyAnnualCost)}
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-[#00A86B]/10 border border-[#00A86B]/30 rounded-lg p-2 mb-2">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-[9px] text-gray-600 uppercase">Costo Mensual</p>
              <p className="text-sm font-bold text-gray-800">
                {formatCurrency(calculations.payefyMonthlyCost)}
              </p>
              <p className="text-[8px] text-gray-400">con IVA</p>
            </div>
            <div>
              <p className="text-[9px] text-gray-600 uppercase">Ahorro Mensual</p>
              <p className="text-sm font-bold text-[#00A86B]">
                {formatCurrency(calculations.monthlySavings)}
              </p>
              <p className="text-[8px] text-gray-400">vs {data.competitorName}</p>
            </div>
            <div className="bg-[#00A86B] text-white rounded p-1.5">
              <p className="text-[9px] uppercase opacity-90">Ahorro Anual</p>
              <p className="text-lg font-bold">
                {formatCurrency(calculations.annualSavings)}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="mt-auto pt-2 text-center text-[10px] text-gray-400">
        Página {pageNumber}/{totalPages} | payefy.me
      </div>
    </div>
  )
}

// ─── Página: Dispersión (Payefy Card) ────────────────────────────
function DispersionPage({
  data,
  pageNumber,
  totalPages,
}: {
  data: Partial<ProposalData>
  pageNumber: number
  totalPages: number
}) {
  const feeBase = data.dispersionFeeBase || 0.5
  const instantFee = data.instantFeeRate ?? 1.0

  const baseFeatures = [
    { text: "Terminal física o virtual" },
    { text: "Tasas diferenciadas por tarjeta" },
    { text: "Dashboard en tiempo real" },
    { text: "Soporte dedicado 24/7" },
  ]
  const dispersionFeatures = [
    { text: "Tarjetas Visa físicas y virtuales" },
    { text: "App móvil de control de gastos" },
    { text: "Disponibilidad inmediata opcional" },
    { text: "Reportes y conciliación en tiempo real" },
  ]

  return (
    <div className="h-full flex flex-col flex-1">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="bg-amber-500 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">
            Payefy Card
          </span>
          <span className="text-gray-400 text-xs">Tarjetas de Dispersión</span>
        </div>
        <div className="bg-amber-100 text-amber-700 text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded flex items-center gap-1">
          <Award className="h-3 w-3" />
          Liquidez Inmediata
        </div>
      </div>

      <div className="bg-gradient-to-br from-amber-500 to-amber-600 text-white rounded-xl p-4 mb-3 flex items-center justify-between">
        <div className="flex-1">
          <h2 className="text-xl font-bold mb-1">Payefy Card</h2>
          <p className="text-sm opacity-90 mb-2">
            Dispersión de fondos a tarjetas físicas y virtuales
          </p>
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            <span className="text-xs">Disponibilidad inmediata bajo demanda</span>
          </div>
        </div>
        <img src={CARD_IMG} alt="Tarjeta Payefy" className="h-24 object-contain" />
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3">
        <h3 className="font-semibold text-amber-800 mb-1 text-sm">
          ¿Qué es la Dispersión con Tarjetas?
        </h3>
        <p className="text-xs text-gray-700">
          En lugar de transferencias bancarias tradicionales, Payefy habilita tus
          fondos en una plataforma digital con tarjetas físicas y virtuales,
          permitiéndote disponer de tu dinero de forma flexible, controlada y segura.{" "}
          <strong>Tú sigues facturando normalmente.</strong>
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="bg-[#00A86B]/5 border border-[#00A86B]/20 rounded-lg p-2">
          <h4 className="text-[10px] uppercase text-[#00A86B] font-semibold mb-2">
            Con Payefy Terminal:
          </h4>
          <div className="space-y-1">
            {baseFeatures.map((feature, idx) => (
              <div key={idx} className="flex items-center gap-1">
                <Check className="h-3 w-3 text-[#00A86B]" />
                <span className="text-[10px] text-gray-600">{feature.text}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-2">
          <div className="flex items-center gap-1 mb-2">
            <Plus className="h-3 w-3 text-amber-600" />
            <h4 className="text-[10px] uppercase text-amber-600 font-semibold">
              Adicional:
            </h4>
          </div>
          <div className="space-y-1">
            {dispersionFeatures.map((feature, idx) => (
              <div key={idx} className="flex items-center gap-1">
                <Check className="h-3 w-3 text-amber-600" />
                <span className="text-[10px] text-gray-600">{feature.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mb-3">
        <h3 className="font-semibold text-gray-800 mb-2 text-xs">¿Cuánto cuesta?</h3>
        <p className="text-[10px] text-gray-600 mb-2">
          Solo pagas por lo que decidas dispersar a tus tarjetas:
        </p>
        <div className="grid grid-cols-2 gap-2 mb-2">
          <div className="p-2 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-blue-600" />
              <span className="font-semibold text-blue-800 text-sm">
                Depósito Estándar
              </span>
            </div>
            <p className="text-[10px] text-gray-600 mb-1">
              Fondos sobre depósito regular en tu tarjeta
            </p>
            <p className="text-lg font-bold text-blue-600">
              {feeBase}% <span className="text-xs font-normal">+ IVA</span>
            </p>
            <p className="text-[9px] text-gray-500">Al día siguiente hábil</p>
          </div>
          <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="h-4 w-4 text-amber-600" />
              <span className="font-semibold text-amber-800 text-sm">Inmediata</span>
            </div>
            <p className="text-[10px] text-gray-600 mb-1">
              Fondos disponibles inmediatamente
            </p>
            <p className="text-lg font-bold text-amber-600">
              {instantFee}% <span className="text-xs font-normal">+ IVA</span>
            </p>
            <p className="text-[9px] text-gray-500">Bajo demanda</p>
          </div>
        </div>
        <div className="space-y-1 text-[10px] text-gray-600">
          <div className="flex items-center gap-1">
            <Check className="h-3 w-3 text-gray-500" />
            <span>Aplica solo sobre el monto que envíes a tus tarjetas</span>
          </div>
          <div className="flex items-center gap-1">
            <Check className="h-3 w-3 text-gray-500" />
            <span>Sin montos mínimos ni máximos • Tú controlas cuánto y cuándo</span>
          </div>
        </div>
      </div>

      <div className="flex-1 bg-gray-50 rounded-lg p-3 mb-2">
        <h3 className="font-semibold text-gray-800 mb-2 text-xs">Ideal para ti si:</h3>
        <div className="space-y-1">
          {[
            "Necesitas liquidez inmediata para pagar proveedores o nómina",
            "Quieres dar tarjetas a tu equipo para gastos del negocio",
            "Prefieres control total sobre el flujo de efectivo desde la app",
          ].map((t) => (
            <div key={t} className="flex items-start gap-2">
              <Check className="h-3 w-3 text-amber-600 mt-0.5 flex-shrink-0" />
              <span className="text-[10px] text-gray-700">{t}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-blue-50 border-l-4 border-blue-500 p-2 text-[10px]">
        <p className="font-semibold text-blue-800 mb-0.5">
          Nota sobre Disponibilidad Inmediata
        </p>
        <p className="text-gray-700">
          La tasa de {instantFee}% aplica cuando eliges disponibilidad inmediata. Es
          opcional y se activa bajo demanda — puedes elegir día a día si prefieres
          depósito estándar ({feeBase}%) o inmediato ({instantFee}%).
        </p>
      </div>

      <div className="mt-auto pt-2 text-center text-xs text-gray-400">
        Página {pageNumber}/{totalPages} | payefy.me
      </div>
    </div>
  )
}

// ─── Página final: Documentos + CTA ──────────────────────────────
function SummaryPage({
  data,
  pageNumber,
  totalPages,
}: {
  data: Partial<ProposalData>
  pageNumber: number
  totalPages: number
}) {
  const hasDispersion = data.hasDispersionCards
  const monthlyVolume = data.monthlyVolume || 0
  const meetsComodatoThreshold = monthlyVolume >= 300000
  const isMoral = data.entityType === "moral"

  const moralDocs = [
    "Acta Constitutiva",
    "Poder Notarial",
    "INE del Representante Legal",
    "Constancia de Situación Fiscal (no mayor a 2 meses)",
    "Comprobante de Domicilio (no mayor a 2 meses)",
    "Estado de Cuenta Bancario",
  ]
  const fisicaDocs = [
    "Identificación Oficial (INE/Pasaporte)",
    "Constancia de Situación Fiscal (no mayor a 2 meses)",
    "Comprobante de Domicilio (no mayor a 2 meses)",
    "Estado de Cuenta Bancario",
  ]

  const benefits = [
    {
      icon: Shield,
      text: meetsComodatoThreshold ? "Terminal en comodato" : "Terminal disponible",
      subtext: meetsComodatoThreshold ? "Sin renta mensual*" : "Renta o compra",
    },
    {
      icon: Clock,
      text: hasDispersion ? "Dispersión inmediata" : "Depósito T+1",
      subtext: hasDispersion ? "Fondos el mismo día" : "Siguiente día hábil",
    },
    { icon: Smartphone, text: "App de gestión", subtext: "Control en tiempo real" },
    { icon: TrendingUp, text: "Tasas competitivas", subtext: "Las mejores del mercado" },
    { icon: Headphones, text: "Soporte dedicado", subtext: "Atención personalizada" },
    { icon: FileText, text: "Reportes detallados", subtext: "Conciliación automatizada" },
  ]

  return (
    <div className="h-full flex flex-col flex-1">
      {/* Documentos requeridos */}
      <div className="mb-4">
        <h2 className="text-base font-semibold mb-2 text-[#00A86B]">
          Documentos Requeridos
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="text-sm bg-gray-50 rounded-lg p-3">
            <p className="font-medium mb-2 text-[#00A86B]">
              {isMoral ? "Persona Moral:" : "Persona Física:"}
            </p>
            <ul className="space-y-1">
              {(isMoral ? moralDocs : fisicaDocs).map((doc) => (
                <li key={doc} className="flex items-start gap-2">
                  <Check className="h-3 w-3 text-[#00A86B] mt-1 flex-shrink-0" />
                  <span className="text-xs text-gray-600">{doc}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="text-sm bg-gray-50 rounded-lg p-3">
            <p className="font-medium mb-2 text-[#00A86B]">Fotos del Comercio:</p>
            <ul className="space-y-1">
              {["2 fotos del exterior del comercio", "2 fotos del interior del comercio"].map(
                (doc) => (
                  <li key={doc} className="flex items-start gap-2">
                    <Check className="h-3 w-3 text-[#00A86B] mt-1 flex-shrink-0" />
                    <span className="text-xs text-gray-600">{doc}</span>
                  </li>
                )
              )}
            </ul>
          </div>
        </div>
      </div>

      {/* Beneficios */}
      <div className="mb-4">
        <h2 className="text-base font-semibold mb-2 text-[#00A86B]">¿Por qué Payefy?</h2>
        <div className="grid grid-cols-3 gap-2">
          {benefits.map((benefit, idx) => (
            <div
              key={idx}
              className="bg-[#00A86B]/5 border border-[#00A86B]/20 rounded-lg p-2 text-center"
            >
              <benefit.icon className="h-5 w-5 text-[#00A86B] mx-auto mb-1" />
              <p className="text-xs font-medium text-gray-800">{benefit.text}</p>
              <p className="text-[10px] text-gray-500">{benefit.subtext}</p>
            </div>
          ))}
        </div>
        {meetsComodatoThreshold && (
          <p className="text-[9px] text-gray-400 mt-1">
            *Terminal en comodato disponible para comercios con volumen mensual mayor a
            $300,000 MXN
          </p>
        )}
      </div>

      {/* CTA */}
      <div className="flex-1 flex flex-col justify-end">
        <div className="bg-gradient-to-r from-[#00A86B] to-[#008F5B] rounded-xl p-4 text-white text-center mb-4">
          <h3 className="text-lg font-bold mb-1">¿Listo para empezar?</h3>
          <p className="text-sm opacity-90 mb-3">
            Contacta a tu ejecutivo comercial para iniciar el proceso de alta
          </p>
          <div className="flex justify-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              <span>+52 800 953 7909</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              <span>contacto@payefy.me</span>
            </div>
          </div>
        </div>

        <div className="pt-3 border-t text-center">
          <p className="text-xs text-gray-500">
            Propuesta válida por 30 días | Esta propuesta no representa un contrato
            vinculante
          </p>
          <div className="flex items-center justify-center gap-2 mt-2">
            <Globe className="h-3 w-3 text-[#00A86B]" />
            <p className="text-[#00A86B] font-semibold text-sm">www.payefy.me</p>
          </div>
        </div>

        <div className="mt-2 text-center text-xs text-gray-400">
          Página {pageNumber}/{totalPages} | payefy.me
        </div>
      </div>
    </div>
  )
}

// ─── Documento completo ──────────────────────────────────────────
export function ProposalDocument({ data }: { data: Partial<ProposalData> }) {
  const calculations = calculateProposal(data)
  const hasDispersion = data.hasDispersionCards
  const totalPages = hasDispersion ? 4 : 3

  return (
    <div id="proposal-document" className="bg-white">
      <div className={pageClass}>
        <CoverPage data={data} calculations={calculations} />
      </div>

      <div className={pageClass}>
        <PageHeader showFull={false} />
        <TerminalPage
          data={data}
          calculations={calculations}
          pageNumber={2}
          totalPages={totalPages}
        />
      </div>

      {hasDispersion && (
        <div className={pageClass}>
          <PageHeader showFull={false} />
          <DispersionPage data={data} pageNumber={3} totalPages={totalPages} />
        </div>
      )}

      <div className={pageClass}>
        <PageHeader showFull={false} />
        <SummaryPage data={data} pageNumber={totalPages} totalPages={totalPages} />
      </div>
    </div>
  )
}
