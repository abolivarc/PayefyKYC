"use client"

import { useState, useTransition } from "react"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { isDocumentExpired, EXPIRY_CODES } from "@/lib/documents/expiry"
import {
  approveDocument,
  requestDocumentChanges,
} from "@/app/(admin)/applications/actions"

type DocStatus =
  | "pending_upload"
  | "pending_review"
  | "approved"
  | "rejected"
  | "changes_requested"

const STATUS_CONFIG: Record<DocStatus, { label: string; bg: string; color: string; border: string; dot: string }> = {
  pending_upload:    { label: "Sin subir",           bg: "#F3F7F4", color: "#5B7168", border: "#E4ECE7", dot: "#D1D5DB" },
  pending_review:    { label: "Esperando revisión",  bg: "#EFF4FF", color: "#1D4ED8", border: "#dce8ff", dot: "#1D4ED8" },
  approved:          { label: "Aprobado",            bg: "#e7f6ec", color: "#1f7a4d", border: "#b8e8ca", dot: "#1f7a4d" },
  rejected:          { label: "Rechazado",           bg: "#fef2f2", color: "#d1622f", border: "#fecaca", dot: "#d1622f" },
  changes_requested: { label: "Con observaciones",   bg: "#fdf1e6", color: "#c9772f", border: "#f5d9b5", dot: "#c9772f" },
}

interface Props {
  documentId: string
  applicationId: string
  templateCode?: string
  templateName: string
  isRequired: boolean
  currentStatus: DocStatus
  storageAvailable: boolean
  reviewerNotes?: string | null
  clientNotes?: string | null
  uploadedAt?: string | null
  /** Producto de la otra solicitud, si el archivo se subió allá */
  sharedFrom?: string | null
}

