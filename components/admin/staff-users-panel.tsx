"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { UserPlus, KeyRound } from "lucide-react"
import { ROLE_LABELS, ASSIGNABLE_ROLES } from "@/lib/auth/roles"
import {
  createStaffUser,
  updateStaffRole,
  setStaffActive,
  resetStaffPassword,
} from "@/app/(admin)/admin/usuarios/actions"

export interface StaffRow {
  id: string
  email: string | null
  full_name: string | null
  role: string
  is_active: boolean
  must_change_password: boolean | null
  created_at: string
}

type Feedback = { type: "ok" | "err"; msg: string } | null

export function StaffUsersPanel({
  users,
  currentUserId,
}: {
  users: StaffRow[]
  currentUserId: string
}) {
  const [creating, setCreating] = useState(false)
  const [resetFor, setResetFor] = useState<StaffRow | null>(null)
  const [feedback, setFeedback] = useState<Feedback>(null)

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        {feedback ? (
          <p
            className={`text-sm ${feedback.type === "ok" ? "text-emerald-700" : "text-destructive"}`}
            role="alert"
          >
            {feedback.type === "ok" ? "✓ " : ""}
            {feedback.msg}
          </p>
        ) : (
          <span />
        )}
        <Button
          onClick={() => setCreating(true)}
          style={{ background: "#004238", color: "#AEFF99" }}
          className="flex items-center gap-1.5"
        >
          <UserPlus className="h-4 w-4" />
          Nuevo usuario
        </Button>
      </div>

      <div style={{ background: "var(--admin-surface, #fff)", border: "1px solid var(--admin-border, #E7ECF1)", borderRadius: 16, boxShadow: "0 1px 2px rgba(16,30,45,.05)", overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--admin-surface-2, #FBFCFD)", borderBottom: "1px solid var(--admin-border, #E7ECF1)" }}>
                {["Usuario", "Rol", "Estado", "Acceso", ""].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "12px 16px", fontSize: 11, fontWeight: 600, letterSpacing: ".05em", textTransform: "uppercase", color: "var(--admin-text-subtle, #8A99A8)", whiteSpace: "nowrap" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <StaffRowItem
                  key={u.id}
                  user={u}
                  isSelf={u.id === currentUserId}
                  onFeedback={setFeedback}
                  onReset={() => setResetFor(u)}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {creating && (
        <CreateUserDialog
          onClose={() => setCreating(false)}
          onFeedback={setFeedback}
        />
      )}
      {resetFor && (
        <ResetPasswordDialog
          user={resetFor}
          onClose={() => setResetFor(null)}
          onFeedback={setFeedback}
        />
      )}
    </div>
  )
}

function StaffRowItem({
  user,
  isSelf,
  onFeedback,
  onReset,
}: {
  user: StaffRow
  isSelf: boolean
  onFeedback: (f: Feedback) => void
  onReset: () => void
}) {
  const [isPending, startTransition] = useTransition()

  const handleRole = (role: string) => {
    startTransition(async () => {
      const res = await updateStaffRole(user.id, role)
      onFeedback(
        res.error
          ? { type: "err", msg: res.error }
          : { type: "ok", msg: `Rol actualizado para ${user.full_name ?? user.email}` }
      )
    })
  }

  const handleActive = () => {
    startTransition(async () => {
      const res = await setStaffActive(user.id, !user.is_active)
      onFeedback(
        res.error
          ? { type: "err", msg: res.error }
          : {
              type: "ok",
              msg: user.is_active
                ? `${user.full_name ?? user.email} fue desactivado`
                : `${user.full_name ?? user.email} fue reactivado`,
            }
      )
    })
  }

  return (
    <tr style={{ borderBottom: "1px solid var(--admin-border, #E7ECF1)", opacity: isPending ? 0.5 : user.is_active ? 1 : 0.6 }}>
      <td style={{ padding: "13px 16px", verticalAlign: "middle" }}>
        <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: "var(--admin-text, #0F1B2A)" }}>
          {user.full_name ?? "—"}
          {isSelf && (
            <span style={{ fontSize: 11, fontWeight: 500, color: "var(--admin-text-subtle, #8A99A8)" }}> (tú)</span>
          )}
        </p>
        <p style={{ margin: 0, fontSize: 12, color: "var(--admin-text-subtle, #8A99A8)" }}>
          {user.email ?? "—"}
        </p>
      </td>
      <td style={{ padding: "13px 16px", verticalAlign: "middle" }}>
        {isSelf ? (
          <Badge variant="outline" className="text-xs">
            {ROLE_LABELS[user.role] ?? user.role}
          </Badge>
        ) : (
          <Select
            value={user.role}
            onChange={(e) => handleRole(e.target.value)}
            className="h-8 text-xs w-[165px]"
            disabled={isPending}
          >
            {ASSIGNABLE_ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </Select>
        )}
      </td>
      <td style={{ padding: "13px 16px", verticalAlign: "middle" }}>
        <Badge variant={user.is_active ? "success" : "destructive"} className="text-xs">
          {user.is_active ? "Activo" : "Desactivado"}
        </Badge>
      </td>
      <td style={{ padding: "13px 16px", verticalAlign: "middle", fontSize: 12, color: "var(--admin-text-muted, #5A6B7B)" }}>
        {user.must_change_password ? "Contraseña temporal" : "Contraseña propia"}
      </td>
      <td style={{ padding: "13px 16px", verticalAlign: "middle", textAlign: "right", whiteSpace: "nowrap" }}>
        <button
          type="button"
          onClick={onReset}
          disabled={isPending}
          className="text-xs font-semibold hover:underline"
          style={{ color: "#0B7A44", background: "none", border: "none", cursor: "pointer", marginRight: 14 }}
        >
          Reiniciar contraseña
        </button>
        {!isSelf && (
          <button
            type="button"
            onClick={handleActive}
            disabled={isPending}
            className="text-xs font-semibold hover:underline"
            style={{ color: user.is_active ? "#B91C1C" : "#0B7A44", background: "none", border: "none", cursor: "pointer" }}
          >
            {user.is_active ? "Desactivar" : "Reactivar"}
          </button>
        )}
      </td>
    </tr>
  )
}

function CreateUserDialog({
  onClose,
  onFeedback,
}: {
  onClose: () => void
  onFeedback: (f: Feedback) => void
}) {
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState<string>("sales_agent")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const res = await createStaffUser({ fullName, email, password, role })
      if (res.error) {
        setError(res.error)
      } else {
        onFeedback({
          type: "ok",
          msg: `Usuario creado. Comparte la contraseña temporal con ${email}; se le pedirá cambiarla al entrar.`,
        })
        onClose()
      }
    })
  }

  return (
    <Dialog open onClose={onClose}>
      <DialogHeader>
        <DialogTitle>Nuevo usuario del equipo</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="new-name">Nombre completo</Label>
          <Input
            id="new-name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Nombre y apellidos"
            required
            disabled={isPending}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="new-email">Correo</Label>
          <Input
            id="new-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nombre@payefy.me"
            required
            disabled={isPending}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="new-role">Rol</Label>
          <Select
            id="new-role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            disabled={isPending}
          >
            {ASSIGNABLE_ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </Select>
          {role === "sales_agent" && (
            <p className="text-xs text-muted-foreground">
              El agente solo verá sus propias propuestas, sus leads y el expediente
              de esos clientes (sin poder aprobar ni rechazar).
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="new-password">Contraseña temporal</Label>
          <Input
            id="new-password"
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mínimo 8 caracteres"
            minLength={8}
            required
            disabled={isPending}
          />
          <p className="text-xs text-muted-foreground">
            Se le pedirá cambiarla la primera vez que entre.
          </p>
        </div>
        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={isPending}
            style={{ background: "#004238", color: "#AEFF99" }}
            className="flex items-center gap-1.5"
          >
            {isPending && <Spinner size={13} />}
            Crear usuario
          </Button>
        </div>
      </form>
    </Dialog>
  )
}

function ResetPasswordDialog({
  user,
  onClose,
  onFeedback,
}: {
  user: StaffRow
  onClose: () => void
  onFeedback: (f: Feedback) => void
}) {
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const res = await resetStaffPassword(user.id, password)
      if (res.error) {
        setError(res.error)
      } else {
        onFeedback({
          type: "ok",
          msg: `Contraseña reiniciada para ${user.email}. Deberá cambiarla al entrar.`,
        })
        onClose()
      }
    })
  }

  return (
    <Dialog open onClose={onClose}>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <KeyRound className="h-4 w-4" />
          Reiniciar contraseña
        </DialogTitle>
      </DialogHeader>
      <p className="text-sm text-muted-foreground mb-3">
        Se asignará una contraseña temporal a{" "}
        <strong>{user.full_name ?? user.email}</strong> y se le pedirá cambiarla
        la próxima vez que entre.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="reset-password">Contraseña temporal</Label>
          <Input
            id="reset-password"
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mínimo 8 caracteres"
            minLength={8}
            required
            disabled={isPending}
          />
        </div>
        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={isPending}
            style={{ background: "#004238", color: "#AEFF99" }}
            className="flex items-center gap-1.5"
          >
            {isPending && <Spinner size={13} />}
            Reiniciar
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
