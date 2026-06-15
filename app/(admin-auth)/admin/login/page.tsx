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
      <p className="text-sm text-center mb-6" style={{ color: "rgba(255,255,255,0.5)" }}>
        Accede con tu cuenta institucional
      </p>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form action={signInEmployee} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-white/80">
            Correo electrónico
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="nombre@payefy.com"
            autoComplete="email"
            required
            style={{ background: "rgba(255,255,255,0.08)", borderColor: "rgba(255,255,255,0.15)", color: "#fff" }}
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
            placeholder="••••••••"
            autoComplete="current-password"
            required
            minLength={8}
            style={{ background: "rgba(255,255,255,0.08)", borderColor: "rgba(255,255,255,0.15)", color: "#fff" }}
            className="placeholder:text-white/30 focus-visible:ring-[#AEFF99]"
          />
        </div>

        <Button
          type="submit"
          className="w-full font-semibold"
          style={{ background: "#AEFF99", color: "#004238" }}
        >
          Acceder
        </Button>
      </form>
    </div>
  )
}
