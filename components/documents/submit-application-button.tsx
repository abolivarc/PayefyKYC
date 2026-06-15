"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { submitApplication } from "@/app/(client)/applications/actions"

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

  if (alreadySubmitted) {
    return (
      <p className="text-sm text-emerald-700 font-medium">
        ✓ Expediente enviado para revisión
      </p>
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
