"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Pencil, Check, X } from "lucide-react"
import { Spinner } from "@/components/ui/spinner"
import { setInternalAlias } from "@/app/(admin)/admin/clients/actions"

interface Props {
  companyId: string
  alias: string | null
  /** "header" en la ficha de revisión, "inline" en la tarjeta del listado */
  variant?: "header" | "inline"
}

/**
 * Alias interno del comercio. Solo lo ve el equipo: sirve para saber que
 * "MENDIETA INGENIERIA" es el cliente que se presenta como Óscar.
 */
export function InternalAliasField({ companyId, alias, variant = "header" }: Props) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(alias ?? "")
  const [saved, setSaved] = useState(alias)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function guardar() {
    setError(null)
    startTransition(async () => {
      const res = await setInternalAlias(companyId, value)
      if (res.error) {
        setError(res.error)
        return
      }
      setSaved(res.alias ?? null)
      setEditing(false)
      router.refresh()
    })
  }

  function cancelar() {
    setValue(saved ?? "")
    setError(null)
    setEditing(false)
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        title="Alias interno — solo lo ve el equipo"
        className="group inline-flex items-center gap-1.5 rounded-full border border-dashed px-2.5 py-1 text-xs transition-colors hover:bg-secondary"
        style={{
          borderColor: saved ? "var(--admin-border, #E4ECE7)" : "#D7E2DB",
          color: saved ? "var(--admin-text, #0F2A22)" : "var(--admin-text-subtle, #8A9E94)",
          background: saved ? "var(--brand-tint, #F0FAF3)" : "transparent",
        }}
      >
        {saved ? (
          <>
            <span className="opacity-55">alias</span>
            <span className="font-semibold">{saved}</span>
          </>
        ) : (
          <span>+ Agregar alias</span>
        )}
        <Pencil className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-50" />
      </button>
    )
  }

  return (
    <span className="inline-flex flex-col gap-1">
      <span className="inline-flex items-center gap-1">
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") guardar()
            if (e.key === "Escape") cancelar()
          }}
          maxLength={80}
          placeholder="Ej: Óscar"
          disabled={isPending}
          className={`h-7 rounded-md border border-border bg-card px-2 text-xs outline-none focus:border-primary focus:ring-2 focus:ring-ring/30 ${
            variant === "header" ? "w-44" : "w-32"
          }`}
        />
        <button
          type="button"
          onClick={guardar}
          disabled={isPending}
          aria-label="Guardar alias"
          className="flex h-7 w-7 items-center justify-center rounded-md text-white"
          style={{ background: "#004238" }}
        >
          {isPending ? <Spinner size={12} /> : <Check className="h-3.5 w-3.5" />}
        </button>
        <button
          type="button"
          onClick={cancelar}
          disabled={isPending}
          aria-label="Cancelar"
          className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-secondary"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </span>
      {error && <span className="text-[11px] text-destructive">{error}</span>}
    </span>
  )
}
