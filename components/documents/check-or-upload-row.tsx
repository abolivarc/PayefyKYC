"use client"

import { useRef, useState, useTransition } from "react"
import { setDocumentChecked } from "@/app/(client)/applications/actions"
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
}

interface Props {
  documentId: string
  templateName: string
  templateInstructions: string | null
  currentStatus: DocStatus
  fileFormat: string
  fileName: string | null
  initialIsChecked: boolean
  isRequired?: boolean
}

export function CheckOrUploadRow({
  documentId,
  templateName,
  currentStatus,
  fileFormat,
  fileName,
  initialIsChecked,
  isRequired = true,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<DocStatus>(currentStatus)
  const [uploadedName, setUploadedName] = useState<string | null>(fileName)
  const [isChecked, setIsChecked] = useState(initialIsChecked)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const satisfied = isChecked || status !== "pending_upload"
  const displayKey = isChecked ? "approved" : status
  const cfg = STATUS[displayKey] ?? STATUS.pending_upload
  const accept = fileFormat === "jpg" ? "image/*" : "application/pdf"

  async function handleCheckChange(checked: boolean) {
    setError(null)
    setIsChecked(checked)
    startTransition(async () => {
      const result = await setDocumentChecked(documentId, checked)
      if (result?.error) {
        setError(result.error)
        setIsChecked(!checked)
      } else {
        setStatus(checked ? "pending_review" : "pending_upload")
      }
    })
  }

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
        setIsChecked(false)
      }
    })
  }

  return (
    <div
      style={{
        position: "relative",
        background: satisfied ? "#FAFFFE" : "#fff",
        border: "1px solid #E4ECE7",
        borderRadius: 10,
        padding: "9px 10px 9px 14px",
        display: "flex",
        flexDirection: "column",
        gap: 6,
        overflow: "hidden",
        minHeight: 96,
      }}
    >
      {/* Left stripe */}
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

      {/* Top: status + upload */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 4 }}>
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            background: cfg.bg,
            color: cfg.color,
            borderRadius: 99,
            padding: "2px 7px",
            flexShrink: 0,
          }}
        >
          {isChecked ? "No aplica" : cfg.label}
          {!isRequired && <span style={{ fontWeight: 500, opacity: 0.7 }}> · opc</span>}
        </span>
        <div style={{ display: "flex", gap: 4, alignItems: "center", flexShrink: 0 }}>
          {uploadedName && status !== "pending_upload" && !isChecked && (
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
          {!isChecked && (
            <>
              <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={handleFileChange} />
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
                  background: status === "pending_upload" ? "#004238" : "#F3F7F4",
                  color: status === "pending_upload" ? "#A8F898" : "#5B7168",
                  cursor: "pointer",
                  opacity: isPending ? 0.5 : 1,
                  display: "flex",
                  alignItems: "center",
                  gap: 3,
                }}
              >
                {isPending && <Spinner size={9} />}
                {isPending ? "…" : status === "pending_upload" ? "Subir" : "Cambiar"}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Name */}
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

      {/* Compact checkbox */}
      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          cursor: isPending ? "default" : "pointer",
          opacity: isPending ? 0.6 : 1,
        }}
      >
        <input
          type="checkbox"
          checked={isChecked}
          disabled={isPending}
          onChange={(e) => handleCheckChange(e.target.checked)}
          style={{ width: 13, height: 13, accentColor: "#004238", flexShrink: 0 }}
        />
        <span style={{ fontSize: 10, color: "#5B7168" }}>
          Está en el acta / No aplica
        </span>
      </label>

      {error && (
        <p style={{ margin: 0, fontSize: 10, color: "#d1622f" }}>{error}</p>
      )}
    </div>
  )
}
