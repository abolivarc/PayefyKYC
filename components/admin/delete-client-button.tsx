"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { deleteClient } from "@/app/(admin)/admin/clients/actions"

interface CompanyProps {
  companyId: string
  legalName: string
  taxId: string
}

/**
 * Diálogo de confirmación CONTROLADO desde fuera (open/onClose).
 * Necesario cuando el trigger vive dentro de un menú desplegable que se
 * desmonta al cerrarse (menú ⋯ de las tarjetas): el diálogo debe montarse
 * fuera de ese menú para sobrevivir al cierre.
 */
export function DeleteClientDialog({
  companyId,
  legalName,
  taxId,
  open,
  onClose,
}: CompanyProps & { open: boolean; onClose: () => void }) {
  const [rfcInput, setRfcInput] = useState("")
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setRfcInput("")
      setErrorMsg(null)
      const t = setTimeout(() => inputRef.current?.focus(), 80)
      return () => clearTimeout(t)
    }
  }, [open])

  function handleClose() {
    if (isPending) return
    onClose()
  }

  function handleConfirm() {
    if (rfcInput.trim().toUpperCase() !== taxId.toUpperCase()) {
      setErrorMsg("El RFC no coincide. Escríbelo exactamente para confirmar.")
      return
    }
    startTransition(async () => {
      const result = await deleteClient(companyId)
      if (result.error) {
        setErrorMsg(result.error)
      } else {
        onClose()
      }
    })
  }

  const confirmed = rfcInput.trim().toUpperCase() === taxId.toUpperCase()

  return (
    <Dialog open={open} onClose={handleClose}>
      <div className="space-y-4">
        <div>
          <h2 className="text-base font-semibold">Eliminar cliente</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Esta acción es permanente y no se puede deshacer.
          </p>
        </div>

        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
          <p className="font-medium text-destructive">
            ¿Eliminar definitivamente a{" "}
            <span className="font-bold">{legalName}</span>{" "}
            (<span className="font-mono">{taxId}</span>)?
          </p>
          <p className="mt-1 text-muted-foreground text-xs">
            Se eliminarán también sus solicitudes, documentos y cuenta de acceso.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="rfc-confirm">
            Escribe el RFC para confirmar:{" "}
            <span className="font-mono text-foreground">{taxId}</span>
          </Label>
          <Input
            ref={inputRef}
            id="rfc-confirm"
            value={rfcInput}
            onChange={(e) => {
              setRfcInput(e.target.value)
              setErrorMsg(null)
            }}
            placeholder={taxId}
            className="font-mono uppercase"
            disabled={isPending}
            onKeyDown={(e) => e.key === "Enter" && confirmed && handleConfirm()}
          />
        </div>

        {errorMsg && <p className="text-xs text-destructive">{errorMsg}</p>}

        <div className="flex gap-2 justify-end pt-1">
          <Button variant="outline" size="sm" onClick={handleClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={handleConfirm}
            disabled={!confirmed || isPending}
          >
            {isPending ? "Eliminando…" : "Eliminar definitivamente"}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}

/**
 * Botón autónomo (trigger + diálogo). Úsalo cuando el botón NO viva dentro
 * de un menú que se desmonta (p. ej. una fila de tabla).
 */
export function DeleteClientButton({ companyId, legalName, taxId }: CompanyProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="text-destructive border-destructive/40 hover:bg-destructive hover:text-white"
        onClick={() => setOpen(true)}
      >
        <Trash2 className="h-3.5 w-3.5 mr-1" />
        Eliminar
      </Button>

      <DeleteClientDialog
        companyId={companyId}
        legalName={legalName}
        taxId={taxId}
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  )
}
