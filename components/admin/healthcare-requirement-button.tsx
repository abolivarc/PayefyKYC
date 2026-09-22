"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Spinner } from "@/components/ui/spinner"
import { setHealthcareRequirement } from "@/app/(admin)/applications/actions"

/**
 * Giro médico: agrega o quita el casillero de la cédula profesional, que es
 * lo que sostiene la tasa preferencial. Por si el comercio contestó mal en el
 * alta o el revisor detecta que la actividad sí es médica.
 */
export function HealthcareRequirementButton({
  applicationId,
  isHealthcare,
}: {
  applicationId: string
  isHealthcare: boolean
}) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function toggle() {
    const next = !isHealthcare
    if (
      next &&
      !confirm(
        "Se agregará la cédula profesional al expediente del comercio: es el documento que acredita la actividad médica para darle la tasa preferencial. ¿Continuar?"
      )
    )
      return
    if (
      !next &&
      !confirm("Se quitará la cédula profesional del expediente. ¿Continuar?")
    )
      return

    setError(null)
    startTransition(async () => {
      const res = await setHealthcareRequirement(applicationId, next)
      if (res.error) setError(res.error)
      else router.refresh()
    })
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
      {error && (
        <span style={{ fontSize: 12, color: "#B91C1C" }} role="alert">
          {error}
        </span>
      )}
      <button
        type="button"
        onClick={toggle}
        disabled={isPending}
        className="transition-all"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "8px 14px",
          fontSize: 13,
          fontWeight: 600,
          borderRadius: 9,
          cursor: "pointer",
          background: isHealthcare ? "#E7F6EC" : "transparent",
          border: `1px solid ${isHealthcare ? "#B8E8CA" : "var(--admin-border, #E7ECF1)"}`,
          color: isHealthcare ? "#1f7a4d" : "var(--admin-text-muted, #5A6B7B)",
        }}
      >
        {isPending && <Spinner size={12} />}
        {isHealthcare ? "Giro médico · quitar cédula" : "Solicitar cédula profesional"}
      </button>
    </div>
  )
}
