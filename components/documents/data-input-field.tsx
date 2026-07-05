"use client"

import { useState, useTransition } from "react"
import { saveDataCheckValue } from "@/app/(client)/applications/actions"

interface Props {
  documentId: string
  applicationId: string
  templateName: string
  templateInstructions: string | null
  currentValue: string | null
  currentStatus: string
  isRequired?: boolean
}

export function DataInputField({
  documentId,
  applicationId,
  templateName,
  templateInstructions,
  currentValue,
  currentStatus,
  isRequired = true,
}: Props) {
  const [value, setValue] = useState(currentValue ?? "")
  const [dirty, setDirty] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [savedStatus, setSavedStatus] = useState(currentStatus)

  const isApproved = savedStatus === "approved"
  const hasValue = value.trim().length > 0

  function handleSave() {
    if (!hasValue || isPending) return
    setError(null)
    startTransition(async () => {
      const result = await saveDataCheckValue(documentId, applicationId, value.trim())
      if (result?.error) {
        setError(result.error)
      } else {
        setDirty(false)
        setSavedStatus("pending_review")
      }
    })
  }

  const statusCfg =
    isApproved
      ? { label: "Validado", color: "#1f7a4d", bg: "#e7f6ec" }
      : savedStatus === "pending_review" && !dirty
      ? { label: "En revisión", color: "#1D4ED8", bg: "#EFF4FF" }
      : null

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #E4ECE7",
        borderRadius: 10,
        padding: "12px 14px",
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <label
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: "#0F2A22",
            lineHeight: 1.2,
          }}
        >
          {templateName}
          {!isRequired && (
            <span style={{ fontSize: 10, fontWeight: 500, color: "#8A9E94", marginLeft: 4 }}>
              · opcional
            </span>
          )}
        </label>
        {statusCfg && (
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              background: statusCfg.bg,
              color: statusCfg.color,
              borderRadius: 99,
              padding: "2px 8px",
              flexShrink: 0,
            }}
          >
            {statusCfg.label}
          </span>
        )}
      </div>

      {templateInstructions && (
        <p style={{ margin: 0, fontSize: 11, color: "#8A9E94", lineHeight: 1.4 }}>
          {templateInstructions}
        </p>
      )}

      <div style={{ display: "flex", gap: 6, alignItems: "stretch" }}>
        <input
          type="text"
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            setDirty(true)
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave()
          }}
          placeholder={isApproved ? "—" : "Escribe aquí…"}
          disabled={isApproved || isPending}
          style={{
            flex: 1,
            fontSize: 13,
            padding: "6px 10px",
            border: "1px solid #E4ECE7",
            borderRadius: 7,
            outline: "none",
            background: isApproved ? "#F3F7F4" : "#fff",
            color: "#0F2A22",
            fontFamily: "inherit",
          }}
        />
        {!isApproved && (
          <button
            onClick={handleSave}
            disabled={!hasValue || !dirty || isPending}
            style={{
              fontSize: 11,
              fontWeight: 700,
              padding: "6px 12px",
              borderRadius: 7,
              border: "none",
              background:
                hasValue && dirty && !isPending ? "#004238" : "#E4ECE7",
              color:
                hasValue && dirty && !isPending ? "#A8F898" : "#8A9E94",
              cursor: hasValue && dirty && !isPending ? "pointer" : "default",
              flexShrink: 0,
              transition: "background .15s, color .15s",
            }}
          >
            {isPending ? "…" : "Guardar"}
          </button>
        )}
      </div>

      {error && (
        <p style={{ margin: 0, fontSize: 10, color: "#d1622f" }}>{error}</p>
      )}
    </div>
  )
}
