"use client"

import { useState, useTransition, useRef } from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import { sendOrderInvoice, updateOrderStatus } from "@/app/(admin)/admin/tracking/actions"

const STATUS_LABELS: Record<string, string> = {
  requested: "Solicitado",
  invoiced: "Facturado",
  shipped: "Enviado",
  closed: "Cerrado",
}

const STATUS_VARIANT: Record<string, "pending" | "warning" | "success" | "destructive"> = {
  requested: "warning",
  invoiced: "pending",
  shipped: "success",
  closed: "success",
}

type Order = {
  id: string
  product_code: string
  quantity: number
  shipping_address: string
  notes: string | null
  status: string
  created_at: string
  companies: unknown
  applications: unknown
}

function OrderRow({ order }: { order: Order }) {
  const [status, setStatus] = useState(order.status)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const company = (order.companies as { legal_name: string; operator_email: string | null } | null)
  const clientEmail = company?.operator_email ?? ""

  function handleStatusChange(newStatus: "shipped" | "closed") {
    setError(null)
    startTransition(async () => {
      const result = await updateOrderStatus(order.id, newStatus)
      if (result.error) {
        setError(result.error)
      } else {
        setStatus(newStatus)
      }
    })
  }

  function handleSendInvoice(file?: File) {
    setError(null)
    startTransition(async () => {
      let base64: string | undefined
      let filename: string | undefined

      if (file) {
        const buffer = await file.arrayBuffer()
        const bytes = new Uint8Array(buffer)
        let binary = ""
        for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i])
        base64 = btoa(binary)
        filename = file.name
      }

      const result = await sendOrderInvoice({
        orderId: order.id,
        clientEmail,
        invoiceBase64: base64,
        invoiceFilename: filename,
      })

      if (result.error) {
        setError(result.error)
      } else {
        setStatus("invoiced")
        setSent(true)
      }
    })
  }

  return (
    <tr className="border-b hover:bg-gray-50">
      <td className="py-3 px-4">
        <p className="text-sm font-medium">{company?.legal_name ?? "—"}</p>
        <p className="text-xs text-muted-foreground">{clientEmail || "sin email"}</p>
      </td>
      <td className="py-3 px-4 text-sm">{order.product_code}</td>
      <td className="py-3 px-4 text-sm text-center">{order.quantity}</td>
      <td className="py-3 px-4 text-sm max-w-[200px] truncate">{order.shipping_address}</td>
      <td className="py-3 px-4 text-xs text-muted-foreground">
        {format(new Date(order.created_at), "dd MMM yyyy", { locale: es })}
      </td>
      <td className="py-3 px-4">
        <Badge variant={STATUS_VARIANT[status] ?? "pending"}>{STATUS_LABELS[status] ?? status}</Badge>
      </td>
      <td className="py-3 px-4">
        <div className="flex flex-col gap-1">
          {/* requested → invoiced: enviar factura */}
          {status === "requested" && !sent && (
            <>
              <input
                ref={fileRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleSendInvoice(file)
                }}
              />
              <Button
                size="sm"
                variant="outline"
                disabled={isPending || !clientEmail}
                onClick={() => fileRef.current?.click()}
                className="flex items-center gap-1.5 text-xs"
                title={!clientEmail ? "Sin email de contacto" : "Adjuntar PDF y enviar"}
              >
                {isPending && <Spinner size={12} />}
                {isPending ? "Enviando..." : "Enviar factura (PDF)"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={isPending || !clientEmail}
                onClick={() => handleSendInvoice()}
                className="text-xs text-muted-foreground"
              >
                Enviar sin adjunto
              </Button>
            </>
          )}

          {/* invoiced → shipped */}
          {status === "invoiced" && (
            <Button
              size="sm"
              variant="outline"
              disabled={isPending}
              onClick={() => handleStatusChange("shipped")}
              className="text-xs"
            >
              {isPending && <Spinner size={12} />}
              {isPending ? "Guardando…" : "Marcar enviado"}
            </Button>
          )}

          {/* shipped → closed */}
          {status === "shipped" && (
            <Button
              size="sm"
              variant="ghost"
              disabled={isPending}
              onClick={() => handleStatusChange("closed")}
              className="text-xs text-muted-foreground"
            >
              {isPending && <Spinner size={12} />}
              {isPending ? "Guardando…" : "Cerrar pedido"}
            </Button>
          )}

          {status === "closed" && (
            <span className="text-xs text-muted-foreground">Completado</span>
          )}

          {sent && status === "requested" && (
            <span className="text-xs text-green-700 font-medium">Factura enviada ✓</span>
          )}

          {error && <p className="text-xs text-destructive mt-1">{error}</p>}
        </div>
      </td>
    </tr>
  )
}

export function OrdersTable({ orders }: { orders: Order[] }) {
  if (orders.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
        No hay pedidos aún.
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-card overflow-x-auto">
      <table className="w-full min-w-[700px]">
        <thead>
          <tr className="border-b bg-gray-50 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            <th className="text-left py-2.5 px-4">Empresa</th>
            <th className="text-left py-2.5 px-4">Producto</th>
            <th className="text-center py-2.5 px-4">Qty</th>
            <th className="text-left py-2.5 px-4">Dirección</th>
            <th className="text-left py-2.5 px-4">Fecha</th>
            <th className="text-left py-2.5 px-4">Estado</th>
            <th className="text-left py-2.5 px-4">Acción</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <OrderRow key={o.id} order={o} />
          ))}
        </tbody>
      </table>
    </div>
  )
}
