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

type NumField = {
  key: string
  label: string
  hint?: string
  prefix?: string
  suffix?: string
}

// Cuánto vendes normalmente
const EXPECTED_FIELDS: NumField[] = [
  {
    key: "averageTicket",
    label: "Ticket promedio",
    hint: "Cuánto gasta un cliente en una sola compra. Ej: 1,000",
    prefix: "$",
  },
  {
    key: "monthlyTransactions",
    label: "Transacciones al mes",
    hint: "Cuántos cobros con tarjeta haces en un mes. Es una cantidad, no dinero. Ej: 500",
    suffix: "cobros",
  },
  {
    key: "maxTicket",
    label: "Ticket máximo",
    hint: "El cobro más alto que podrías llegar a procesar en una sola venta. Ej: 20,000",
    prefix: "$",
  },
]

// Lo que realmente pasó el mes pasado
const LAST_MONTH_FIELDS: NumField[] = [
  { key: "lastMonthSalesAmount", label: "Ventas del mes pasado", hint: "Total cobrado con tarjeta.", prefix: "$" },
  { key: "lastMonthSalesOperations", label: "Operaciones del mes pasado", hint: "Cuántos cobros fueron.", suffix: "cobros" },
  { key: "lastMonthChargebacks", label: "Contracargos del mes pasado", hint: "Si no tuviste, escribe 0.", prefix: "$" },
]

export function OperationalInfoForm({ appId, templateCode, initialData }: Props) {
  const router = useRouter()
  const [form, setForm] = useState<Record<string, string>>({
    averageTicket: "",
    monthlyTransactions: "",
    maxTicket: "",
    avgSalesAmount: "",
    lastMonthSalesAmount: "",
    lastMonthSalesOperations: "",
    lastMonthChargebacks: "",
    operativa: "",
    terminalsRequired: "",
    contactEmail: "",
    contactPhone: "",
    ...initialData,
  })
  // Si ya lo contestó antes, el formulario funciona en modo edición
  const yaContestado = Object.keys(initialData).some(
    (k) => !["operativa", "contactEmail"].includes(k) && initialData[k]
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const set = (key: string, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const needsTerminals = form.operativa === "card_present" || form.operativa === "both"

  // La venta mensual sale de ticket promedio x transacciones; el cliente
  // puede sobrescribirla si su realidad no es exactamente esa multiplicación.
  const ticket = parseFloat(form.averageTicket) || 0
  const txs = parseFloat(form.monthlyTransactions) || 0
  const calculado = ticket * txs
  const ventaMensual = form.avgSalesAmount !== "" ? form.avgSalesAmount : (calculado || "")
  const money = (n: number) =>
    new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      const res = await fetch("/api/forms/operational-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // La venta mensual mostrada puede venir del cálculo (ticket × cobros)
        // sin que el cliente la teclee: hay que materializarla en el envío o
        // el servidor la rechaza como faltante aunque se vea en pantalla.
        body: JSON.stringify({
          applicationId: appId,
          templateCode,
          data: { ...form, avgSalesAmount: String(ventaMensual || "") },
        }),
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
        ✓ Datos guardados y archivo actualizado. Volviendo a tu expediente…
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {yaContestado ? (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
          <p className="text-sm text-blue-900 font-medium">
            Ya contestaste estos datos
          </p>
          <p className="text-xs text-blue-800 mt-0.5">
            Ajusta lo que necesites y guarda: el archivo de tu expediente se
            vuelve a generar con la información nueva. Puedes volver aquí las
            veces que quieras.
          </p>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Estos datos son necesarios para dar de alta tu terminal. Con tus
          respuestas se genera un archivo que acompaña tu expediente. Podrás
          volver a editarlos después.
        </p>
      )}

      {/* Cuánto vendes normalmente */}
      <div className="border rounded-lg p-4">
        <p className="text-sm font-medium">Tu operación esperada</p>
        <p className="text-xs text-muted-foreground mb-3">
          Aproximados está bien. Puedes volver a entrar y ajustarlos cuando quieras.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {EXPECTED_FIELDS.map((f) => (
          <div key={f.key} className="space-y-1.5">
            <Label htmlFor={f.key}>{f.label}</Label>
            <div className="relative">
              {f.prefix && (
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
                  {f.prefix}
                </span>
              )}
              <Input
                id={f.key}
                type="number"
                min={0}
                step="any"
                value={form[f.key]}
                onChange={(e) => set(f.key, e.target.value)}
                required
                disabled={saving}
                className={f.prefix ? "pl-7" : f.suffix ? "pr-16" : ""}
              />
              {f.suffix && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                  {f.suffix}
                </span>
              )}
            </div>
            {f.hint && <p className="text-xs text-muted-foreground">{f.hint}</p>}
          </div>
        ))}

          <div className="space-y-1.5">
            <Label htmlFor="avgSalesAmount">Venta mensual estimada</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
                $
              </span>
              <Input
                id="avgSalesAmount"
                type="number"
                min={0}
                step="any"
                value={ventaMensual}
                onChange={(e) => set("avgSalesAmount", e.target.value)}
                required
                disabled={saving}
                className="pl-7"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {ticket > 0 && txs > 0
                ? `Se calcula solo: ${money(ticket)} × ${txs} cobros = ${money(calculado)}. Puedes ajustarlo.`
                : "Se calcula solo con el ticket promedio y las transacciones al mes."}
            </p>
          </div>
        </div>
      </div>

      {/* Historial real */}
      <div className="border rounded-lg p-4">
        <p className="text-sm font-medium">Tu mes pasado</p>
        <p className="text-xs text-muted-foreground mb-3">
          Lo que sí ocurrió el mes anterior. Si aún no operas, escribe 0.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {LAST_MONTH_FIELDS.map((f) => (
          <div key={f.key} className="space-y-1.5">
            <Label htmlFor={f.key}>{f.label}</Label>
            <div className="relative">
              {f.prefix && (
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
                  {f.prefix}
                </span>
              )}
              <Input
                id={f.key}
                type="number"
                min={0}
                step="any"
                value={form[f.key]}
                onChange={(e) => set(f.key, e.target.value)}
                required
                disabled={saving}
                className={f.prefix ? "pl-7" : f.suffix ? "pr-16" : ""}
              />
              {f.suffix && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                  {f.suffix}
                </span>
              )}
            </div>
            {f.hint && <p className="text-xs text-muted-foreground">{f.hint}</p>}
          </div>
        ))}
        </div>
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
        disabled={saving}
        className="flex items-center gap-1.5"
        style={{ background: "#004238", color: "#AEFF99" }}
      >
        {saving && <Spinner size={14} />}
        {saving
          ? "Generando archivo…"
          : yaContestado
            ? "Guardar cambios"
            : "Guardar y generar archivo"}
      </Button>
    </form>
  )
}
