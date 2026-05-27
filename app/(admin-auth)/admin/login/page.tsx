import { signInEmployee } from "@/app/(auth)/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

  return (
    <div className="space-y-4">
      <p className="text-sm text-center text-slate-400 mb-6">
        Accede con tu cuenta institucional
      </p>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form action={signInEmployee} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-slate-200">
            Correo electrónico
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="nombre@payefy.com"
            autoComplete="email"
            required
            className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 focus-visible:ring-emerald-500"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className="text-slate-200">
            Contraseña
          </Label>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="••••••••"
            autoComplete="current-password"
            required
            minLength={8}
            className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 focus-visible:ring-emerald-500"
          />
        </div>

        <Button
          type="submit"
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          Acceder
        </Button>
      </form>
    </div>
  )
}
