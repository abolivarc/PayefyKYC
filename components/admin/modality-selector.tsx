"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Spinner } from "@/components/ui/spinner"
import { changeTerminalModality } from "@/app/(admin)/applications/actions"

const OPCIONES = [
  { value: "card_present", label: "Tarjeta presente (POS)" },
  { value: "ecommerce", label: "E-commerce" },
  { value: "link_de_pago", label: "Link de pago" },
  { value: "both", label: "Ambas (POS + en línea)" },
] as const

type Modalidad = (typeof OPCIONES)[number]["value"]

/**
 * Cambiar la modalidad de una solicitud de terminales sin tocar la BDD a
 * mano. Ajusta los casilleros: quita los que ya no aplican (solo si están
 * vacíos) y crea los que falten. Caso típico: el cliente eligió "ambas" por
 * error y el expediente exige una URL que no existe.
 */
export function ModalitySelector({
  applicationId,
  current,
}: {
  applicationId: string
  current: string | null
}) {
  const router = useRouter()
  const [value, setValue] = useState<string>(current ?? "")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleChange(next: string) {
    if (next === value || !next) return
    const etiqueta = OPCIONES.find((o) => o.value === next)?.label ?? next
    if (
      !confirm(
        `¿Cambiar la modalidad a "${etiqueta}"?\n\nSe ajustarán los documentos requeridos: los casilleros que ya no apliquen se quitan (solo si están vacíos) y se crean los que falten. Los archivos ya subidos no se tocan.`
      )
    )
      return
    setError(null)
    const previo = value
    setValue(next)
    startTransition(async () => {
      const res = await changeTerminalModality(applicationId, next as Modalidad)
      if (res.error) {
        setError(res.error)
        setValue(previo)
      } else {
        router.refresh()
      }
    })
  }

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
      <label style={{ fontSize: 12.5, color: "var(--admin-text-muted, #5A6B7B)", fontWeight: 600 }}>
        Modalidad:
      </label>
      <select
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        disabled={isPending}
        style={{
          fontSize: 12.5, padding: "3px 8px", borderRadius: 7,
          border: "1px solid var(--admin-border, #E4ECE7)",
          background: "var(--admin-surface, #fff)",
          color: "var(--admin-text, #0F2A22)", cursor: "pointer",
        }}
      >
        {!current && <option value="">Sin definir</option>}
        {OPCIONES.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {isPending && <Spinner size={12} />}
      {error && (
        <span style={{ fontSize: 11.5, color: "#B91C1C" }} role="alert">
          {error}
        </span>
      )}
    </span>
  )
}
