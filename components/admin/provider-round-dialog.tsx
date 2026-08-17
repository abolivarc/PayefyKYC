"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { Plus, X, Send } from "lucide-react"
import { registerProviderRound } from "@/app/(admin)/applications/actions"
import { ChangeImagesPicker } from "@/components/admin/change-images-picker"
import type { ChangeImageInput } from "@/lib/documents/change-request-images"

export interface RoundDocOption {
  id: string
  name: string
  version: number
  hasFile: boolean
}

interface Props {
  applicationId: string
  companyName: string
  /** Documentos actuales del expediente, para marcar cuáles rechazó el proveedor */
  docs: RoundDocOption[]
}

/**
 * Registrar una respuesta del proveedor (Transfer): pegar sus comentarios,
 * marcar qué documentos rechazó y listar los nuevos que pide. Un solo correo
 * al cliente — sin mencionar al proveedor.
 */
export function ProviderRoundButton({ applicationId, companyName, docs }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [comments, setComments] = useState("")
  const [rejected, setRejected] = useState<Set<string>>(new Set())
  const [newDocs, setNewDocs] = useState<string[]>([])
  const [images, setImages] = useState<ChangeImageInput[]>([])
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [isPending, startTransition] = useTransition()

  function toggle(id: string) {
    setRejected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const res = await registerProviderRound(
        applicationId,
        comments,
        [...rejected],
        newDocs,
        images
      )
      if (res.error) setError(res.error)
      else {
        setSent(true)
        router.refresh()
      }
    })
  }

  function reset() {
    setOpen(false)
    setSent(false)
    setComments("")
    setRejected(new Set())
    setNewDocs([])
    setImages([])
    setError(null)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="transition-all"
        style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "8px 14px", fontSize: 13, fontWeight: 600,
          borderRadius: 9, cursor: "pointer",
          background: "#FDF1E6", border: "1px solid #F5D9B5", color: "#C9772F",
        }}
      >
        <Send className="h-3.5 w-3.5" />
        Respuesta del proveedor
      </button>

      <Dialog open={open} onClose={reset} className="max-w-2xl">
        {sent ? (
          <div className="space-y-3 py-4 text-center">
            <p className="text-lg font-semibold text-foreground">Ronda registrada ✓</p>
            <p className="text-sm text-muted-foreground">
              El cliente ya recibió el correo con los cambios y los casilleros
              nuevos aparecen en su documentación adicional.
            </p>
            <Button onClick={reset}>Cerrar</Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Respuesta del proveedor — {companyName}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="round-comments">Comentarios (se reenvían al cliente tal cual)</Label>
                <Textarea
                  id="round-comments"
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  rows={5}
                  placeholder={"Pega aquí las observaciones que te respondieron.\nEl cliente NO verá quién las originó — le llegan como revisión de Payefy."}
                  required
                  disabled={isPending}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Documentos existentes que rechazaron</Label>
                <div className="max-h-44 space-y-0.5 overflow-y-auto rounded-lg border border-border p-2">
                  {docs.filter((d) => d.hasFile).map((d) => (
                    <label
                      key={d.id}
                      className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-secondary"
                    >
                      <input
                        type="checkbox"
                        checked={rejected.has(d.id)}
                        onChange={() => toggle(d.id)}
                        disabled={isPending}
                      />
                      <span className="flex-1">{d.name}</span>
                      <span className="text-[10px] font-bold text-muted-foreground">
                        {d.version > 1 ? `v${d.version}` : "v1"}
                      </span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Los marcados pasan a &ldquo;con observaciones&rdquo; y el cliente debe resubirlos.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label>Documentos NUEVOS que piden (no existen en el expediente)</Label>
                {newDocs.map((t, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      value={t}
                      onChange={(e) =>
                        setNewDocs((prev) => prev.map((x, j) => (j === i ? e.target.value : x)))
                      }
                      placeholder="Ej: CSF actualizada del representante legal"
                      disabled={isPending}
                      className="h-9 flex-1 rounded-md border border-border bg-card px-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
                    />
                    <button
                      type="button"
                      aria-label="Quitar"
                      onClick={() => setNewDocs((prev) => prev.filter((_, j) => j !== i))}
                      disabled={isPending}
                      className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-secondary"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setNewDocs((prev) => [...prev, ""])}
                  disabled={isPending}
                  className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Agregar documento solicitado
                </button>
                <p className="text-xs text-muted-foreground">
                  Cada uno crea un casillero con nombre en la documentación adicional del
                  cliente y cuenta para su porcentaje de avance.
                </p>
              </div>

              <ChangeImagesPicker images={images} onChange={setImages} disabled={isPending} />

              {error && (
                <p className="text-sm text-destructive" role="alert">{error}</p>
              )}

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={reset} disabled={isPending}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isPending || !comments.trim()}>
                  {isPending && <Spinner size={13} />}
                  {isPending ? "Enviando…" : "Registrar y avisar al cliente"}
                </Button>
              </div>
            </form>
          </>
        )}
      </Dialog>
    </>
  )
}
