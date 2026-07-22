"use client"

import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { CreditCard, Zap, Clock, Wallet } from "lucide-react"
import { ProposalData, IVA_RATE, formatCurrency } from "@/lib/proposals/types"

interface DispersionSectionProps {
  data: Partial<ProposalData>
  updateData: (data: Partial<ProposalData>) => void
}

export function DispersionSection({ data, updateData }: DispersionSectionProps) {
  const isActive = data.hasDispersionCards ?? false

  const monthlyVolume = data.monthlyVolume || 0
  const debitDist = (data.debitDistribution ?? 50) / 100
  const creditDist = (data.creditDistribution ?? 50) / 100

  const debitVolume = monthlyVolume * debitDist
  const creditVolume = monthlyVolume * creditDist

  const tpvCost =
    debitVolume * ((data.negotiatedDebitRate || 0) / 100) +
    creditVolume * ((data.negotiatedCreditRate || 0) / 100)
  const netConciliated = monthlyVolume - tpvCost

  const feeBase = data.dispersionFeeBase || 0
  const dispersionFee = netConciliated * (feeBase / 100)
  const dispersionFeeWithIVA = dispersionFee * IVA_RATE
  const dispersionIVA = dispersionFeeWithIVA - dispersionFee
  const availableAmount = netConciliated - dispersionFeeWithIVA

  return (
    <div className="border-2 border-dashed border-amber-500/30 rounded-lg overflow-hidden bg-amber-50/50">
      {/* Header con toggle */}
      <div className="p-4 border-b border-amber-200/60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-amber-500/20 flex items-center justify-center">
              <Wallet className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <h3 className="font-semibold text-amber-700">
                Servicio de Dispersión con Tarjetas
              </h3>
              <p className="text-xs text-gray-500">
                Tus fondos disponibles en App y Tarjetas Payefy
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="dispersion-toggle" className="text-sm">
              {isActive ? "Incluido" : "No incluido"}
            </Label>
            <button
              id="dispersion-toggle"
              type="button"
              role="switch"
              aria-checked={isActive}
              onClick={() =>
                updateData({
                  hasDispersionCards: !isActive,
                  dispersionFeeBase: !isActive ? 0.5 : undefined,
                  instantFeeRate: !isActive ? 1.0 : undefined,
                })
              }
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                isActive ? "bg-[#0B7A44]" : "bg-gray-300"
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                  isActive ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {isActive && (
        <div className="p-4 space-y-5">
          {/* Fees */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-500" />
                Depósito Estándar
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={data.dispersionFeeBase ?? 0.5}
                  onChange={(e) =>
                    updateData({ dispersionFeeBase: parseFloat(e.target.value) || 0 })
                  }
                  className="w-24"
                />
                <span className="text-sm text-gray-500">% + IVA</span>
              </div>
              <p className="text-xs text-gray-500">
                Fondos disponibles al día siguiente hábil
              </p>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-500" />
                Disponibilidad Inmediata
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={data.instantFeeRate ?? 1.0}
                  onChange={(e) =>
                    updateData({ instantFeeRate: parseFloat(e.target.value) || 0 })
                  }
                  className="w-24"
                />
                <span className="text-sm text-gray-500">% + IVA</span>
              </div>
              <p className="text-xs text-gray-500">
                Fondos disponibles el mismo día (bajo demanda)
              </p>
            </div>
          </div>

          {/* Cálculo estimado */}
          {monthlyVolume > 0 && data.negotiatedDebitRate !== undefined && (
            <div className="p-4 bg-white rounded-lg border">
              <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-amber-600" />
                Cálculo Estimado (Depósito Estándar)
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Volumen mensual:</span>
                  <span>{formatCurrency(monthlyVolume)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Comisiones TPV:</span>
                  <span className="text-red-600">-{formatCurrency(tpvCost)}</span>
                </div>
                <div className="flex justify-between font-medium border-t pt-2">
                  <span>Neto conciliado:</span>
                  <span>{formatCurrency(netConciliated)}</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>Fee dispersión ({feeBase}%):</span>
                  <span>-{formatCurrency(dispersionFee)}</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>IVA (16%):</span>
                  <span>-{formatCurrency(dispersionIVA)}</span>
                </div>
                <div className="flex justify-between font-bold text-amber-600 border-t pt-2 text-base">
                  <span>Disponible en tarjetas:</span>
                  <span>{formatCurrency(availableAmount)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
