"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { changeOwnPassword, keepCurrentPassword } from "./actions"

const darkInput = {
  background: "rgba(255,255,255,0.08)",
  borderColor: "rgba(255,255,255,0.15)",
  color: "#fff",
} as const

export function ChangePasswordForm() {
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const valid = password.length >= 8 && password === confirm

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.")
      return
    }
    if (password !== confirm) {
      setError("Las contraseñas no coinciden.")
      return
    }
    startTransition(async () => {
      const result = await changeOwnPassword(password)
      // Si no hubo redirect, hubo error
      if (result?.error) setError(result.error)
    })
  }

  function handleKeep() {
    setError(null)
    startTransition(async () => {
      const result = await keepCurrentPassword()
      if (result?.error) setError(result.error)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="new-password" className="text-white/80">
          Nueva contraseña
        </Label>
        <Input
          id="new-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          minLength={8}
          required
          disabled={isPending}
          style={darkInput}
          className="placeholder:text-white/30 focus-visible:ring-[#AEFF99]"
        />
        <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
          Mínimo 8 caracteres.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirm-password" className="text-white/80">
          Confirma la contraseña
        </Label>
        <Input
          id="confirm-password"
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
          minLength={8}
          required
          disabled={isPending}
          style={darkInput}
          className="placeholder:text-white/30 focus-visible:ring-[#AEFF99]"
        />
      </div>

      {error && (
        <p className="text-sm" style={{ color: "#FCA5A5" }} role="alert">
          {error}
        </p>
      )}

      <Button
        type="submit"
        disabled={!valid || isPending}
        className="w-full font-semibold flex items-center gap-2"
        style={{ background: "#AEFF99", color: "#004238" }}
      >
        {isPending && <Spinner size={14} />}
        {isPending ? "Guardando…" : "Guardar contraseña nueva"}
      </Button>

      <button
        type="button"
        onClick={handleKeep}
        disabled={isPending}
        className="w-full text-center text-sm py-2 rounded-md transition-colors"
        style={{ color: "rgba(255,255,255,0.5)" }}
      >
        Conservar mi contraseña actual
      </button>
    </form>
  )
}
