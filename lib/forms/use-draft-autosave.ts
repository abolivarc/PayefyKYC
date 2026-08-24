"use client"

import { useEffect, useRef, useState } from "react"

/**
 * Memoria del formulario: guarda el borrador en el servidor ~1.5 s después
 * del último cambio. Si el cliente cierra el navegador (o se va a una junta),
 * al volver el loader de la página rehidrata sus respuestas.
 */
export function useDraftAutosave(
  applicationId: string,
  templateCode: string,
  form: Record<string, string>
) {
  const [estado, setEstado] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const primeraCarga = useRef(true)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const ultimo = useRef("")

  useEffect(() => {
    // No guardar el estado inicial recién hidratado — solo cambios reales
    if (primeraCarga.current) {
      primeraCarga.current = false
      ultimo.current = JSON.stringify(form)
      return
    }
    const snapshot = JSON.stringify(form)
    if (snapshot === ultimo.current) return

    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(async () => {
      setEstado("saving")
      try {
        const res = await fetch("/api/forms/draft", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ applicationId, templateCode, data: form }),
        })
        if (res.ok) {
          ultimo.current = snapshot
          setEstado("saved")
        } else {
          setEstado("error")
        }
      } catch {
        setEstado("error")
      }
    }, 1500)

    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [form, applicationId, templateCode])

  return estado
}

/** Texto chico para mostrar junto al formulario. */
export function draftLabel(estado: ReturnType<typeof useDraftAutosave>): string {
  switch (estado) {
    case "saving":
      return "Guardando borrador…"
    case "saved":
      return "Borrador guardado ✓ — puedes salir y continuar después"
    case "error":
      return "No se pudo guardar el borrador (revisa tu conexión)"
    default:
      return ""
  }
}
