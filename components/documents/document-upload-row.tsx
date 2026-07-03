"use client"

import { useRef, useState, useTransition } from "react"
import Link from "next/link"
import { isDocumentExpired } from "@/lib/documents/expiry"
import { uploadDocumentFile } from "@/lib/documents/upload"
import { Button, buttonVariants } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"

type DocStatus =
  | "pending_upload"
  | "pending_review"
  | "approved"
  | "rejected"
  | "changes_requested"

const STATUS_CONFIG: Record<DocStatus, { label: string; bg: string; color: string; border: string; dot: string }> = {
  pending_upload:    { label: "Pendiente",        bg: "#F3F7F4", color: "#5B7168", border: "#E4ECE7", dot: "#D1D5DB"  },
  pending_review:    { label: "En revisión",       bg: "#EFF4FF", color: "#1D4ED8", border: "#dce8ff", dot: "#1D4ED8" },
  approved:          { label: "Aprobado",          bg: "#e7f6ec", color: "#1f7a4d", border: "#b8e8ca", dot: "#1f7a4d" },
  rejected:          { label: "Rechazado",         bg: "#fef2f2", color: "#d1622f", border: "#fecaca", dot: "#d1622f" },
  changes_requested: { label: "Con observaciones", bg: "#fdf1e6", color: "#c9772f", border: "#f5d9b5", dot: "#c9772f" },
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
}

export function DocumentUploadRow({
  documentId,
  applicationId,
  templateCode,
  templateName,
  templateInstructions,
  currentStatus,
  fileFormat,
  isForm,
  fileName,
  uploadedAt,
  isShared,
  isRequired = true,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<DocStatus>(currentStatus)
  const [uploadedName, setUploadedName] = useState<string | null>(fileName)
  const [currentUploadedAt, setCurrentUploadedAt] = useState<string | null | undefined>(uploadedAt)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const accept = fileFormat === "jpg" ? "image/*" : "application/pdf"
  const expired = isDocumentExpired(currentUploadedAt)
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending_upload

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    startTransition(async () => {
      const result = await uploadDocumentFile(documentId, file)
      if (!result.success) {
        setError(result.error ?? "Error al subir el archivo")
      } else {
        setStatus("pending_review")
        setUploadedName(file.name)
        setCurrentUploadedAt(new Date().toISOString())
      }
    })
  }

  const needsAction = status === "pending_upload" || expired

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #E4ECE7",
        borderRadius: 14,
        boxShadow: "0 1px 3px rgba(15,42,34,.06)",
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      {/* Top: status badge */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          {expired ? (
            <span
              className="inline-flex items-center gap-1.5 rounded-full text-[11px] font-semibold"
              style={{ background: "#fdf1e6", color: "#c9772f", border: "1px solid #f5d9b5", padding: "3px 10px" }}
            >
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "#c9772f" }} />
              Vencido
            </span>
          ) : (
            <span
              className="inline-flex items-center gap-1.5 rounded-full text-[11px] font-semibold"
              style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, padding: "3px 10px" }}
            >
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: cfg.dot }} />
              {cfg.label}
            </span>
          )}
          {!isRequired && (
            <span className="text-[11px] font-medium rounded-full" style={{ background: "#F3F7F4", color: "#8A9E94", padding: "3px 8px" }}>
              Opcional
            </span>
          )}
          {isShared && (
            <span className="text-[11px] font-medium rounded-full" style={{ background: "#F3F7F4", color: "#5B7168", border: "1px solid #E4ECE7", padding: "3px 8px" }}>
              Compartido
            </span>
          )}
        </div>
      </div>

      {/* Document name */}
      <div>
        <p className="font-bold leading-snug" style={{ fontSize: 16, color: "#0F2A22", marginBottom: 4 }}>
          {templateName}
        </p>
        {templateInstructions && (
          <p className="text-xs leading-relaxed" style={{ color: "#8A9E94" }}>
            {templateInstructions}
          </p>
        )}
      </div>

      {/* Filename */}
      {uploadedName && status !== "pending_upload" && !expired && (
        <div
          className="flex items-center gap-1.5 rounded-[8px] px-3 py-2 text-xs truncate"
          style={{ background: "#F8FAF9", color: "#5B7168", border: "1px solid #E4ECE7" }}
        >
          📎 <span className="truncate">{uploadedName}</span>
        </div>
      )}
      {expired && uploadedName && (
        <p className="text-xs font-medium" style={{ color: "#c9772f" }}>
          Este documento venció — debe reemplazarse
        </p>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}

      {/* Action button */}
      <div className="mt-auto pt-1">
        {isForm ? (
          <Link
            href={`/applications/${applicationId}/forms/${templateCode}`}
            className={buttonVariants({ size: "sm", variant: needsAction ? "default" : "outline" }) + " w-full justify-center"}
          >
            {needsAction ? "Rellenar formulario" : "Editar formulario"}
          </Link>
        ) : (
          <>
            <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={handleFileChange} />
            <Button
              size="sm"
              variant={needsAction ? "default" : "outline"}
              disabled={isPending}
              onClick={() => inputRef.current?.click()}
              className="w-full flex items-center justify-center gap-1.5"
            >
              {isPending && <Spinner size={13} />}
              {isPending ? "Subiendo…" : needsAction ? "Subir documento" : "Reemplazar"}
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