export function ReviewDocumentRow({
  documentId,
  applicationId,
  templateCode,
  templateName,
  sharedFrom,
  isRequired,
  currentStatus,
  storageAvailable,
  reviewerNotes,
  clientNotes,
  uploadedAt,
}: Props) {
  const [status, setStatus] = useState<DocStatus>(currentStatus)
  const [dialogMode, setDialogMode] = useState<"changes" | null>(null)
  const [notes, setNotes] = useState(reviewerNotes ?? "")
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const expired = (templateCode ? EXPIRY_CODES.has(templateCode) : false) && isDocumentExpired(uploadedAt)
  const cfg = expired
    ? { label: "Vencido", bg: "#fdf1e6", color: "#c9772f", border: "#f5d9b5", dot: "#c9772f" }
    : STATUS_CONFIG[status] ?? STATUS_CONFIG.pending_review

  const needsAction = status === "pending_review" && !expired
  const rowBg = needsAction ? "#F0F6FF" : status === "approved" ? "#F5FBF7" : "#fff"
  const rowBorder = needsAction ? "#C7D9FF" : status === "approved" ? "#C3E8D0" : "#E4ECE7"

  function handleApprove() {
    setError(null)
    startTransition(async () => {
      const result = await approveDocument(documentId, applicationId)
      if (result?.error) setError(result.error)
      else setStatus("approved")
    })
  }

  function handleSendChanges() {
    if (!notes.trim()) return
    setError(null)
    startTransition(async () => {
      const result = await requestDocumentChanges(documentId, applicationId, notes.trim())
      if (result?.error) setError(result.error)
      else {
        setStatus("changes_requested")
        setDialogMode(null)
      }
    })
  }

  return (
    <div
      style={{
        background: rowBg,
        border: `1px solid ${rowBorder}`,
        borderRadius: 12,
        padding: "14px 16px",
        marginBottom: 8,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        transition: "background .2s, border-color .2s",
      }}
    >
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 3 }}>
            {/* Status badge */}
            <span
              style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
                borderRadius: 999, fontSize: 11, fontWeight: 700, padding: "2px 9px",
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: cfg.dot, flexShrink: 0 }} />
              {cfg.label}
            </span>
            {!isRequired && (
              <span style={{ fontSize: 11, color: "#8A9E94", background: "#F3F7F4", borderRadius: 999, padding: "2px 7px" }}>
                Opcional
              </span>
            )}
            {needsAction && (
              <span style={{ fontSize: 11, fontWeight: 700, color: "#1D4ED8" }}>
                ← requiere decisión
              </span>
            )}
          </div>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#0F2A22", lineHeight: 1.3 }}>
            {templateName}
          </p>
          {sharedFrom && (
            <p style={{ margin: "4px 0 0", fontSize: 11, display: "inline-flex", alignItems: "center", gap: 5,
                        background: "#F0FAF3", color: "#1f7a4d", border: "1px solid #CDE9D8",
                        borderRadius: 999, padding: "2px 8px" }}>
              Compartido desde {sharedFrom} — el comercio no vuelve a subirlo
            </p>
          )}
          {status === "changes_requested" && notes && (
            <p style={{ margin: "6px 0 0", fontSize: 12, background: "#fdf1e6", color: "#c9772f", borderRadius: 8, padding: "6px 10px" }}>
              Nota enviada: {notes}
            </p>
          )}
          {clientNotes && (
            <div style={{ margin: "6px 0 0", background: "#EFF4FF", border: "1px solid #C7D9FF", borderRadius: 8, padding: "6px 10px" }}>
              <p style={{ margin: "0 0 2px", fontSize: 10, fontWeight: 700, color: "#1D4ED8", textTransform: "uppercase", letterSpacing: ".06em" }}>
                Respuesta del cliente
              </p>
              <p style={{ margin: 0, fontSize: 12, color: "#1e3a8a", lineHeight: 1.4 }}>
                {clientNotes}
              </p>
            </div>
          )}
          {expired && (
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "#c9772f" }}>
              Documento vencido — el cliente debe volver a subirlo
            </p>
          )}
          {error && <p style={{ margin: "4px 0 0", fontSize: 12, color: "#d1622f" }}>{error}</p>}
        </div>

        {/* Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          {storageAvailable && (
            <a
              href={`/api/documents/${documentId}/view`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: 12, fontWeight: 600, color: "#1f7a4d", textDecoration: "none",
                padding: "5px 10px", borderRadius: 7, border: "1px solid #b8e8ca", background: "#e7f6ec",
                whiteSpace: "nowrap",
              }}
            >
              Ver
            </a>
          )}

          {(status === "pending_review" || status === "changes_requested" || status === "approved") && !expired && (
            <button
              onClick={handleApprove}
              disabled={isPending}
              style={{
                fontSize: 12, fontWeight: 700, cursor: "pointer",
                padding: "5px 12px", borderRadius: 7,
                border: "1px solid #b8e8ca",
                background: status === "approved" ? "#fff" : "#1f7a4d",
                color: status === "approved" ? "#1f7a4d" : "#fff",
                opacity: isPending ? 0.6 : 1,
                whiteSpace: "nowrap",
              }}
            >
              {isPending ? "…" : status === "approved" ? "Re-aprobar" : "Aprobar"}
            </button>
          )}

          {status !== "pending_upload" && (
            <button
              onClick={() => { setNotes(reviewerNotes ?? ""); setDialogMode("changes") }}
              disabled={isPending}
              style={{
                fontSize: 12, fontWeight: 700, cursor: "pointer",
                padding: "5px 12px", borderRadius: 7,
                border: "1px solid #f5d9b5",
                background: "#fff",
                color: "#c9772f",
                opacity: isPending ? 0.6 : 1,
                whiteSpace: "nowrap",
              }}
            >
              Observaciones
            </button>
          )}
        </div>
      </div>

      {/* Inline changes form (shown when dialog mode = changes) */}
      <Dialog open={dialogMode === "changes"} onClose={() => setDialogMode(null)}>
        <DialogHeader>
          <DialogTitle>Observaciones: {templateName}</DialogTitle>
        </DialogHeader>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Describe qué debe corregir o complementar el cliente..."
          rows={4}
          className="mt-2"
        />
        <DialogFooter>
          <button
            onClick={() => setDialogMode(null)}
            style={{ fontSize: 13, fontWeight: 600, padding: "8px 16px", borderRadius: 8, border: "1px solid #E4ECE7", background: "#fff", color: "#5B7168", cursor: "pointer" }}
          >
            Cancelar
          </button>
          <button
            disabled={!notes.trim() || isPending}
            onClick={handleSendChanges}
            style={{
              fontSize: 13, fontWeight: 700, padding: "8px 18px", borderRadius: 8,
              border: "none", background: notes.trim() ? "#c9772f" : "#E4ECE7",
              color: notes.trim() ? "#fff" : "#8A9E94", cursor: notes.trim() ? "pointer" : "not-allowed",
            }}
          >
            {isPending ? "Enviando…" : "Enviar observaciones"}
          </button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}
