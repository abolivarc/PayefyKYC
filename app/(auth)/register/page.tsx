import Link from "next/link"
import { signUp } from "../actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

  return (
    <div className="space-y-4">
      <h1 className="sr-only">Crear cuenta — Payefy</h1>
      <p className="text-sm text-center text-muted-foreground mb-6">
        Crea tu cuenta para iniciar tu proceso KYC con Payefy.
      </p>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form action={signUp} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="fullName">Nombre completo</Label>
          <Input
            id="fullName"
            name="fullName"
            type="text"
            placeholder="Juan Pérez"
            autoComplete="name"
            required
            minLength={2}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Correo electrónico</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="tu@empresa.com"
            autoComplete="email"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Contraseña</Label>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="Mínimo 8 caracteres"
            autoComplete="new-password"
            required
            minLength={8}
          />
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed">
          Al crear tu cuenta aceptas nuestros{" "}
          <a
            href="/terminos-y-condiciones"
            target="_blank"
            rel="noopener"
            className="font-medium text-primary underline underline-offset-2"
          >
            Términos y Condiciones
          </a>{" "}
          y el tratamiento de tus datos conforme a nuestro{" "}
          <a
            href="/aviso-de-privacidad"
            target="_blank"
            rel="noopener"
            className="font-medium text-primary underline underline-offset-2"
          >
            Aviso de Privacidad
          </a>
          .
        </p>

        <Button type="submit" className="w-full">
          Crear cuenta
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Inicia sesión
        </Link>
      </p>
    </div>
  )
}
