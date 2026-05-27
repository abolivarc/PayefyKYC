import Link from "next/link"
import { signInClient } from "../actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>
}) {
  const { error, success } = await searchParams

  return (
    <div className="space-y-4">
      <p className="text-sm text-center text-muted-foreground mb-6">
        Inicia sesión en tu cuenta
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

      <form action={signInClient} className="space-y-4">
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
            placeholder="••••••••"
            autoComplete="current-password"
            required
            minLength={8}
          />
        </div>

        <Button type="submit" className="w-full">
          Iniciar sesión
        </Button>
      </form>

      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-muted-foreground">
          ¿No tienes cuenta?{" "}
          <Link
            href="/register"
            className="font-medium text-primary hover:underline"
          >
            Regístrate
          </Link>
        </p>
        <Link
          href="/forgot-password"
          className="text-sm text-muted-foreground hover:underline"
        >
          ¿Olvidaste tu contraseña?
        </Link>
      </div>
    </div>
  )
}
