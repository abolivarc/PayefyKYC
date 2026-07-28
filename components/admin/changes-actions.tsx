"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { Mail, Download } from "lucide-react"
import {
  resendChangesSummary,
  exportChangesPdf,
} from "@/app/(admin)/admin/applications/[id]/changes/actions"

type Feedback = { type: "ok" | "err"; msg: string } | null

export function ChangesActions({
  applicationId,
  hasChanges,
}: {
  applicationId: string
  hasChanges: boolean
}) {
  const router = useRouter()
  const [feedback, setFeedback] = useState<Feedback>(null)
  const [exporting, setExporting] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleResend() {
    if (
      !confirm(
        "Se enviará al cliente un recordatorio por correo con las observaciones que siguen abiertas. ¿Continuar?"
      )
    )
      return
    setFeedback(null)
    startTransition(async () => {
      const res = await resendChangesSummary(applicationId)
      if (res.error) {
        setFeedback({ type: "err", msg: res.error })
      } else {
        setFeedback({ type: "ok", msg: `Recordatorio enviado a ${res.sentTo}` })
        router.refresh()
      }
    })
  }

  async function handleExport() {
    setFeedback(null)
    setExporting(true)
    try {
      const res = await exportChangesPdf(applicationId)
      if (res.error || !res.base64 || !res.filename) {
        setFeedback({ type: "err", msg: res.error ?? "Error al exportar" })
        return
      }
      const binary = atob(res.base64)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
      const blob = new Blob([bytes.buffer as ArrayBuffer], { type: "application/pdf" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = res.filename
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

  if (!hasChanges) return null

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {feedback && (
        <span
          className={`text-sm ${feedback.type === "ok" ? "text-emerald-700" : "text-destructive"}`}
          role="alert"
        >
          {feedback.type === "ok" ? "✓ " : ""}
          {feedback.msg}
        </span>
      )}
      <Button
        variant="outline"
        onClick={handleResend}
        disabled={isPending}
        className="flex items-center gap-1.5"
      >
        {isPending ? <Spinner size={13} /> : <Mail className="h-4 w-4" />}
        Reenviar por correo
      </Button>
      <Button
        variant="outline"
        onClick={handleExport}
        disabled={exporting}
        className="flex items-center gap-1.5"
      >
        {exporting ? <Spinner size={13} /> : <Download className="h-4 w-4" />}
        Exportar PDF
      </Button>
    </div>
  )
}
