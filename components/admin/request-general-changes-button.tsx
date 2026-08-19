"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { Dialog, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { MessageSquarePlus } from "lucide-react"
import { requestGeneralChanges } from "@/app/(admin)/applications/actions"
import { ChangeImagesPicker } from "@/components/admin/change-images-picker"
import type { ChangeImageInput } from "@/lib/documents/change-request-images"

export interface ChangeDocOption {
  id: string
  name: string
  version: number
  hasFile: boolean
}

export function RequestGeneralChangesButton({
  applicationId,
  companyName,
  docs = [],
}: {
  applicationId: string
  companyName: string
  /** Documentos del expediente, para marcar cuáles requieren corrección */
  docs?: ChangeDocOption[]
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [notes, setNotes] = useState("")
  const [rejected, setRejected] = useState<Set<string>>(new Set())
  const [images, setImages] = useState<ChangeImageInput[]>([])
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const res = await requestGeneralChanges(applicationId, notes, images, [...rejected])
      if (res.error) {
        setError(res.error)
      } else {
        setSent(true)
        setNotes("")
        setRejected(new Set())
        setOpen(false)
        router.refresh()
        setTimeout(() => setSent(false), 6000)
      }
    })
  }

  return (
    <>
      <div className="flex items-center gap-3 flex-wrap">
        {sent && (
          <span className="text-sm text-emerald-700">
            ✓ Mensaje enviado al cliente
          </span>
        )}
        <Button
          onClick={() => setOpen(true)}
          className="flex items-center gap-1.5"
          style={{ background: "#004238", color: "#AEFF99" }}
        >
          <MessageSquarePlus className="h-4 w-4" />
          Solicitar cambios en general
        </Button>
      </div>

      {open && (
        <Dialog open onClose={() => setOpen(false)} className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Solicitar cambios en general</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mb-4">
            Escribe un mensaje sobre el expediente completo de{" "}
            <strong>{companyName}</strong>. Le llegará por correo y lo verá en
            su portal. Los documentos que hayas rechazado se listan
            automáticamente en el mismo mensaje.
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="general-notes">Mensaje para el cliente</Label>
              <Textarea
                id="general-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={7}
                placeholder={
                  "Ej. Hola, revisamos tu expediente y necesitamos que corrijas lo siguiente:\n\n1. El acta constitutiva no es la versión actualizada.\n2. La razón social del comprobante de domicilio no coincide con tu CSF.\n\nEn cuanto lo subas seguimos con tu alta."
                }
                required
                disabled={isPending}
              />
              <p className="text-xs text-muted-foreground">
                El expediente pasará a &ldquo;Cambios solicitados&rdquo;.
              </p>
            </div>
            {/* Marcar aquí los archivos que requieren corrección: quedan en
                ROJO para el cliente, bajan su % y se listan solos en el correo */}
            {docs.filter((doc) => doc.hasFile).length > 0 && (
              <div className="space-y-1.5">
                <Label>Archivos que requieren corrección</Label>
                <div className="max-h-44 space-y-0.5 overflow-y-auto rounded-lg border border-border p-2">
                  {docs.filter((doc) => doc.hasFile).map((doc) => (
                    <label
                      key={doc.id}
                      className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-secondary"
                    >
                      <input
                        type="checkbox"
                        checked={rejected.has(doc.id)}
                        onChange={() =>
                          setRejected((prev) => {
                            const next = new Set(prev)
                            if (next.has(doc.id)) next.delete(doc.id)
                            else next.add(doc.id)
                            return next
                          })
                        }
                        disabled={isPending}
                      />
                      <span className="flex-1">{doc.name}</span>
                      <span className="text-[10px] font-bold text-muted-foreground">
                        v{doc.version}
                      </span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Los marcados pasan a &ldquo;con observaciones&rdquo; (rojo), bajan el
                  porcentaje del cliente y se listan automáticamente en el correo.
                </p>
              </div>
            )}

            {/* Capturas: van en el correo y en el portal del cliente */}
            <ChangeImagesPicker images={images} onChange={setImages} disabled={isPending} />
            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isPending || !notes.trim()}
                className="flex items-center gap-1.5"
                style={{ background: "#004238", color: "#AEFF99" }}
              >
                {isPending && <Spinner size={13} />}
                {isPending ? "Enviando…" : "Enviar al cliente"}
              </Button>
            </div>
          </form>
        </Dialog>
      )}
    </>
  )
}
