"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { AlertTriangle } from "lucide-react"

interface Props {
  appId: string
  templateCode: string
  initialData: Record<string, string>
}

const NUM_FIELDS: { key: string; label: string; hint?: string }[] = [
  { key: "averageTicket", label: "Ticket promedio (MXN)" },
  { key: "avgTransactionsAmount", label: "Monto promedio de transacciones — mensual (MXN)" },
  { key: "avgSalesAmount", label: "Monto promedio de venta — mensual (MXN)" },
  { key: "lastMonthSalesAmount", label: "Registro de ventas último mes — monto (MXN)" },
  { key: "lastMonthSalesOperations", label: "Registro de ventas último mes — número de operaciones" },
  { key: "lastMonthChargebacks", label: "Monto de contracargos último mes (MXN)", hint: "Si no tuviste contracargos, escribe 0." },
]

export function OperationalInfoForm({ appId, templateCode, initialData }: Props) {
  const router = useRouter()
  const [form, setForm] = useState<Record<string, string>>({
    averageTicket: "",
    avgTransactionsAmount: "",
    avgSalesAmount: "",
    lastMonthSalesAmount: "",
    lastMonthSalesOperations: "",
    lastMonthChargebacks: "",
    pctNational: "",
    pctInternational: "",
    operativa: "",
    terminalsRequired: "",
    contactEmail: "",
    contactPhone: "",
    ...initialData,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const set = (key: string, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const needsTerminals = form.operativa === "card_present" || form.operativa === "both"
  const pctSum =
    (parseFloat(form.pctNational) || 0) + (parseFloat(form.pctInternational) || 0)
  const pctInvalid =
    form.pctNational !== "" && form.pctInternational !== "" && Math.round(pctSum) !== 100

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      const res = await fetch("/api/forms/operational-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId: appId, templateCode, data: form }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? "Error al guardar")
      } else {
        setDone(true)
        setTimeout(() => router.push(`/applications/${appId}/documents`), 1200)
      }
    } catch {
      setError("Error de conexión, intenta de nuevo")
    } finally {
      setSaving(false)
    }
  }

  if (done) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-4 text-sm text-green-800">
        ✓ Datos guardados y archivo generado. Volviendo a tu expediente…
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Estos datos son necesarios para dar de alta tu terminal. Con tus
        respuestas se genera un archivo que acompaña tu expediente.
      </p>

      {/* Montos y operaciones */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {NUM_FIELDS.map((f) => (
          <div key={f.key} className="space-y-1.5">
            <Label htmlFor={f.key}>{f.label}</Label>
            <Input
              id={f.key}
              type="number"
              min={0}
              step="any"
              value={form[f.key]}
              onChange={(e) => set(f.key, e.target.value)}
              required
              disabled={saving}
            />
            {f.hint && <p className="text-xs text-muted-foreground">{f.hint}</p>}
          </div>
        ))}
      </div>

      {/* Distribución nacional / internacional */}
      <div className="border rounded-lg p-4">
        <p className="text-sm font-medium mb-3">
          Distribución de tus ventas (deben sumar 100%)
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="pctNational">% Nacional</Label>
            <Input
              id="pctNational"
              type="number"
              min={0}
              max={100}
              step="any"
              value={form.pctNational}
              onChange={(e) => set("pctNational", e.target.value)}
              required
              disabled={saving}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pctInternational">% Internacional</Label>
            <Input
              id="pctInternational"
              type="number"
              min={0}
              max={100}
              step="any"
              value={form.pctInternational}
              onChange={(e) => set("pctInternational", e.target.value)}
              required
              disabled={saving}
            />
          </div>
        </div>
        {pctInvalid && (
          <p className="text-xs text-destructive flex items-center gap-1 mt-2">
            <AlertTriangle className="h-3 w-3" />
            Suman {pctSum}% — deben sumar 100%
          </p>
        )}
      </div>

      {/* Operativa */}
      <div className="space-y-1.5">
        <Label>Operativa</Label>
        <Select
          value={form.operativa}
          onChange={(e) => set("operativa", e.target.value)}
          required
          disabled={saving}
        >
          <option value="" disabled>
            Selecciona tu operativa…
          </option>
          <option value="card_present">Tarjeta Presente (punto de venta)</option>
          <option value="ecommerce">E-commerce (en línea)</option>
          <option value="both">Ambas</option>
        </Select>
      </div>

      {needsTerminals && (
        <div className="space-y-1.5">
          <Label htmlFor="terminalsRequired">
            ¿Cuántas terminales van a requerir?
          </Label>
          <Input
            id="terminalsRequired"
            type="number"
            min={1}
            max={500}
            value={form.terminalsRequired}
            onChange={(e) => set("terminalsRequired", e.target.value)}
            required
            disabled={saving}
          />
        </div>
      )}

      {/* Contacto */}
      <div className="border rounded-lg p-4">
        <p className="text-sm font-medium mb-3">Contacto para el alta</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="contactEmail">Correo de contacto</Label>
            <Input
              id="contactEmail"
              type="email"
              value={form.contactEmail}
              onChange={(e) => set("contactEmail", e.target.value)}
              required
              disabled={saving}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="contactPhone">Teléfono de contacto</Label>
            <Input
              id="contactPhone"
              type="tel"
              value={form.contactPhone}
              onChange={(e) => set("contactPhone", e.target.value)}
              required
              disabled={saving}
            />
          </div>
        </div>
      </div>

      {error && (
        <p className="text-sm text-destructive flex items-center gap-1" role="alert">
          <AlertTriangle className="h-4 w-4" />
          {error}
        </p>
      )}

      <Button
        type="submit"
        disabled={saving || pctInvalid}
        className="flex items-center gap-1.5"
        style={{ background: "#004238", color: "#AEFF99" }}
      >
        {saving && <Spinner size={14} />}
        {saving ? "Generando archivo…" : "Guardar y generar archivo"}
      </Button>
    </form>
  )
}
