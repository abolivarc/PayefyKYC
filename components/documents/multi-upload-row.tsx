"use client"

import { useRef, useState, useTransition } from "react"
import { createClient } from "@/lib/supabase/client"
import {
  recordDocumentUpload,
  addExtraDocument,
} from "@/app/(client)/applications/actions"
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

    const supabase = createClient()
    const path = `${applicationId}/${activeDocId}/${file.name}`

    const { error: uploadErr } = await supabase.storage
      .from("kyc-documents")
      .upload(path, file, { upsert: true })

    if (uploadErr) {
      setError("Error al subir el archivo: " + uploadErr.message)
      return
    }

    startTransition(async () => {
      const result = await recordDocumentUpload(
        activeDocId,
        path,
        file.name,
        file.size,
        file.type
      )
      if (result?.error) {
        setError(result.error)
      } else {
        setDocs((prev) =>
          prev.map((d) =>
            d.id === activeDocId
              ? { ...d, status: "pending_review", fileName: file.name }
              : d
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
        setDocs((prev) => [
          ...prev,
          { id: result.documentId, status: "pending_upload", fileName: null },
        ])
      }
    })
  }

  return (
    <div className="py-3 border-b last:border-0">
      <div className="mb-2">
        <span className="text-sm font-medium">{templateName}</span>
        {templateInstructions && (
          <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
            {templateInstructions}
          </p>
        )}
      </div>

      <div className="space-y-2">
        {docs.map((doc, i) => {
          const badge = STATUS_BADGE[doc.status] ?? STATUS_BADGE.pending_upload
          return (
            <div key={doc.id} className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-6 shrink-0">
                #{i + 1}
              </span>
              <Badge variant={badge.variant} className="shrink-0">
                {badge.label}
              </Badge>
              {doc.fileName && (
                <span className="text-xs text-muted-foreground truncate flex-1">
                  {doc.fileName}
                </span>
              )}
              <Button
                size="sm"
                variant={doc.status === "pending_upload" ? "default" : "outline"}
                disabled={isPending}
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

      {error && <p className="text-xs text-destructive mt-2">{error}</p>}

      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="mt-2 text-xs"
        disabled={isPending}
        onClick={handleAddExtra}
      >
        + Agregar otro
      </Button>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  )
}
