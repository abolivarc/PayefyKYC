"use client"

import { useRef, useState, useTransition } from "react"
import Link from "next/link"
import { isDocumentExpired, EXPIRY_CODES } from "@/lib/documents/expiry"
import { uploadDocumentFile } from "@/lib/documents/upload"
import { saveClientNote } from "@/app/(client)/applications/actions"
import { Spinner } from "@/components/ui/spinner"

type DocStatus =
  | "pending_upload"
  | "pending_review"
  | "approved"
  | "rejected"
  | "changes_requested"

const STATUS: Record<string, { label: string; color: string; bg: string; stripe: string }> = {
  pending_upload:    { label: "Pendiente",     color: "#8A9E94", bg: "#F3F7F4", stripe: "#D1D5DB" },
  pending_review:    { label: "En revisión",   color: "#1D4ED8", bg: "#EFF4FF", stripe: "#1D4ED8" },
  approved:          { label: "Aprobado",      color: "#1f7a4d", bg: "#e7f6ec", stripe: "#1f7a4d" },
  rejected:          { label: "Rechazado",     color: "#d1622f", bg: "#fef2f2", stripe: "#d1622f" },
  changes_requested: { label: "Observaciones", color: "#b91c1c", bg: "#fef2f2", stripe: "#dc2626" },
  expired:           { label: "Vencido",       color: "#c9772f", bg: "#fdf1e6", stripe: "#c9772f" },
}

interface Props {
  documentId: string
  applicationId: string
  templateCode: string
  templateName: string
  templateInstructions: string | null
  currentStatus: DocStatus
  fileFormat: string
  isForm: boolean
  supportsDirectUpload?: boolean
  fileName: string | null
  uploadedAt?: string | null
  isShared?: boolean
  isRequired?: boolean
  reviewerNotes?: string | null
  clientNotes?: string | null
}

