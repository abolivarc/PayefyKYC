"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import {
  submitApplication,
  resendExpedienteEmail,
} from "@/app/(client)/applications/actions"

interface Props {
  applicationId: string
  allRequiredUploaded: boolean
  alreadySubmitted: boolean
}

export function SubmitApplicationButton({
  applicationId,
  allRequiredUploaded,
  alreadySubmitted,
}: Props) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{
    error?: string
    success?: boolean
  } | null>(null)
  const [resending, setResending] = useState(false)
  const [resendResult, setResendResult] = useState<{
    error?: string
    success?: boolean
  } | null>(null)

  async function handleResend() {
    setResending(true)
    setResendResult(null)
    const res = await resendExpedienteEmail(applicationId)
    setResendResult(res)
    setResending(false)
  }

  if (alreadySubmitted) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-emerald-700 font-medium">
          ✓ Expediente enviado para revisión
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={handleResend}
          disabled={resending}
          className="flex items-center gap-1.5"
        >
          {resending && <Spinner size={13} />}
          {resending ? "Reenviando…" : "Reenviar por correo"}
        </Button>
        {resendResult?.success && (
          <p className="text-xs text-emerald-700">
            ✓ Correo reenviado al equipo de revisión.
          </p>
        )}
        {resendResult?.error && (
          <p className="text-xs text-destructive">
            No se pudo reenviar: {resendResult.error}
          </p>
        )}
      </div>
    )
  }

  async function handleSubmit() {
    setLoading(true)
    const res = await submitApplication(applicationId)
    setResult(res)
    setLoading(false)
  }

  return (
    <div className="space-y-2">
      {result?.error && (
        <p className="text-sm text-destructive">{result.error}</p>
      )}
      <Button
        onClick={handleSubmit}
        disabled={!allRequiredUploaded || loading}
        className="w-full sm:w-auto"
      >
        {loading && <Spinner size={14} />}
        {loading ? "Enviando..." : "Enviar expediente para revisión"}
      </Button>
      {!allRequiredUploaded && (
        <p className="text-xs text-muted-foreground">
          Sube todos los documentos requeridos para habilitar el envío.
        </p>
      )}
    </div>
  )
}
