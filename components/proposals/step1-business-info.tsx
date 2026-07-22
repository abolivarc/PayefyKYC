"use client"

import { useMemo, useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import {
  StepProps,
  EntityType,
  ENTITY_TYPE_LABELS,
  ProductType,
} from "@/lib/proposals/types"
import { MCC_CATALOG, GiroMcc } from "@/lib/proposals/mcc-catalog"
import {
  Search,
  Building2,
  User,
  Phone,
  Mail,
  Monitor,
  Link2,
  CreditCard,
} from "lucide-react"

export function Step1BusinessInfo({ data, updateData }: StepProps) {
  const [searchTerm, setSearchTerm] = useState(
    data.sectorName ? `${data.sectorName}` : ""
  )
  const [showDropdown, setShowDropdown] = useState(false)

  const filteredSectors = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    if (q.length < 2) return []
    return MCC_CATALOG.filter(
      (s) =>
        s.descripcion.toLowerCase().includes(q) ||
        s.familia.toLowerCase().includes(q) ||
        s.mcc.includes(q)
    ).slice(0, 30)
  }, [searchTerm])

  const handleSelectSector = (sector: GiroMcc) => {
    updateData({
      mccCode: sector.mcc,
      sectorName: sector.descripcion,
      sectorFamilia: sector.familia,
      sectorDebitFloor: sector.pisoDebito,
      sectorCreditFloor: sector.pisoCredito,
      // Prellenar las tasas negociadas con el piso
      negotiatedDebitRate: sector.pisoDebito,
      negotiatedCreditRate: sector.pisoCredito,
    })
    setSearchTerm(`${sector.familia} — ${sector.descripcion}`)
    setShowDropdown(false)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-1">Información del Negocio</h2>
        <p className="text-muted-foreground text-sm">
          Ingresa los datos básicos del prospecto
        </p>
      </div>

      {/* Producto */}
      <div className="space-y-2">
        <Label>Producto</Label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {(
            [
              { id: "terminales" as ProductType, icon: CreditCard, label: "Terminales", desc: "Terminal punto de venta" },
              { id: "venta_en_linea" as ProductType, icon: Monitor, label: "Venta en Línea", desc: "Cobros por e-commerce" },
              { id: "link_de_pago" as ProductType, icon: Link2, label: "Link de Pago", desc: "Cobros con link compartido" },
            ]
          ).map((product) => {
            const Icon = product.icon
            const isSelected = data.productType === product.id
            return (
              <button
                key={product.id}
                type="button"
                onClick={() => updateData({ productType: product.id })}
                className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all text-center ${
                  isSelected
                    ? "border-[#004238] bg-[#F0FAF3] shadow-sm"
                    : "border-gray-200 hover:border-[#004238]/40 hover:bg-gray-50"
                }`}
              >
                <div
                  className={`h-10 w-10 rounded-full flex items-center justify-center ${
                    isSelected ? "bg-[#004238]/10" : "bg-gray-100"
                  }`}
                >
                  <Icon
                    className={`h-5 w-5 ${isSelected ? "text-[#004238]" : "text-gray-400"}`}
                  />
                </div>
                <span
                  className={`text-sm font-medium ${isSelected ? "text-[#004238]" : "text-gray-700"}`}
                >
                  {product.label}
                </span>
                <span className="text-xs text-gray-400">{product.desc}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="grid gap-5">
        {/* Nombre del negocio */}
        <div className="space-y-2">
          <Label htmlFor="businessName">Nombre del Negocio</Label>
          <div className="relative">
            <Building2 className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              id="businessName"
              value={data.businessName || ""}
              onChange={(e) => updateData({ businessName: e.target.value })}
              placeholder="Ej: Restaurante El Buen Sabor"
              className="pl-10"
            />
          </div>
        </div>

        {/* Tipo de persona */}
        <div className="space-y-2">
          <Label>Tipo de Persona</Label>
          <Select
            value={data.entityType ?? ""}
            onChange={(e) =>
              updateData({ entityType: e.target.value as EntityType })
            }
          >
            <option value="" disabled>
              Seleccionar tipo...
            </option>
            {Object.entries(ENTITY_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>

        {/* Giro (buscador MCC) */}
        <div className="space-y-2 relative">
          <Label>Giro del Negocio</Label>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setShowDropdown(true)
              }}
              placeholder="Buscar giro... (ej: restaurante, farmacia, 5812)"
              className="pl-10"
              onFocus={() => searchTerm.length >= 2 && setShowDropdown(true)}
            />
          </div>

          {showDropdown && filteredSectors.length > 0 && (
            <div className="absolute z-50 w-full bg-white border rounded-md shadow-lg mt-1 max-h-64 overflow-auto">
              {filteredSectors.map((sector) => (
                <button
                  key={`${sector.mcc}-${sector.descripcion}`}
                  type="button"
                  onClick={() => handleSelectSector(sector)}
                  className="w-full px-4 py-2.5 text-left hover:bg-[#F0FAF3] transition-colors border-b last:border-b-0"
                >
                  <div className="font-medium text-sm">
                    {sector.familia}{" "}
                    <span className="font-normal text-gray-500">
                      · {sector.descripcion}
                    </span>
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    MCC {sector.mcc} | Piso Débito: {sector.pisoDebito}% | Piso
                    Crédito: {sector.pisoCredito}%
                  </div>
                </button>
              ))}
            </div>
          )}

          {data.sectorName && (
            <div className="p-3 bg-[#F0FAF3] border border-[#004238]/20 rounded-lg mt-2">
              <div className="text-sm font-medium text-[#004238]">
                {data.sectorFamilia} — {data.sectorName}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                MCC {data.mccCode} | Pisos mínimos: Débito {data.sectorDebitFloor}% |
                Crédito {data.sectorCreditFloor}%
              </div>
            </div>
          )}
        </div>

        {/* Volumen y ticket */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="monthlyVolume">Volumen Mensual Estimado (MXN)</Label>
            <Input
              id="monthlyVolume"
              type="number"
              value={data.monthlyVolume || ""}
              onChange={(e) =>
                updateData({ monthlyVolume: parseFloat(e.target.value) || 0 })
              }
              placeholder="Ej: 500000"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="averageTicket">Ticket Promedio (opcional)</Label>
            <Input
              id="averageTicket"
              type="number"
              value={data.averageTicket || ""}
              onChange={(e) =>
                updateData({ averageTicket: parseFloat(e.target.value) || undefined })
              }
              placeholder="Ej: 350"
            />
          </div>
        </div>
      </div>

      {/* Contacto */}
      <div className="border-t pt-6">
        <h3 className="text-lg font-medium mb-4">Datos de Contacto</h3>
        <div className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="contactName">Nombre del Contacto</Label>
            <div className="relative">
              <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="contactName"
                value={data.contactName || ""}
                onChange={(e) => updateData({ contactName: e.target.value })}
                placeholder="Nombre completo"
                className="pl-10"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contactEmail">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="contactEmail"
                  type="email"
                  value={data.contactEmail || ""}
                  onChange={(e) => updateData({ contactEmail: e.target.value })}
                  placeholder="correo@ejemplo.com"
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactPhone">Teléfono</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="contactPhone"
                  type="tel"
                  value={data.contactPhone || ""}
                  onChange={(e) => updateData({ contactPhone: e.target.value })}
                  placeholder="55 1234 5678"
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