export function DocumentUploadRow({
  documentId,
  applicationId,
  templateCode,
  templateName,
  currentStatus,
  fileFormat,
  isForm,
  supportsDirectUpload = false,
  fileName,
  uploadedAt,
  isShared,
  isRequired = true,
  reviewerNotes,
  clientNotes: initialClientNotes,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<DocStatus>(currentStatus)
  const [uploadedName, setUploadedName] = useState<string | null>(fileName)
  const [currentUploadedAt, setCurrentUploadedAt] = useState<string | null | undefined>(uploadedAt)
  const [isPending, startTransition] = useTransition()
  const [isSavingNote, startSavingNote] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [showNotes, setShowNotes] = useState(false)
  const [clientNote, setClientNote] = useState(initialClientNotes ?? "")
  const [noteSaved, setNoteSaved] = useState(false)

  const accept = "*"
  const expired = EXPIRY_CODES.has(templateCode) && isDocumentExpired(currentUploadedAt)
  const displayKey = expired ? "expired" : status
  const cfg = STATUS[displayKey] ?? STATUS.pending_upload
  const needsAction = status === "pending_upload" || expired
  const hasObservations = status === "changes_requested" && !!reviewerNotes

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    e.target.value = ""
    startTransition(async () => {
      const result = await uploadDocumentFile(documentId, file)
      if (!result.success) {
        setError(result.error ?? "Error al subir")
      } else {
        setStatus("pending_review")
        setUploadedName(file.name)
        setCurrentUploadedAt(new Date().toISOString())
        setShowNotes(false)
      }
    })
  }

  async function handleSaveNote() {
    setNoteSaved(false)
    startSavingNote(async () => {
      const result = await saveClientNote(documentId, applicationId, clientNote)
      if (!result.success) {
        setError((result as { error?: string }).error ?? "Error al guardar")
      } else {
        setNoteSaved(true)
      }
    })
  }

  return (
    <div
      style={{
        position: "relative",
        background: status === "changes_requested" ? "#fff5f5" : status === "approved" && !expired ? "#FAFFFE" : "#fff",
        border: `1px solid ${status === "changes_requested" ? "#fecaca" : "#E4ECE7"}`,
        borderRadius: 10,
        padding: "9px 10px 9px 14px",
        display: "flex",
        flexDirection: "column",
        gap: 6,
        overflow: "hidden",
        minHeight: 80,
        transition: "background .15s, border-color .15s",
      }}
    >
      {/* Left status stripe */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: 3,
          background: cfg.stripe,
        }}
      />

      {/* Top row: badge + actions */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              lineHeight: 1,
              background: cfg.bg,
              color: cfg.color,
              borderRadius: 99,
              padding: "2px 7px",
              flexShrink: 0,
            }}
          >
            {cfg.label}
            {!isRequired && (
              <span style={{ fontWeight: 500, opacity: 0.7 }}> · opc</span>
            )}
            {isShared && (
              <span style={{ fontWeight: 500, opacity: 0.7 }}> ↗</span>
            )}
          </span>

          {/* "Ver observaciones" toggle when changes_requested */}
          {hasObservations && (
            <button
              onClick={() => setShowNotes((v) => !v)}
              style={{
                fontSize: 10,
                fontWeight: 700,
                padding: "2px 7px",
                borderRadius: 99,
                border: "1px solid #fecaca",
                background: showNotes ? "#b91c1c" : "#fff",
                color: showNotes ? "#fff" : "#b91c1c",
                cursor: "pointer",
                lineHeight: 1.4,
                flexShrink: 0,
              }}
            >
              {showNotes ? "Cerrar ↑" : "Ver observaciones ↓"}
            </button>
          )}
        </div>

        <div style={{ display: "flex", gap: 4, flexShrink: 0, alignItems: "center" }}>
          {uploadedName && status !== "pending_upload" && !expired && (
            <a
              href={`/api/documents/${documentId}/view`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: "#1f7a4d",
                textDecoration: "none",
                padding: "2px 6px",
                border: "1px solid #b8e8ca",
                borderRadius: 5,
                lineHeight: 1.5,
              }}
            >
              Ver
            </a>
          )}

          {isForm ? (
            <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
              <Link
                href={`/applications/${applicationId}/forms/${templateCode}`}
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  lineHeight: 1.5,
                  padding: "2px 8px",
                  borderRadius: 5,
                  textDecoration: "none",
                  background: needsAction && !supportsDirectUpload ? "#004238" : "#F3F7F4",
                  color: needsAction && !supportsDirectUpload ? "#A8F898" : "#5B7168",
                }}
              >
                {needsAction ? "Generar" : "Editar"}
              </Link>
              {supportsDirectUpload && (
                <>
                  <input
                    ref={inputRef}
                    type="file"
                    accept={accept}
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <button
                    onClick={() => inputRef.current?.click()}
                    disabled={isPending}
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      lineHeight: 1.5,
                      padding: "2px 8px",
                      borderRadius: 5,
                      border: "none",
                      background: needsAction ? "#004238" : status === "changes_requested" ? "#b91c1c" : "#F3F7F4",
                      color: needsAction ? "#A8F898" : status === "changes_requested" ? "#fff" : "#5B7168",
                      cursor: "pointer",
                      opacity: isPending ? 0.5 : 1,
                      display: "flex",
                      alignItems: "center",
                      gap: 3,
                    }}
                  >
                    {isPending && <Spinner size={9} />}
                    {isPending ? "…" : needsAction ? "Subir" : "Cambiar"}
                  </button>
                </>
              )}
            </div>
          ) : (
            <>
              <input
                ref={inputRef}
                type="file"
                accept={accept}
                className="hidden"
                onChange={handleFileChange}
              />
              <button
                onClick={() => inputRef.current?.click()}
                disabled={isPending}
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  lineHeight: 1.5,
                  padding: "2px 8px",
                  borderRadius: 5,
                  border: "none",
                  background: needsAction ? "#004238" : status === "changes_requested" ? "#b91c1c" : "#F3F7F4",
                  color: needsAction ? "#A8F898" : status === "changes_requested" ? "#fff" : "#5B7168",
                  cursor: "pointer",
                  opacity: isPending ? 0.5 : 1,
                  display: "flex",
                  alignItems: "center",
                  gap: 3,
                }}
              >
                {isPending && <Spinner size={9} />}
                {isPending ? "…" : needsAction ? "Subir" : status === "changes_requested" ? "Re-subir" : "Cambiar"}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Doc name */}
      <p
        className="line-clamp-2"
        style={{
          margin: 0,
          fontSize: 12,
          fontWeight: 700,
          color: "#0F2A22",
          lineHeight: 1.25,
        }}
      >
        {templateName}
      </p>

      {/* Observations panel (expandable) */}
      {showNotes && (
        <div
          style={{
            marginTop: 2,
            display: "flex",
            flexDirection: "column",
            gap: 8,
            background: "#fff",
            border: "1px solid #fecaca",
            borderRadius: 7,
            padding: "10px 10px 8px",
          }}
        >
          {/* Admin note */}
          {reviewerNotes && (
            <div>
              <p style={{ margin: "0 0 3px", fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "#b91c1c" }}>
                Nota del revisor
              </p>
              <p style={{ margin: 0, fontSize: 11, color: "#7f1d1d", lineHeight: 1.4 }}>
                {reviewerNotes}
              </p>
            </div>
          )}

          {/* Client reply */}
          <div>
            <p style={{ margin: "0 0 4px", fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "#5B7168" }}>
              Tu respuesta (opcional)
            </p>
            <textarea
              value={clientNote}
              onChange={(e) => { setClientNote(e.target.value); setNoteSaved(false) }}
              placeholder="Escribe una observación o pregunta al revisor…"
              rows={2}
              style={{
                width: "100%",
                fontSize: 11,
                padding: "6px 8px",
                borderRadius: 6,
                border: "1px solid #E4ECE7",
                resize: "vertical",
                fontFamily: "inherit",
                color: "#0F2A22",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
              {noteSaved && (
                <span style={{ fontSize: 10, color: "#1f7a4d", fontWeight: 600 }}>Respuesta guardada</span>
              )}
              {!noteSaved && <span />}
              <button
                onClick={handleSaveNote}
                disabled={isSavingNote}
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  padding: "3px 10px",
                  borderRadius: 5,
                  border: "none",
                  background: "#004238",
                  color: "#A8F898",
                  cursor: isSavingNote ? "not-allowed" : "pointer",
                  opacity: isSavingNote ? 0.6 : 1,
                }}
              >
                {isSavingNote ? "…" : "Guardar respuesta"}
              </button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <p style={{ margin: 0, fontSize: 10, color: "#d1622f" }}>{error}</p>
      )}
    </div>
  )
}
