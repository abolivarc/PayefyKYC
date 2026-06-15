"use client"

import { useRef, useState, useTransition } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { recordDocumentUpload } from "@/app/(client)/applications/actions"
import { isDocumentExpired } from "@/lib/documents/expiry"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"

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
  templateCode: string
  templateName: string
  templateInstructions: string | null
  currentStatus: DocStatus
  fileFormat: string
  isForm: boolean
  fileName: string | null
  uploadedAt?: string | null
  isShared?: boolean
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
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<DocStatus>(currentStatus)
  const [uploadedName, setUploadedName] = useState<string | null>(fileName)
  const [currentUploadedAt, setCurrentUploadedAt] = useState<string | null | undefined>(uploadedAt)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const accept = fileFormat === "jpg" ? "image/*" : "application/pdf"
  const expired = isDocumentExpired(currentUploadedAt)

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
      const result = await recordDocumentUpload(
        documentId,
        path,
        file.name,
        file.size,
        file.type
      )
      if (result?.error) {
        setError(result.error)
      } else {
        setStatus("pending_review")
        setUploadedName(file.name)
        setCurrentUploadedAt(new Date().toISOString())
      }
    })
  }

  const badge = STATUS_BADGE[status] ?? STATUS_BADGE.pending_upload

  return (
    <div className="flex flex-wrap items-start gap-3 py-3 border-b last:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">{templateName}</span>
          {isShared && (
            <Badge variant="outline" className="text-xs">
              Compartido
            </Badge>
          )}
          {expired ? (
            <Badge variant="destructive" className="text-xs">
              Vencido — vuelve a subir
            </Badge>
          ) : (
            <Badge variant={badge.variant}>{badge.label}</Badge>
          )}
        </div>
        {templateInstructions && (
          <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
            {templateInstructions}
          </p>
        )}
        {uploadedName && status !== "pending_upload" && !expired && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            📎 {uploadedName}
          </p>
        )}
        {expired && uploadedName && (
          <p className="text-xs text-amber-700 mt-0.5">
            Este documento tiene más de 60 días y debe reemplazarse.
          </p>
        )}
        {error && (
          <p className="text-xs text-destructive mt-1">{error}</p>
        )}
      </div>

      <div className="shrink-0">
        {isForm ? (
          <Link
            href={`/applications/${applicationId}/forms/${templateCode}`}
            className={buttonVariants({ size: "sm", variant: expired ? "default" : "outline" })}
          >
            {status === "pending_upload" || expired ? "Rellenar" : "Editar"}
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
            <Button
              size="sm"
              variant={status === "pending_upload" || expired ? "default" : "outline"}
              disabled={isPending}
              onClick={() => inputRef.current?.click()}
              className="flex items-center gap-1.5"
            >
              {isPending && <Spinner size={13} />}
              {isPending
                ? "Subiendo..."
                : status === "pending_upload" || expired
                ? "Subir"
                : "Reemplazar"}
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
