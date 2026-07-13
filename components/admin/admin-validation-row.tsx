"use client"

import { useRef, useState, useTransition } from "react"
import { validateDataCheck, updateDataCheckValue } from "@/app/(admin)/applications/actions"

interface Props {
  documentId: string
  applicationId: string
  templateName: string
  initialIsValidated: boolean
  isRequired: boolean
  value?: string | null
}

export function AdminValidationRow({
  documentId,
  applicationId,
  templateName,
  initialIsValidated,
  isRequired,
  value: initialValue,
}: Props) {
  const [isValidated, setIsValidated] = useState(initialIsValidated)
  const [currentValue, setCurrentValue] = useState(initialValue ?? "")
  const [editing, setEditing] = useState(false)
  const [editDraft, setEditDraft] = useState(initialValue ?? "")
  const [isPending, startTransition] = useTransition()
  const [isSaving, startSaving] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

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

  function startEdit() {
    setEditDraft(currentValue)
    setEditing(true)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  function cancelEdit() {
    setEditing(false)
    setError(null)
  }

  function handleSave() {
    setError(null)
    startSaving(async () => {
      const result = await updateDataCheckValue(documentId, editDraft, applicationId)
      if (result?.error) {
        setError(result.error)
      } else {
        setCurrentValue(editDraft)
        setEditing(false)
      }
    })
  }

  const hasValue = !!currentValue && currentValue !== "—"

  return (
    <div style={{
      display: "flex",
      alignItems: "flex-start",
      gap: 10,
      padding: "10px 0",
      borderBottom: "1px solid var(--admin-border, #E7ECF1)",
    }}>
      {/* Checkbox */}
      <div style={{ paddingTop: 2, flexShrink: 0 }}>
        <input
          type="checkbox"
          checked={isValidated}
          disabled={isPending || !hasValue}
          onChange={(e) => handleToggle(e.target.checked)}
          style={{
            width: 15,
            height: 15,
            accentColor: "#0B7A44",
            cursor: (isPending || !hasValue) ? "not-allowed" : "pointer",
          }}
        />
      </div>

      {/* Label + value */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: "var(--admin-text, #0F1B2A)", lineHeight: 1.3 }}>
            {templateName}
          </span>
          {!isRequired && (
            <span style={{ fontSize: 11, color: "var(--admin-text-subtle, #8A99A8)" }}>opcional</span>
          )}
          {isValidated && (
            <span style={{ fontSize: 11, color: "#047857", background: "#E7F8EF", border: "1px solid #CBEFDB", borderRadius: 4, padding: "1px 6px" }}>
              validado
            </span>
          )}
          {!isValidated && hasValue && (
            <span style={{ fontSize: 11, color: "#92400E", background: "#FFF7ED", border: "1px solid #FCEBD2", borderRadius: 4, padding: "1px 6px" }}>
              por validar
            </span>
          )}
          {!hasValue && (
            <span style={{ fontSize: 11, color: "#8A99A8", background: "#F3F7F4", border: "1px solid #E4ECE7", borderRadius: 4, padding: "1px 6px" }}>
              sin dato
            </span>
          )}
          {(isPending || isSaving) && <span style={{ fontSize: 11, color: "var(--admin-text-muted, #5A6B7B)" }}>…</span>}
        </div>

        {/* Value: edit mode or display */}
        {editing ? (
          <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 6 }}>
            <input
              ref={inputRef}
              value={editDraft}
              onChange={(e) => setEditDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") cancelEdit() }}
              disabled={isSaving}
              style={{
                fontSize: 13,
                fontFamily: "var(--font-mono, monospace)",
                fontWeight: 600,
                padding: "3px 10px",
                borderRadius: 6,
                border: "1px solid #93C5FD",
                outline: "none",
                color: "#0F1B2A",
                minWidth: 180,
                background: "#fff",
              }}
            />
            <button
              onClick={handleSave}
              disabled={isSaving}
              style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 5, border: "none", background: "#0B7A44", color: "#fff", cursor: "pointer", opacity: isSaving ? 0.6 : 1 }}
            >
              {isSaving ? "…" : "Guardar"}
            </button>
            <button
              onClick={cancelEdit}
              disabled={isSaving}
              style={{ fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 5, border: "1px solid #E2E8F0", background: "#F8FAFC", color: "#5A6B7B", cursor: "pointer" }}
            >
              Cancelar
            </button>
          </div>
        ) : hasValue ? (
          <div style={{ marginTop: 4, display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{
              display: "inline-block",
              background: isValidated ? "#F0FDF4" : "#F8FAFC",
              border: `1px solid ${isValidated ? "#BBF7D0" : "#E2E8F0"}`,
              borderRadius: 6,
              padding: "3px 10px",
              fontFamily: "var(--font-mono, monospace)",
              fontSize: 13,
              fontWeight: 600,
              color: isValidated ? "#15803D" : "#0F1B2A",
              letterSpacing: ".02em",
            }}>
              {currentValue}
            </div>
            <button
              onClick={startEdit}
              title="Editar"
              style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 5, border: "1px solid #E2E8F0", background: "transparent", color: "#5A6B7B", cursor: "pointer", lineHeight: 1.5 }}
            >
              Editar
            </button>
          </div>
        ) : (
          <div style={{ marginTop: 4, display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{
              display: "inline-block",
              background: "#F8FAFC",
              border: "1px solid #E2E8F0",
              borderRadius: 6,
              padding: "3px 10px",
              fontSize: 12,
              color: "#94A3B8",
              fontStyle: "italic",
            }}>
              El cliente aún no ha proporcionado este dato
            </div>
            <button
              onClick={startEdit}
              title="Agregar dato"
              style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 5, border: "1px solid #E2E8F0", background: "transparent", color: "#5A6B7B", cursor: "pointer", lineHeight: 1.5 }}
            >
              Agregar
            </button>
          </div>
        )}

        {error && <p style={{ margin: "4px 0 0", fontSize: 11, color: "#B91C1C" }}>{error}</p>}
      </div>
    </div>
  )
}
