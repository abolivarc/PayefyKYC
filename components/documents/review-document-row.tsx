"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import {
  approveDocument,
  requestDocumentChanges,
} from "@/app/(admin)/applications/actions"

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
  pending_upload: { label: "Sin subir", variant: "pending" },
  pending_review: { label: "En revisión", variant: "warning" },
  approved: { label: "Aprobado", variant: "success" },
  rejected: { label: "Rechazado", variant: "destructive" },
  changes_requested: { label: "Cambios solicitados", variant: "destructive" },
}

interface Props {
  documentId: string
  applicationId: string
  templateName: string
  isRequired: boolean
  currentStatus: DocStatus
  storageAvailable: boolean
  reviewerNotes?: string | null
}

export function ReviewDocumentRow({
  documentId,
  applicationId,
  templateName,
  isRequired,
  currentStatus,
  storageAvailable,
  reviewerNotes,
}: Props) {
  const [status, setStatus] = useState<DocStatus>(currentStatus)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [notes, setNotes] = useState("")
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const badge = STATUS_BADGE[status] ?? STATUS_BADGE.pending_review

  function handleApprove() {
    setError(null)
    startTransition(async () => {
      const result = await approveDocument(documentId, applicationId)
      if (result?.error) {
        setError(result.error)
      } else {
        setStatus("approved")
      }
    })
  }

  function handleRequestChanges() {
    if (!notes.trim()) return
    setError(null)
    startTransition(async () => {
      const result = await requestDocumentChanges(
        documentId,
        applicationId,
        notes.trim()
      )
      if (result?.error) {
        setError(result.error)
      } else {
        setStatus("changes_requested")
        setDialogOpen(false)
        setNotes("")
      }
    })
  }

  return (
    <div className="flex items-start gap-3 py-3 border-b last:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">{templateName}</span>
          {isRequired && (
            <span className="text-xs text-destructive">*requerido</span>
          )}
          <Badge variant={badge.variant}>{badge.label}</Badge>
        </div>
        {reviewerNotes && status === "changes_requested" && (
          <p className="text-xs text-amber-700 mt-1 bg-amber-50 rounded px-2 py-1">
            Nota: {reviewerNotes}
          </p>
        )}
        {error && (
          <p className="text-xs text-destructive mt-1">{error}</p>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {storageAvailable && (
          <a
            href={`/api/documents/${documentId}/view`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline"
          >
            Ver documento
          </a>
        )}
        {status === "pending_review" && (
          <>
            <Button
              size="sm"
              variant="outline"
              className="border-emerald-500 text-emerald-700 hover:bg-emerald-50"
              disabled={isPending}
              onClick={handleApprove}
            >
              {isPending ? "..." : "Aprobar"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-amber-500 text-amber-700 hover:bg-amber-50"
              disabled={isPending}
              onClick={() => setDialogOpen(true)}
            >
              Solicitar cambios
            </Button>
          </>
        )}
        {status === "approved" && (
          <Button
            size="sm"
            variant="ghost"
            className="text-xs text-muted-foreground"
            disabled={isPending}
            onClick={handleApprove}
          >
            Re-aprobar
          </Button>
        )}
      </div>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
        <DialogHeader>
          <DialogTitle>Solicitar cambios: {templateName}</DialogTitle>
        </DialogHeader>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Describe qué debe corregir o complementar el cliente..."
          rows={4}
          className="mt-2"
        />
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setDialogOpen(false)}
          >
            Cancelar
          </Button>
          <Button
            disabled={!notes.trim() || isPending}
            onClick={handleRequestChanges}
            className="bg-amber-600 hover:bg-amber-700"
          >
            {isPending ? "Enviando..." : "Enviar observaciones"}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}
