"use client"

import { useState, useTransition } from "react"
import { validateDataCheck } from "@/app/(admin)/applications/actions"

interface Props {
  documentId: string
  applicationId: string
  templateName: string
  initialIsValidated: boolean
  isRequired: boolean
}

export function AdminValidationRow({
  documentId,
  applicationId,
  templateName,
  initialIsValidated,
  isRequired,
}: Props) {
  const [isValidated, setIsValidated] = useState(initialIsValidated)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleToggle(checked: boolean) {
    setError(null)
    setIsValidated(checked)
    startTransition(async () => {
      const result = await validateDataCheck(documentId, checked, applicationId)
      if (result?.error) {
        setError(result.error)
        setIsValidated(!checked)
      }
    })
  }

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "8px 0",
      borderBottom: "1px solid var(--admin-border, #E7ECF1)",
    }}>
      <input
        type="checkbox"
        checked={isValidated}
        disabled={isPending}
        onChange={(e) => handleToggle(e.target.checked)}
        style={{
          width: 15,
          height: 15,
          accentColor: "#0B7A44",
          cursor: isPending ? "wait" : "pointer",
          flexShrink: 0,
        }}
      />
      <span style={{ fontSize: 13, color: "var(--admin-text, #0F1B2A)", flex: 1, lineHeight: 1.3 }}>
        {templateName}
        {!isRequired && (
          <span style={{ fontSize: 11, marginLeft: 6, color: "var(--admin-text-subtle, #8A99A8)" }}>
            opcional
          </span>
        )}
      </span>
      {isValidated && (
        <span style={{ fontSize: 11, color: "#047857", background: "#E7F8EF", border: "1px solid #CBEFDB", borderRadius: 4, padding: "1px 6px" }}>
          validado
        </span>
      )}
      {!isValidated && (
        <span style={{ fontSize: 11, color: "#92400E", background: "#FFF7ED", border: "1px solid #FCEBD2", borderRadius: 4, padding: "1px 6px" }}>
          pendiente
        </span>
      )}
      {isPending && (
        <span style={{ fontSize: 11, color: "var(--admin-text-muted, #5A6B7B)" }}>…</span>
      )}
      {error && (
        <span style={{ fontSize: 11, color: "#B91C1C" }}>{error}</span>
      )}
    </div>
  )
}
