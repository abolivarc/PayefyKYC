"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { updateApplicationStatus } from "@/app/(admin)/applications/actions"

const STATUS_LABELS: Record<string, string> = {
  in_compliance_review: "En revisión interna",
  changes_requested: "Solicitar cambios (compliance)",
  approved_compliance: "Aprobar (compliance)",
  in_provider_review: "Enviar a revisión del proveedor",
  provider_changes_requested: "Solicitar cambios (proveedor)",
  approved_provider: "Aprobar (proveedor)",
  contracts_pending: "Enviar contratos",
  contracts_signed: "Contratos firmados",
  activation_pending: "Activación pendiente",
  activated: "Activar",
  rejected: "Rechazar",
}

interface Props {
  applicationId: string
  currentStatus: string
  nextStatuses: string[]
}

export function StatusChangeForm({
  applicationId,
  nextStatuses,
}: Props) {
  const [selectedStatus, setSelectedStatus] = useState("")
  const [rejectionReason, setRejectionReason] = useState("")
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  function handleSubmit() {
    if (!selectedStatus) return
    setError(null)
    startTransition(async () => {
      const result = await updateApplicationStatus(
        applicationId,
        selectedStatus,
        selectedStatus === "rejected" ? rejectionReason : undefined
      )
      if (result?.error) {
        setError(result.error)
      } else {
        setSuccess(true)
      }
    })
  }

  if (success) {
    return (
      <p className="text-sm text-emerald-700 font-medium">
        ✓ Estado actualizado correctamente
      </p>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-3 items-end flex-wrap">
        <div className="space-y-1 flex-1 min-w-40">
          <Label htmlFor="next-status">Nuevo estado</Label>
          <Select
            id="next-status"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option value="">Selecciona un estado...</option>
            {nextStatuses.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s] ?? s}
              </option>
            ))}
          </Select>
        </div>
        <Button
          onClick={handleSubmit}
          disabled={!selectedStatus || isPending}
          size="sm"
        >
          {isPending ? "Aplicando..." : "Cambiar estado"}
        </Button>
      </div>

      {selectedStatus === "rejected" && (
        <div className="space-y-1">
          <Label htmlFor="rejection-reason">Motivo de rechazo</Label>
          <Textarea
            id="rejection-reason"
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="Explica por qué se rechaza la solicitud..."
            rows={3}
          />
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
