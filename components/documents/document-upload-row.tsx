"use client"

import { useRef, useState, useTransition } from "react"
import Link from "next/link"
import { isDocumentExpired, EXPIRY_CODES } from "@/lib/documents/expiry"
import { uploadDocumentFile } from "@/lib/documents/upload"
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
  changes_requested: { label: "Observaciones", color: "#c9772f", bg: "#fdf1e6", stripe: "#c9772f" },
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
  fileName: string | null
  uploadedAt?: string | null
  isShared?: boolean
  isRequired?: boolean
  reviewerNotes?: string | null
}

export function DocumentUploadRow({
  documentId,
  applicationId,
  templateCode,
  templateName,
  currentStatus,
  fileFormat,
  isForm,
  fileName,
  uploadedAt,
  isShared,
  isRequired = true,
  reviewerNotes,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<DocStatus>(currentStatus)
  const [uploadedName, setUploadedName] = useState<string | null>(fileName)
  const [currentUploadedAt, setCurrentUploadedAt] = useState<string | null | undefined>(uploadedAt)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const accept = fileFormat === "jpg" ? "image/*" : "application/pdf"
  const expired = EXPIRY_CODES.has(templateCode) && isDocumentExpired(currentUploadedAt)
  const displayKey = expired ? "expired" : status
  const cfg = STATUS[displayKey] ?? STATUS.pending_upload
  const needsAction = status === "pending_upload" || expired

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
      }
    })
  }

  return (
    <div
      style={{
        position: "relative",
        background: status === "approved" && !expired ? "#FAFFFE" : "#fff",
        border: "1px solid #E4ECE7",
        borderRadius: 10,
        padding: "9px 10px 9px 14px",
        display: "flex",
        flexDirection: "column",
        gap: 6,
        overflow: "hidden",
        minHeight: 80,
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
            <Link
              href={`/applications/${applicationId}/forms/${templateCode}`}
              style={{
                fontSize: 10,
                fontWeight: 700,
                lineHeight: 1.5,
                padding: "2px 8px",
                borderRadius: 5,
                textDecoration: "none",
                background: needsAction ? "#004238" : "#F3F7F4",
                color: needsAction ? "#A8F898" : "#5B7168",
              }}
            >
              {needsAction ? "Llenar" : "Editar"}
            </Link>
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
                  background: needsAction ? "#004238" : "#F3F7F4",
                  color: needsAction ? "#A8F898" : "#5B7168",
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

      {/* Reviewer note (changes requested) */}
      {status === "changes_requested" && reviewerNotes && (
        <p
          className="line-clamp-2"
          style={{
            margin: 0,
            fontSize: 10,
            color: "#c9772f",
            lineHeight: 1.3,
          }}
        >
          🔔 {reviewerNotes}
        </p>
      )}

      {error && (
        <p style={{ margin: 0, fontSize: 10, color: "#d1622f" }}>{error}</p>
      )}
    </div>
  )
}
