"use client"

import { useState, useTransition } from "react"
import { createLead } from "@/app/(admin)/leads/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface Agent {
  id: string
  full_name: string | null
}

interface Props {
  agents: Agent[]
}

export function NewLeadForm({ agents }: Props) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await createLead(fd)
      if (result?.error) {
        setError(result.error)
      } else {
        setSuccess(true)
        ;(e.target as HTMLFormElement).reset()
        setTimeout(() => {
          setSuccess(false)
          setOpen(false)
        }, 2500)
      }
    })
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)}>
        + Nuevo lead
      </Button>
    )
  }

  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm space-y-4 max-w-lg">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-slate-900">Nuevo lead</h2>
        <button
          type="button"
          onClick={() => { setOpen(false); setError(null); setSuccess(false) }}
          className="text-slate-400 hover:text-slate-600 text-lg leading-none"
        >
          ✕
        </button>
      </div>

      {success && (
        <Alert className="border-emerald-200 bg-emerald-50 text-emerald-800">
          <AlertDescription>Lead creado y correo de invitación enviado.</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="lead_legal_name">Razón social *</Label>
          <Input
            id="lead_legal_name"
            name="legal_name"
            placeholder="Empresa Ejemplo S.A. de C.V."
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="lead_tax_id">
            RFC <span className="text-slate-400 font-normal">(opcional)</span>
          </Label>
          <Input
            id="lead_tax_id"
            name="tax_id"
            placeholder="EJE900101ABC"
            className="uppercase"
            maxLength={13}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="lead_contact_email">Correo de contacto del cliente *</Label>
          <Input
            id="lead_contact_email"
            name="contact_email"
            type="email"
            placeholder="cliente@empresa.com"
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="lead_product_code">Producto *</Label>
          <Select id="lead_product_code" name="product_code" required>
            <option value="">Selecciona un producto</option>
            <option value="cards">Tarjeta Payefy</option>
            <option value="terminals">Terminal TPV</option>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="lead_agent">Agente asignado</Label>
          <Select id="lead_agent" name="assigned_agent_id">
            <option value="">— Yo mismo —</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.full_name ?? a.id}
              </option>
            ))}
          </Select>
        </div>

        <div className="flex gap-2 pt-1">
          <Button type="submit" disabled={isPending} className="flex-1">
            {isPending ? "Enviando invitación..." : "Crear y enviar invitación"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => { setOpen(false); setError(null) }}
          >
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  )
}
