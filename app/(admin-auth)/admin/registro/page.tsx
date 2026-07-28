import Link from "next/link"
import { signUpEmployee } from "@/app/(auth)/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"

export const metadata = { title: "Crear cuenta de equipo" }

const inputStyle = {
  background: "rgba(255,255,255,0.08)",
  borderColor: "rgba(255,255,255,0.15)",
  color: "#fff",
}

export default async function AdminRegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

  return (
    <div className="space-y-4">
      <p className="text-sm text-center mb-6" style={{ color: "rgba(255,255,255,0.5)" }}>
        Crea tu cuenta con tu correo <strong style={{ color: "#AEFF99" }}>@payefy.me</strong>
      </p>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form action={signUpEmployee} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="fullName" className="text-white/80">
            Nombre completo
          </Label>
          <Input
            id="fullName"
            name="fullName"
            type="text"
            placeholder="Nombre y apellidos"
            autoComplete="name"
            required
            style={inputStyle}
            className="placeholder:text-white/30 focus-visible:ring-[#AEFF99]"
          />
        </div>

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
            style={inputStyle}
            className="placeholder:text-white/30 focus-visible:ring-[#AEFF99]"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className="text-white/80">
            Contraseña
          </Label>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="Mínimo 8 caracteres"
            autoComplete="new-password"
            required
            minLength={8}
            style={inputStyle}
            className="placeholder:text-white/30 focus-visible:ring-[#AEFF99]"
          />
        </div>

        <Button
          type="submit"
          className="w-full font-semibold"
          style={{ background: "#AEFF99", color: "#004238" }}
        >
          Crear cuenta
        </Button>
      </form>

      <p className="text-xs text-center" style={{ color: "rgba(255,255,255,0.35)" }}>
        Tu cuenta se crea como <strong>agente comercial</strong>: podrás generar
        propuestas, dar de alta leads y dar seguimiento a tus propios clientes.
      </p>

      <p className="text-center text-sm pt-1" style={{ color: "rgba(255,255,255,0.4)" }}>
        ¿Ya tienes cuenta?{" "}
        <Link href="/admin/login" className="font-semibold hover:text-white/80 transition-colors" style={{ color: "#AEFF99" }}>
          Inicia sesión
        </Link>
      </p>
    </div>
  )
}
