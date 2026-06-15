"use client"

import { useRef, useState, useTransition } from "react"
import { createClient } from "@/lib/supabase/client"
import { recordDocumentUpload, setDocumentChecked } from "@/app/(client)/applications/actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

type DocStatus =
  | "pending_upload"
  | "pending_review"
  | "approved"
  | "rejected"
  | "changes_requested"

const STATUS_BADGE: Record<
  DocStatus,
  { label: string; variant: "pending" | "warning" | "success" | "destructive" }
> = {
  pending_upload: { label: "Pendiente", variant: "pending" },
  pending_review: { label: "En revisión", variant: "warning" },
  approved: { label: "Aprobado", variant: "success" },
  rejected: { label: "Rechazado", variant: "destructive" },
  changes_requested: { label: "Con observaciones", variant: "destructive" },
}

interface Props {
  documentId: string
  applicationId: string
  templateName: string
  templateInstructions: string | null
  currentStatus: DocStatus
  fileFormat: string
  fileName: string | null
  initialIsChecked: boolean
}

export function CheckOrUploadRow({
  documentId,
  applicationId,
  templateName,
  templateInstructions,
  currentStatus,
  fileFormat,
  fileName,
  initialIsChecked,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<DocStatus>(currentStatus)
  const [uploadedName, setUploadedName] = useState<string | null>(fileName)
  const [isChecked, setIsChecked] = useState(initialIsChecked)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const satisfied = isChecked || (status !== "pending_upload")
  const badge = STATUS_BADGE[status] ?? STATUS_BADGE.pending_upload

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

    const supabase = createClient()
    const path = `${applicationId}/${documentId}/${file.name}`

    const { error: uploadErr } = await supabase.storage
      .from("kyc-documents")
      .upload(path, file, { upsert: true })

    if (uploadErr) {
      setError("Error al subir el archivo: " + uploadErr.message)
      return
    }

    startTransition(async () => {
      const result = await recordDocumentUpload(documentId, path, file.name, file.size, file.type)
      if (result?.error) {
        setError(result.error)
      } else {
        setStatus("pending_review")
        setUploadedName(file.name)
        setIsChecked(false)
      }
    })
  }

  return (
    <div className="flex items-start gap-3 py-3 border-b last:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">{templateName}</span>
          <Badge variant={badge.variant}>{badge.label}</Badge>
        </div>
        {templateInstructions && (
          <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
            {templateInstructions}
          </p>
        )}
        {uploadedName && status !== "pending_upload" && !isChecked && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            📎 {uploadedName}
          </p>
        )}
        {/* Checkbox option */}
        <label
          className="flex items-center gap-2 mt-2 cursor-pointer select-none"
          style={{ opacity: isPending ? 0.6 : 1 }}
        >
          <input
            type="checkbox"
            checked={isChecked}
            disabled={isPending}
            onChange={(e) => handleCheckChange(e.target.checked)}
            style={{ width: 15, height: 15, accentColor: "#004238", flexShrink: 0 }}
          />
          <span className="text-xs text-muted-foreground">
            Está en el acta / No aplica para esta empresa
          </span>
        </label>
        {error && (
          <p className="text-xs text-destructive mt-1">{error}</p>
        )}
      </div>

      <div className="shrink-0 flex flex-col items-end gap-1">
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={handleFileChange}
        />
        <Button
          size="sm"
          variant={satisfied ? "outline" : "default"}
          disabled={isPending}
          onClick={() => inputRef.current?.click()}
        >
          {isPending
            ? "Subiendo..."
            : status === "pending_upload" && !isChecked
            ? "Subir doc."
            : "Reemplazar"}
        </Button>
      </div>
    </div>
  )
}
