import { updatePassword } from "../actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

  return (
    <div className="space-y-4">
      <p className="text-sm text-center text-muted-foreground mb-6">
        Elige una contraseña segura de al menos 8 caracteres.
      </p>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form action={updatePassword} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="password">Nueva contraseña</Label>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="••••••••"
            autoComplete="new-password"
            required
            minLength={8}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm_password">Confirmar contraseña</Label>
          <Input
            id="confirm_password"
            name="confirm_password"
            type="password"
            placeholder="••••••••"
            autoComplete="new-password"
            required
            minLength={8}
          />
        </div>

        <Button type="submit" className="w-full">
          Guardar contraseña
        </Button>
      </form>
    </div>
  )
}
