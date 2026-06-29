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
    <div className="space-y-5">
      <div className="space-y-1 text-center">
        <h1 className="text-lg font-semibold tracking-tight text-foreground">
          Inicia sesión
        </h1>
        <p className="text-sm text-muted-foreground">
          Accede a tu expediente de onboarding
        </p>
      </div>

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
        <div className="space-y-1.5">
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

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Contraseña</Label>
            <Link
              href="/forgot-password"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              ¿Olvidaste la contraseña?
            </Link>
          </div>
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

        <Button type="submit" className="w-full mt-1">
          Iniciar sesión
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        ¿No tienes cuenta?{" "}
        <Link
          href="/register"
          className="font-medium text-primary hover:text-brand-hover transition-colors"
        >
          Regístrate
        </Link>
      </p>
    </div>
  )
}
