"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import {
  StepProps,
  COMPETITORS,
  AMEX_FLOOR_RATE,
  INTERNATIONAL_FLOOR_RATE,
  formatCurrency,
} from "@/lib/proposals/types"
import {
  AlertTriangle,
  Info,
  TrendingUp,
  TrendingDown,
  CreditCard,
  Globe,
  DollarSign,
  Eye,
  EyeOff,
} from "lucide-react"
import { DispersionSection } from "./dispersion-section"

// Tiers de revenue share para la comisión del comercial (uso interno)
function getRevenueShareTier(monthlyVolume: number) {
  if (monthlyVolume >= 2500000) return { percentage: 0.45, label: "45%", tier: "Premium" }
  if (monthlyVolume >= 500000) return { percentage: 0.35, label: "35%", tier: "Avanzado" }
  return { percentage: 0.25, label: "25%", tier: "Estándar" }
}

export function Step3RatesConfig({ data, updateData }: StepProps) {
  const isComparative = data.proposalType === "comparative"

  const validateRate = (rate: number | undefined, floor: number, type: string) => {
    if (rate === undefined) return null
    if (rate < floor) return `La tasa de ${type} no puede ser menor al piso (${floor}%)`
    return null
  }

  const debitError = validateRate(data.negotiatedDebitRate, data.sectorDebitFloor || 0, "débito")
  const creditError = validateRate(data.negotiatedCreditRate, data.sectorCreditFloor || 0, "crédito")
  const amexError = validateRate(data.negotiatedAmexRate, AMEX_FLOOR_RATE, "AMEX")
  const internationalError = validateRate(
    data.negotiatedInternationalRate,
    INTERNATIONAL_FLOOR_RATE,
    "internacional"
  )

  const distTotal =
    (data.debitDistribution ?? 50) +
    (data.creditDistribution ?? 50) +
    (data.amexDistribution ?? 0) +
    (data.internationalDistribution ?? 0)

  const rateFields: {
    key: "negotiatedDebitRate" | "negotiatedCreditRate" | "negotiatedAmexRate" | "negotiatedInternationalRate"
    label: string
    floor: number
    error: string | null
  }[] = [
    { key: "negotiatedDebitRate", label: "Tasa Débito (%)", floor: data.sectorDebitFloor || 0, error: debitError },
    { key: "negotiatedCreditRate", label: "Tasa Crédito (%)", floor: data.sectorCreditFloor || 0, error: creditError },
    { key: "negotiatedAmexRate", label: "Tasa AMEX (%)", floor: AMEX_FLOOR_RATE, error: amexError },
    { key: "negotiatedInternationalRate", label: "Tasa Internacional (%)", floor: INTERNATIONAL_FLOOR_RATE, error: internationalError },
  ]

  const competitorFields: {
    key: "competitorDebitRate" | "competitorCreditRate" | "competitorAmexRate" | "competitorInternationalRate"
    label: string
    placeholder: string
  }[] = [
    { key: "competitorDebitRate", label: "Tasa Débito Actual (%)", placeholder: "Ej: 2.5" },
    { key: "competitorCreditRate", label: "Tasa Crédito Actual (%)", placeholder: "Ej: 3.5" },
    { key: "competitorAmexRate", label: "Tasa AMEX Actual (%) — opcional", placeholder: "Ej: 3.5" },
    { key: "competitorInternationalRate", label: "Tasa Internacional Actual (%) — opcional", placeholder: "Ej: 3.8" },
  ]

  const distFields: {
    key: "debitDistribution" | "creditDistribution" | "amexDistribution" | "internationalDistribution"
    label: string
  }[] = [
    { key: "debitDistribution", label: "Débito %" },
    { key: "creditDistribution", label: "Crédito %" },
    { key: "amexDistribution", label: "AMEX %" },
    { key: "internationalDistribution", label: "Internacional %" },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-1">Configuración de Tasas</h2>
        <p className="text-muted-foreground text-sm">
          Configura las tasas para la propuesta de{" "}
          <span className="font-medium text-foreground">{data.businessName}</span>
        </p>
      </div>

      {/* Pisos mínimos */}
      <div className="p-4 bg-[#F0FAF3] border border-[#004238]/20 rounded-lg">
        <div className="flex items-center gap-2 mb-3">
          <Info className="h-4 w-4 text-[#004238]" />
          <span className="font-medium text-[#004238]">Pisos Mínimos</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-gray-400" />
            <span>Débito: <strong>{data.sectorDebitFloor}%</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-gray-400" />
            <span>Crédito: <strong>{data.sectorCreditFloor}%</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-gray-400" />
            <span>AMEX: <strong>{AMEX_FLOOR_RATE}%</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-gray-400" />
            <span>Internacional: <strong>{INTERNATIONAL_FLOOR_RATE}%</strong></span>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Giro: {data.sectorFamilia} (MCC {data.mccCode}) | AMEX e Internacional son
          pisos fijos contractuales
        </p>
      </div>

      {/* Tasas negociadas */}
      <div className="border rounded-lg p-6">
        <h3 className="font-medium mb-1 flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-[#004238]" />
          Tasas Negociadas Payefy
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          Ingresa las tasas que ofrecerás al cliente (deben ser ≥ al piso correspondiente)
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rateFields.map((f) => (
            <div key={f.key} className="space-y-2">
              <Label htmlFor={f.key}>{f.label}</Label>
              <Input
                id={f.key}
                type="number"
                step="0.01"
                min={f.floor}
                value={data[f.key] ?? ""}
                onChange={(e) =>
                  updateData({ [f.key]: parseFloat(e.target.value) || 0 })
                }
                placeholder={`Mínimo: ${f.floor}%`}
                className={f.error ? "border-destructive" : ""}
              />
              {f.error && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {f.error}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Distribución del volumen */}
      <div className="border rounded-lg p-6">
        <h3 className="font-medium mb-1">Distribución del Volumen por Tarjeta</h3>
        <p className="text-sm text-gray-500 mb-4">
          Cómo se reparte el volumen mensual entre tipos de tarjeta (deben sumar 100%)
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {distFields.map((f) => (
            <div key={f.key} className="space-y-2">
              <Label htmlFor={f.key} className="text-xs">{f.label}</Label>
              <Input
                id={f.key}
                type="number"
                min={0}
                max={100}
                value={data[f.key] ?? 0}
                onChange={(e) =>
                  updateData({ [f.key]: parseFloat(e.target.value) || 0 })
                }
              />
            </div>
          ))}
        </div>
        {Math.round(distTotal) !== 100 && (
          <p className="text-xs text-destructive flex items-center gap-1 mt-3">
            <AlertTriangle className="h-3 w-3" />
            La distribución suma {distTotal}% — debe sumar 100%
          </p>
        )}
      </div>

      {/* Competidor (solo comparativa) */}
      {isComparative && (
        <div className="border rounded-lg p-6">
          <h3 className="font-medium mb-1 flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-red-500" />
            Información del Competidor
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            Ingresa las tasas actuales que el cliente paga a su procesador actual
          </p>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Competidor</Label>
              <Select
                value={data.competitorName ?? ""}
                onChange={(e) => updateData({ competitorName: e.target.value })}
              >
                <option value="" disabled>
                  Seleccionar competidor...
                </option>
                {COMPETITORS.map((comp) => (
                  <option key={comp} value={comp}>
                    {comp}
                  </option>
                ))}
              </Select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {competitorFields.map((f) => (
                <div key={f.key} className="space-y-2">
                  <Label htmlFor={f.key}>{f.label}</Label>
                  <Input
                    id={f.key}
                    type="number"
                    step="0.01"
                    value={data[f.key] ?? ""}
                    onChange={(e) => {
                      const v = e.target.value
                      updateData({ [f.key]: v === "" ? undefined : parseFloat(v) || 0 })
                    }}
                    placeholder={f.placeholder}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Comisión estimada del comercial (interno) */}
      {!!data.monthlyVolume &&
        data.negotiatedDebitRate !== undefined &&
        data.negotiatedCreditRate !== undefined &&
        !debitError &&
        !creditError && <CommissionCalculator data={data} />}

      {/* Dispersión con tarjetas */}
      <DispersionSection data={data} updateData={updateData} />

      {/* Aviso IVA */}
      <div className="flex items-start gap-2 p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
        <p className="text-sm text-amber-800">
          <strong>Importante:</strong> Todos los precios y tasas mostradas NO incluyen
          IVA. Se debe agregar 16% de IVA a todos los montos de comisión.
        </p>
      </div>
    </div>
  )
}

// Comisión interna del comercial — no aparece en el PDF
function CommissionCalculator({ data }: { data: StepProps["data"] }) {
  const [isOpen, setIsOpen] = useState(false)

  const monthlyVolume = data.monthlyVolume || 0
  const debitDist = (data.debitDistribution ?? 50) / 100
  const creditDist = (data.creditDistribution ?? 50) / 100

  const debitVolume = monthlyVolume * debitDist
  const creditVolume = monthlyVolume * creditDist

  const debitMargin = ((data.negotiatedDebitRate || 0) - (data.sectorDebitFloor || 0)) / 100
  const creditMargin = ((data.negotiatedCreditRate || 0) - (data.sectorCreditFloor || 0)) / 100

  const debitRevenue = debitVolume * debitMargin
  const creditRevenue = creditVolume * creditMargin
  const totalRevenue = debitRevenue + creditRevenue

  const tier = getRevenueShareTier(monthlyVolume)
  const monthlyCommission = totalRevenue * tier.percentage
  const annualCommission = monthlyCommission * 12

  if (totalRevenue <= 0) return null

  return (
    <div className="border-2 border-dashed border-[#004238]/30 rounded-lg overflow-hidden bg-[#F0FAF3]/60">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 flex items-center justify-between hover:bg-[#F0FAF3] transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-[#004238]/15 flex items-center justify-center">
            <DollarSign className="h-5 w-5 text-[#004238]" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-[#004238]">Tu Comisión Estimada</h3>
            <p className="text-xs text-gray-500">
              Solo visible para ti, no aparece en la propuesta
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-[#004238]">
            {formatCurrency(monthlyCommission)}/mes
          </span>
          {isOpen ? (
            <EyeOff className="h-4 w-4 text-gray-400" />
          ) : (
            <Eye className="h-4 w-4 text-gray-400" />
          )}
        </div>
      </button>

      {isOpen && (
        <div className="px-4 pb-4 space-y-4">
          <div className="p-3 bg-white rounded-lg border text-sm">
            <p className="text-gray-500">
              Volumen mensual:{" "}
              <span className="font-medium text-gray-800">
                {formatCurrency(monthlyVolume)}
              </span>{" "}
              · Tier:{" "}
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#004238] text-[#AEFF99]">
                {tier.tier} ({tier.label})
              </span>
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-white rounded-lg border text-center">
              <p className="text-xs text-gray-500 mb-1">Revenue Bruto</p>
              <p className="text-lg font-bold">{formatCurrency(totalRevenue)}</p>
              <p className="text-xs text-gray-400">sobre piso</p>
            </div>
            <div className="p-3 bg-[#004238]/10 rounded-lg border border-[#004238]/30 text-center">
              <p className="text-xs text-[#004238] mb-1">Tu Comisión</p>
              <p className="text-xl font-bold text-[#004238]">
                {formatCurrency(monthlyCommission)}
              </p>
              <p className="text-xs text-[#004238]/80">mensual</p>
            </div>
            <div className="p-3 bg-white rounded-lg border text-center">
              <p className="text-xs text-gray-500 mb-1">Comisión Anual</p>
              <p className="text-lg font-bold">{formatCurrency(annualCommission)}</p>
              <p className="text-xs text-gray-400">proyectada</p>
            </div>
          </div>

          <div className="p-3 bg-white rounded-lg border text-sm space-y-1">
            <p className="font-medium mb-2">Desglose del cálculo:</p>
            <p className="text-gray-500">
              Débito: {formatCurrency(debitVolume)} × ({data.negotiatedDebitRate}% −{" "}
              {data.sectorDebitFloor}%) ={" "}
              <span className="font-medium text-gray-800">
                {formatCurrency(debitRevenue)}
              </span>
            </p>
            <p className="text-gray-500">
              Crédito: {formatCurrency(creditVolume)} × ({data.negotiatedCreditRate}% −{" "}
              {data.sectorCreditFloor}%) ={" "}
              <span className="font-medium text-gray-800">
                {formatCurrency(creditRevenue)}
              </span>
            </p>
            <p className="text-gray-500 pt-1 border-t">
              Total: {formatCurrency(totalRevenue)} × {tier.label} ={" "}
              <span className="font-medium text-[#004238]">
                {formatCurrency(monthlyCommission)}/mes
              </span>
            </p>
          </div>

          <div className="p-3 bg-gray-50 rounded-lg text-xs text-gray-500">
            <p className="font-medium text-gray-700 mb-1">Tiers de Revenue Share:</p>
            <p>• Estándar (&lt;$500K): 25%</p>
            <p>• Avanzado ($500K – $2.5M): 35%</p>
            <p>• Premium (&gt;$2.5M): 45%</p>
          </div>
        </div>
      )}
    </div>
  )
}
