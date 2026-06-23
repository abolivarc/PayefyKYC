"use client"

import { useState, useTransition } from "react"
import { adminSetDocumentChecked } from "@/app/(admin)/applications/actions"

interface Props {
  documentId: string
  applicationId: string
  templateName: string
  initialIsChecked: boolean
  isRequired: boolean
  storageDocId?: string
}

export function AdminCheckRow({
  documentId,
  applicationId,
  templateName,
  initialIsChecked,
  isRequired,
  storageDocId,
}: Props) {
  const [isChecked, setIsChecked] = useState(initialIsChecked)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleToggle(checked: boolean) {
    setError(null)
    setIsChecked(checked)
    startTransition(async () => {
      const result = await adminSetDocumentChecked(documentId, checked, applicationId)
      if (result?.error) {
        setError(result.error)
        setIsChecked(!checked)
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
        checked={isChecked}
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
      {storageDocId && (
        <a
          href={`/api/documents/${storageDocId}/view`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontSize: 11, color: "var(--admin-brand-strong, #0B7A44)", textDecoration: "none", whiteSpace: "nowrap" }}
        >
          ver
        </a>
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
