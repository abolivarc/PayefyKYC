"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Spinner } from "@/components/ui/spinner"
import { setAmexRequirement } from "@/app/(admin)/applications/actions"

export function AmexRequirementButton({
  applicationId,
  wantsAmex,
}: {
  applicationId: string
  wantsAmex: boolean
}) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function toggle() {
    const next = !wantsAmex
    if (
      next &&
      !confirm(
        "Se agregará la carátula de afiliación AMEX al expediente del comercio. Tendrá que llenarla, firmarla y subirla. ¿Continuar?"
      )
    )
      return
    if (
      !next &&
      !confirm("Se quitará la carátula AMEX del expediente. ¿Continuar?")
    )
      return

    setError(null)
    startTransition(async () => {
      const res = await setAmexRequirement(applicationId, next)
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
          background: wantsAmex ? "#EFF4FF" : "transparent",
          border: `1px solid ${wantsAmex ? "#DBE5FF" : "var(--admin-border, #E7ECF1)"}`,
          color: wantsAmex ? "#1D4ED8" : "var(--admin-text-muted, #5A6B7B)",
        }}
      >
        {isPending && <Spinner size={12} />}
        {wantsAmex ? "AMEX solicitado · quitar" : "Solicitar carátula AMEX"}
      </button>
    </div>
  )
}
