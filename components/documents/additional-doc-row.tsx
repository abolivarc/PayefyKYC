"use client"

import { useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { uploadDocumentFile } from "@/lib/documents/upload"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"

type DocStatus = "pending_upload" | "pending_review" | "approved" | "rejected" | "changes_requested"

const STATUS_BADGE: Record<DocStatus, { label: string; variant: "pending" | "warning" | "success" | "destructive" }> = {
  pending_upload:    { label: "Pendiente",          variant: "pending" },
  pending_review:    { label: "En revisión",         variant: "warning" },
  approved:          { label: "Aprobado",            variant: "success" },
  rejected:          { label: "Rechazado",           variant: "destructive" },
  changes_requested: { label: "Con observaciones",   variant: "destructive" },
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

  const badge = STATUS_BADGE[status] ?? STATUS_BADGE.pending_upload

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
    <div className="flex flex-wrap items-start gap-3 py-3 border-b last:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">{displayName}</span>
          <Badge variant={badge.variant}>{badge.label}</Badge>
        </div>
        {uploadedName && status !== "pending_upload" && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">📎 {uploadedName}</p>
        )}
        {status === "changes_requested" && reviewerNotes && (
          <p className="text-xs text-amber-700 mt-1 bg-amber-50 rounded px-2 py-1">
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
