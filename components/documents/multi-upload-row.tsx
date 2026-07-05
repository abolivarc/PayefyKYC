"use client"

import { useRef, useState, useTransition } from "react"
import { addExtraDocument } from "@/app/(client)/applications/actions"
import { uploadDocumentFile } from "@/lib/documents/upload"
import { Button } from "@/components/ui/button"

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

interface DocItem {
  id: string
  status: DocStatus
  fileName: string | null
}

interface Props {
  applicationId: string
  templateId: string
  templateName: string
  templateInstructions: string | null
  fileFormat: string
  initialDocs: DocItem[]
}

export function MultiUploadRow({
  applicationId,
  templateId,
  templateName,
  templateInstructions,
  fileFormat,
  initialDocs,
}: Props) {
  const [docs, setDocs] = useState<DocItem[]>(initialDocs)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [activeDocId, setActiveDocId] = useState<string | null>(null)

  const accept = fileFormat === "jpg" ? "image/*" : "application/pdf"

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !activeDocId) return
    setError(null)
    const docId = activeDocId
    startTransition(async () => {
      const result = await uploadDocumentFile(docId, file)
      if (!result.success) {
        setError(result.error ?? "Error al subir el archivo")
      } else {
        setDocs((prev) =>
          prev.map((d) =>
            d.id === docId ? { ...d, status: "pending_review", fileName: file.name } : d
          )
        )
      }
    })
  }

  async function handleAddExtra() {
    startTransition(async () => {
      const result = await addExtraDocument(applicationId, templateId)
      if (result?.error) {
        setError(result.error)
      } else if (result?.documentId) {
        setDocs((prev) => [...prev, { id: result.documentId, status: "pending_upload", fileName: null }])
      }
    })
  }

  const allDoneCount = docs.filter((d) => d.status === "approved" || d.status === "pending_review").length

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #E4ECE7",
        borderRadius: 10,
        padding: "12px 14px",
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex-1 min-w-0">
          <p className="font-bold leading-snug" style={{ fontSize: 14, color: "#0F2A22", marginBottom: 4 }}>
            {templateName}
          </p>
          {templateInstructions && (
            <p className="text-xs leading-relaxed" style={{ color: "#8A9E94" }}>
              {templateInstructions}
            </p>
          )}
        </div>
        <span
          className="shrink-0 text-[11px] font-semibold rounded-full"
          style={{ background: "#F3F7F4", color: "#5B7168", border: "1px solid #E4ECE7", padding: "3px 10px", whiteSpace: "nowrap" }}
        >
          {allDoneCount}/{docs.length} subidos
        </span>
      </div>

      {/* Sub-items */}
      <div className="space-y-2 mb-3">
        {docs.map((doc, i) => {
          const cfg = STATUS_CONFIG[doc.status] ?? STATUS_CONFIG.pending_upload
          return (
            <div
              key={doc.id}
              className="flex items-center gap-3"
              style={{ background: "#F8FAF9", border: "1px solid #E4ECE7", borderRadius: 10, padding: "7px 12px" }}
            >
              <span className="font-mono text-[11px] font-bold shrink-0" style={{ color: "#8A9E94", minWidth: 20 }}>
                #{i + 1}
              </span>
              <span
                className="inline-flex items-center gap-1 rounded-full text-[11px] font-semibold shrink-0"
                style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, padding: "2px 8px" }}
              >
                <span className="w-1 h-1 rounded-full" style={{ background: cfg.dot }} />
                {cfg.label}
              </span>
              {doc.fileName && (
                <span className="text-xs truncate flex-1" style={{ color: "#5B7168" }}>
                  {doc.fileName}
                </span>
              )}
              <Button
                size="sm"
                variant={doc.status === "pending_upload" ? "default" : "outline"}
                disabled={isPending}
                className="shrink-0"
                onClick={() => {
                  setActiveDocId(doc.id)
                  inputRef.current?.click()
                }}
              >
                {doc.status === "pending_upload" ? "Subir" : "Reemplazar"}
              </Button>
            </div>
          )
        })}
      </div>

      {error && <p className="text-xs text-destructive mb-3">{error}</p>}

      <button
        type="button"
        disabled={isPending}
        onClick={handleAddExtra}
        className="text-xs font-medium transition-colors"
        style={{ color: "#1f7a4d" }}
      >
        + Agregar otra persona
      </button>

      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={handleFileChange} />
    </div>
  )
}
