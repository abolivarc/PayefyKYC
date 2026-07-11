import Link from "next/link"
import { requestAdminPasswordReset } from "@/app/(auth)/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default async function AdminForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>
}) {
  const { error, success } = await searchParams

  return (
    <div className="space-y-4">
      <p className="text-sm text-center mb-6" style={{ color: "rgba(255,255,255,0.5)" }}>
        Ingresa tu correo institucional y te enviaremos un enlace para restablecer tu contraseña.
      </p>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert style={{ background: "rgba(174,255,153,0.12)", border: "1px solid rgba(174,255,153,0.3)" }}>
          <AlertDescription style={{ color: "#AEFF99" }}>{success}</AlertDescription>
        </Alert>
      )}

      <form action={requestAdminPasswordReset} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-white/80">
            Correo electrónico
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="nombre@payefy.me"
            autoComplete="email"
            required
            style={{ background: "rgba(255,255,255,0.08)", borderColor: "rgba(255,255,255,0.15)", color: "#fff" }}
            className="placeholder:text-white/30 focus-visible:ring-[#AEFF99]"
          />
        </div>

        <Button
          type="submit"
          className="w-full font-semibold"
          style={{ background: "#AEFF99", color: "#004238" }}
        >
          Enviar enlace
        </Button>
      </form>

      <p className="text-center text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
        <Link href="/admin/login" className="hover:text-white/80 transition-colors">
          ← Regresar al inicio de sesión
        </Link>
      </p>
    </div>
  )
}
