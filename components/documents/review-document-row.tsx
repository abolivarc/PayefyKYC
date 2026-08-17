"use client"

import { useState, useTransition } from "react"
import { isDocumentExpired, EXPIRY_CODES } from "@/lib/documents/expiry"
import { approveDocument, rejectDocument } from "@/app/(admin)/applications/actions"

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
  /** Número de versión del archivo (1 = original) */
  version?: number
  /** Versiones anteriores con URL firmada */
  previousVersions?: { version: number; label: string; url: string }[]
}

export function ReviewDocumentRow({
  documentId,
  applicationId,
  templateCode,
  templateName,
  sharedFrom,
  version = 1,
  previousVersions = [],
  isRequired,
  currentStatus,
  storageAvailable,
  reviewerNotes,
  clientNotes,
  uploadedAt,
}: Props) {
  const [status, setStatus] = useState<DocStatus>(currentStatus)
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

  // Rechazo directo: solo cambia el estado. El "por qué" va en el comentario
  // general, que junta todo en un solo correo con capturas.
  function handleReject() {
    setError(null)
    startTransition(async () => {
      const result = await rejectDocument(documentId, applicationId)
      if (result?.error) setError(result.error)
      else setStatus("changes_requested")
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
          <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#0F2A22", lineHeight: 1.3, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            {templateName}
            {/* v1 = el archivo original; v2+ = el cliente ya lo reemplazó.
                Clave para saber si lo que ves es anterior o posterior a los
                comentarios que enviaste. */}
            {storageAvailable && (
              <span style={{
                fontSize: 10, fontWeight: 700, borderRadius: 999, padding: "1px 8px",
                background: version > 1 ? "#EFF4FF" : "#F3F7F4",
                color: version > 1 ? "#1D4ED8" : "#8A9E94",
                border: `1px solid ${version > 1 ? "#C7D9FF" : "#E4ECE7"}`,
              }}>
                {version > 1 ? `v${version} · actualizado` : "v1 · original"}
              </span>
            )}
          </p>
          {previousVersions.length > 0 && (
            <details style={{ marginTop: 4 }}>
              <summary style={{ fontSize: 11, color: "#5B7168", cursor: "pointer" }}>
                Ver {previousVersions.length} versión{previousVersions.length === 1 ? "" : "es"} anterior{previousVersions.length === 1 ? "" : "es"}
              </summary>
              <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 4 }}>
                {previousVersions.map((pv) => (
                  <a key={pv.version} href={pv.url} target="_blank" rel="noopener noreferrer"
                     style={{ fontSize: 11, color: "#1f7a4d" }}>
                    {pv.label}
                  </a>
                ))}
              </div>
            </details>
          )}
          {sharedFrom && (
            <p style={{ margin: "4px 0 0", fontSize: 11, display: "inline-flex", alignItems: "center", gap: 5,
                        background: "#F0FAF3", color: "#1f7a4d", border: "1px solid #CDE9D8",
                        borderRadius: 999, padding: "2px 8px" }}>
              Compartido desde {sharedFrom} — el comercio no vuelve a subirlo
            </p>
          )}
          {status === "changes_requested" && reviewerNotes && (
            <p style={{ margin: "6px 0 0", fontSize: 12, background: "#fdf1e6", color: "#c9772f", borderRadius: 8, padding: "6px 10px" }}>
              Nota enviada: {reviewerNotes}
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

          {status !== "pending_upload" && status !== "changes_requested" && (
            <button
              onClick={handleReject}
              disabled={isPending}
              style={{
                fontSize: 12, fontWeight: 700, cursor: "pointer",
                padding: "5px 12px", borderRadius: 7,
                border: "1px solid #f5c2c2",
                background: "#fff",
                color: "#b91c1c",
                opacity: isPending ? 0.6 : 1,
                whiteSpace: "nowrap",
              }}
            >
              {isPending ? "…" : "Rechazar"}
            </button>
          )}
        </div>
      </div>

    </div>
  )
}
