"use client"

import { useRef, useState, useTransition } from "react"
import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { deleteClient } from "@/app/(admin)/admin/clients/actions"

interface Props {
  companyId: string
  legalName: string
  taxId: string
}

export function DeleteClientButton({ companyId, legalName, taxId }: Props) {
  const [open, setOpen] = useState(false)
  const [rfcInput, setRfcInput] = useState("")
  const [toast, setToast] = useState<{ type: "ok" | "err"; msg: string } | null>(null)
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  function handleOpen() {
    setRfcInput("")
    setToast(null)
    setOpen(true)
    setTimeout(() => inputRef.current?.focus(), 80)
  }

  function handleClose() {
    if (isPending) return
    setOpen(false)
    setRfcInput("")
    setToast(null)
  }

  function handleConfirm() {
    if (rfcInput.trim().toUpperCase() !== taxId.toUpperCase()) {
      setToast({ type: "err", msg: "El RFC no coincide. Escríbelo exactamente para confirmar." })
      return
    }
    startTransition(async () => {
      const result = await deleteClient(companyId)
      if (result.error) {
        setToast({ type: "err", msg: result.error })
      } else {
        setOpen(false)
        setToast({ type: "ok", msg: `"${result.legalName}" eliminado correctamente.` })
        setTimeout(() => setToast(null), 4000)
      }
    })
  }

  const confirmed = rfcInput.trim().toUpperCase() === taxId.toUpperCase()

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="text-destructive border-destructive/40 hover:bg-destructive hover:text-white"
        onClick={handleOpen}
      >
        <Trash2 className="h-3.5 w-3.5 mr-1" />
        Eliminar
      </Button>

      {/* Toast flotante fuera del modal */}
      {toast && !open && (
        <div
          className={`fixed bottom-5 right-5 z-50 rounded-lg px-4 py-3 text-sm shadow-lg
            ${toast.type === "ok"
              ? "bg-green-600 text-white"
              : "bg-destructive text-white"
            }`}
        >
          {toast.msg}
        </div>
      )}

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
                setToast(null)
              }}
              placeholder={taxId}
              className="font-mono uppercase"
              disabled={isPending}
              onKeyDown={(e) => e.key === "Enter" && confirmed && handleConfirm()}
            />
          </div>

          {toast && (
            <p className="text-xs text-destructive">{toast.msg}</p>
          )}

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
    </>
  )
}
