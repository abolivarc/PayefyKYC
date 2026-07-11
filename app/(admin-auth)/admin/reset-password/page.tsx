import { updateAdminPassword } from "@/app/(auth)/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default async function AdminResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

  return (
    <div className="space-y-4">
      <p className="text-sm text-center mb-6" style={{ color: "rgba(255,255,255,0.5)" }}>
        Elige una nueva contraseña para tu cuenta institucional.
      </p>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form action={updateAdminPassword} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="password" className="text-white/80">
            Nueva contraseña
          </Label>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="Mínimo 8 caracteres"
            autoComplete="new-password"
            required
            minLength={8}
            style={{ background: "rgba(255,255,255,0.08)", borderColor: "rgba(255,255,255,0.15)", color: "#fff" }}
            className="placeholder:text-white/30 focus-visible:ring-[#AEFF99]"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm_password" className="text-white/80">
            Confirmar contraseña
          </Label>
          <Input
            id="confirm_password"
            name="confirm_password"
            type="password"
            placeholder="Repite la contraseña"
            autoComplete="new-password"
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
          Guardar nueva contraseña
        </Button>
      </form>
    </div>
  )
}
