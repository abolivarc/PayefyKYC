"use client"

import { useState, useTransition } from "react"
import { createProductOrder } from "@/app/(client)/applications/[id]/orders/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"

interface Props {
  applicationId: string
  companyId: string
  productCode: string
  productName: string
}

export function ProductOrderForm({ applicationId, companyId, productCode, productName }: Props) {
  const [open, setOpen] = useState(false)
  const [quantity, setQuantity] = useState(1)
  const [address, setAddress] = useState("")
  const [notes, setNotes] = useState("")
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await createProductOrder({
        applicationId,
        companyId,
        productCode,
        quantity,
        shippingAddress: address,
        notes: notes || undefined,
      })
      if (result.error) {
        setError(result.error)
      } else {
        setSuccess(true)
        setOpen(false)
      }
    })
  }

  if (success) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
        ¡Pedido recibido! Nuestro equipo se pondrá en contacto contigo pronto.
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div>
        <h3 className="font-semibold text-sm">Solicitar {productName}</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Pide tus plásticos o terminales y te enviaremos la factura por correo.
        </p>
      </div>

      {!open ? (
        <Button size="sm" onClick={() => setOpen(true)} style={{ background: "#004238", color: "#AEFF99" }}>
          Solicitar ahora
        </Button>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="qty" className="text-xs">Cantidad</Label>
            <Input
              id="qty"
              type="number"
              min={1}
              max={500}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className="h-8 text-sm"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="addr" className="text-xs">Dirección de envío</Label>
            <Input
              id="addr"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Calle, Número, Colonia, CP, Ciudad"
              className="h-8 text-sm"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes" className="text-xs">Notas (opcional)</Label>
            <Input
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Instrucciones adicionales, horario, contacto..."
              className="h-8 text-sm"
            />
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <div className="flex gap-2">
            <Button
              type="submit"
              size="sm"
              disabled={isPending || !address.trim()}
              className="flex items-center gap-1.5"
              style={{ background: "#004238", color: "#AEFF99" }}
            >
              {isPending && <Spinner size={13} />}
              {isPending ? "Enviando..." : "Enviar pedido"}
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
