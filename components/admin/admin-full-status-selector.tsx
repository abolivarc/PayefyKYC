"use client"

import { useState, useTransition } from "react"
import { updateApplicationStatus } from "@/app/(admin)/applications/actions"

const ALL_STATUSES = [
  { value: "draft",                       label: "Borrador" },
  { value: "documents_pending",           label: "Documentos pendientes" },
  { value: "in_compliance_review",        label: "En revisión interna (operaciones / compliance)" },
  { value: "changes_requested",           label: "Cambios solicitados (compliance)" },
  { value: "approved_compliance",         label: "Aprobado internamente (operaciones / compliance)" },
  { value: "in_provider_review",          label: "En revisión del proveedor" },
  { value: "provider_changes_requested",  label: "Cambios solicitados (proveedor)" },
  { value: "approved_provider",           label: "Aprobado por proveedor" },
  { value: "contracts_pending",           label: "Contratos por firmar" },
  { value: "contracts_signed",            label: "Contratos firmados" },
  { value: "activation_pending",          label: "Por activar" },
  { value: "activated",                   label: "Activado" },
  { value: "rejected",                    label: "Rechazado" },
  { value: "archived",                    label: "Archivado" },
]

interface Props {
  applicationId: string
  currentStatus: string
}

export function AdminFullStatusSelector({ applicationId, currentStatus }: Props) {
  const [selected, setSelected] = useState(currentStatus)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [savedStatus, setSavedStatus] = useState(currentStatus)

  function handleChange(newStatus: string) {
    setSelected(newStatus)
    setError(null)
    if (newStatus === savedStatus) return
    startTransition(async () => {
      const result = await updateApplicationStatus(applicationId, newStatus)
      if (result?.error) {
        setError(result.error)
        setSelected(savedStatus)
      } else {
        setSavedStatus(newStatus)
      }
    })
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
      <select
        value={selected}
        onChange={(e) => handleChange(e.target.value)}
        disabled={isPending}
        style={{
          padding: "7px 10px",
          borderRadius: 8,
          border: "1px solid var(--admin-border, #E7ECF1)",
          fontSize: 13,
          background: "#fff",
          color: "var(--admin-text, #0F1B2A)",
          minWidth: 260,
          cursor: isPending ? "wait" : "pointer",
          outline: "none",
        }}
      >
        {ALL_STATUSES.map((s) => (
          <option key={s.value} value={s.value}>{s.label}</option>
        ))}
      </select>
      {isPending && (
        <span style={{ fontSize: 12, color: "var(--admin-text-muted, #5A6B7B)" }}>Guardando…</span>
      )}
      {!isPending && selected !== currentStatus && !error && (
        <span style={{ fontSize: 12, color: "#047857", fontWeight: 600 }}>✓ Guardado</span>
      )}
      {error && (
        <span style={{ fontSize: 12, color: "#B91C1C" }}>{error}</span>
      )}
    </div>
  )
}
