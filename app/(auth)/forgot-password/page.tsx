import Link from "next/link"
import { requestPasswordReset } from "../actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>
}) {
  const { error, success } = await searchParams

  return (
    <div className="space-y-4">
      <p className="text-sm text-center text-muted-foreground mb-6">
        Ingresa tu correo y te enviaremos un enlace para restablecer tu
        contraseña.
      </p>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <form action={requestPasswordReset} className="space-y-4" noValidate>
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

        <Button type="submit" className="w-full">
          Enviar enlace
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        <Link href="/login" className="font-medium text-primary hover:underline">
          Regresar al inicio de sesión
        </Link>
      </p>
    </div>
  )
}
