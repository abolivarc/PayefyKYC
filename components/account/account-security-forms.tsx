"use client"

import { useState, useTransition } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import {
  changeAccountEmail,
  changeAccountPassword,
  updateProfileInfo,
} from "@/app/(client)/profile/actions"

type Feedback = { type: "ok" | "err"; msg: string } | null

// ─── Datos personales (nombre y teléfono) ────────────────────────
export function ProfileInfoCard({
  initialName,
  initialPhone,
}: {
  initialName: string
  initialPhone: string
}) {
  const [name, setName] = useState(initialName)
  const [phone, setPhone] = useState(initialPhone)
  const [feedback, setFeedback] = useState<Feedback>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFeedback(null)
    startTransition(async () => {
      const res = await updateProfileInfo(name, phone)
      if (res.error) {
        setFeedback({ type: "err", msg: res.error })
      } else {
        setFeedback({ type: "ok", msg: "Datos actualizados correctamente." })
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Información personal</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="profile-name">Nombre completo</Label>
            <Input
              id="profile-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tu nombre y apellidos"
              autoComplete="name"
              required
              disabled={isPending}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="profile-phone">Teléfono</Label>
            <Input
              id="profile-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="55 1234 5678"
              autoComplete="tel"
              disabled={isPending}
            />
          </div>
          {feedback && (
            <p
              className={`text-sm ${feedback.type === "ok" ? "text-emerald-700" : "text-destructive"}`}
              role="alert"
            >
              {feedback.type === "ok" ? "✓ " : ""}
              {feedback.msg}
            </p>
          )}
          <Button
            type="submit"
            disabled={isPending || !name.trim()}
            className="flex items-center gap-1.5"
          >
            {isPending && <Spinner size={13} />}
            {isPending ? "Guardando…" : "Guardar datos"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

// ─── Cambiar correo ──────────────────────────────────────────────
export function ChangeEmailCard({ currentEmail }: { currentEmail: string }) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [feedback, setFeedback] = useState<Feedback>(null)
  const [shownEmail, setShownEmail] = useState(currentEmail)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFeedback(null)
    startTransition(async () => {
      const res = await changeAccountEmail(password, email)
      if (res.error) {
        setFeedback({ type: "err", msg: res.error })
      } else {
        setShownEmail(res.email ?? email)
        setEmail("")
        setPassword("")
        setFeedback({ type: "ok", msg: "Correo actualizado correctamente." })
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cambiar correo electrónico</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs">Correo actual</Label>
            <p className="text-sm font-medium">{shownEmail}</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-email">Correo nuevo</Label>
            <Input
              id="new-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nuevo@correo.com"
              autoComplete="email"
              required
              disabled={isPending}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email-current-password">Contraseña actual</Label>
            <Input
              id="email-current-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              disabled={isPending}
            />
            <p className="text-xs text-muted-foreground">
              Por seguridad, confirma tu contraseña para cambiar el correo.
            </p>
          </div>
          {feedback && (
            <p
              className={`text-sm ${feedback.type === "ok" ? "text-emerald-700" : "text-destructive"}`}
              role="alert"
            >
              {feedback.type === "ok" ? "✓ " : ""}
              {feedback.msg}
            </p>
          )}
          <Button
            type="submit"
            disabled={isPending || !email || !password}
            className="flex items-center gap-1.5"
          >
            {isPending && <Spinner size={13} />}
            {isPending ? "Guardando…" : "Actualizar correo"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

// ─── Cambiar contraseña ──────────────────────────────────────────
export function ChangePasswordCard() {
  const [current, setCurrent] = useState("")
  const [next, setNext] = useState("")
  const [confirm, setConfirm] = useState("")
  const [feedback, setFeedback] = useState<Feedback>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFeedback(null)
    if (next.length < 8) {
      setFeedback({ type: "err", msg: "La contraseña nueva debe tener al menos 8 caracteres." })
      return
    }
    if (next !== confirm) {
      setFeedback({ type: "err", msg: "Las contraseñas nuevas no coinciden." })
      return
    }
    startTransition(async () => {
      const res = await changeAccountPassword(current, next)
      if (res.error) {
        setFeedback({ type: "err", msg: res.error })
      } else {
        setCurrent("")
        setNext("")
        setConfirm("")
        setFeedback({ type: "ok", msg: "Contraseña actualizada correctamente." })
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cambiar contraseña</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="current-password">Contraseña actual</Label>
            <Input
              id="current-password"
              type="password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              autoComplete="current-password"
              required
              disabled={isPending}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="next-password">Contraseña nueva</Label>
            <Input
              id="next-password"
              type="password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
              disabled={isPending}
            />
            <p className="text-xs text-muted-foreground">Mínimo 8 caracteres.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm-next-password">Confirma la contraseña nueva</Label>
            <Input
              id="confirm-next-password"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
              disabled={isPending}
            />
          </div>
          {feedback && (
            <p
              className={`text-sm ${feedback.type === "ok" ? "text-emerald-700" : "text-destructive"}`}
              role="alert"
            >
              {feedback.type === "ok" ? "✓ " : ""}
              {feedback.msg}
            </p>
          )}
          <Button
            type="submit"
            disabled={isPending || !current || !next || !confirm}
            className="flex items-center gap-1.5"
          >
            {isPending && <Spinner size={13} />}
            {isPending ? "Guardando…" : "Actualizar contraseña"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
