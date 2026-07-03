"use client"

import { useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { uploadDocumentFile } from "@/lib/documents/upload"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"

type DocStatus = "pending_upload" | "pending_review" | "approved" | "rejected" | "changes_requested"

const STATUS_CONFIG: Record<DocStatus, { label: string; bg: string; color: string; border: string; dot: string }> = {
  pending_upload:    { label: "Pendiente",        bg: "#F3F7F4", color: "#5B7168", border: "#E4ECE7", dot: "#D1D5DB"  },
  pending_review:    { label: "En revisión",       bg: "#EFF4FF", color: "#1D4ED8", border: "#dce8ff", dot: "#1D4ED8" },
  approved:          { label: "Aprobado",          bg: "#e7f6ec", color: "#1f7a4d", border: "#b8e8ca", dot: "#1f7a4d" },
  rejected:          { label: "Rechazado",         bg: "#fef2f2", color: "#d1622f", border: "#fecaca", dot: "#d1622f" },
  changes_requested: { label: "Con observaciones", bg: "#fdf1e6", color: "#c9772f", border: "#f5d9b5", dot: "#c9772f" },
}

interface Props {
  documentId: string
  title: string | null
  fileName: string | null
  currentStatus: DocStatus
  reviewerNotes: string | null
}

export function AdditionalDocRow({
  documentId,
  title,
  fileName,
  currentStatus,
  reviewerNotes,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<DocStatus>(currentStatus)
  const [uploadedName, setUploadedName] = useState<string | null>(fileName)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending_upload

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
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
        router.refresh()
      }
    })
  }

  const displayName = title || "Documento sin título"

  return (
    <div className="flex flex-wrap items-start gap-3 py-4 border-b last:border-0" style={{ borderColor: "#F0F4F1" }}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center flex-wrap gap-2 mb-1">
          <span className="text-sm font-semibold" style={{ color: "#0F2A22" }}>{displayName}</span>
          <span
            className="inline-flex items-center gap-1 rounded-full text-[11px] font-semibold"
            style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, padding: "2px 8px" }}
          >
            <span className="w-1 h-1 rounded-full shrink-0" style={{ background: cfg.dot }} />
            {cfg.label}
          </span>
        </div>
        {uploadedName && status !== "pending_upload" && (
          <p className="text-xs truncate" style={{ color: "#5B7168" }}>📎 {uploadedName}</p>
        )}
        {status === "changes_requested" && reviewerNotes && (
          <p className="text-xs mt-1 rounded-[8px] px-2.5 py-1.5" style={{ background: "#fdf1e6", color: "#c9772f" }}>
            Nota: {reviewerNotes}
          </p>
        )}
        {error && <p className="text-xs text-destructive mt-1">{error}</p>}
      </div>
      <div className="shrink-0">
        <input ref={inputRef} type="file" className="hidden" onChange={handleFileChange} />
        <Button
          size="sm"
          variant={status === "pending_upload" ? "default" : "outline"}
          disabled={isPending}
          onClick={() => inputRef.current?.click()}
          className="flex items-center gap-1.5"
        >
          {isPending && <Spinner size={13} />}
          {isPending ? "Subiendo…" : status === "pending_upload" ? "Subir" : "Reemplazar"}
        </Button>
      </div>
    </div>
  )
}
