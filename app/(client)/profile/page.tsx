import { createClient } from "@/lib/supabase/server"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import {
  ChangeEmailCard,
  ChangePasswordCard,
} from "@/components/account/account-security-forms"

export default async function ProfilePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return <p className="p-8 text-muted-foreground">Cargando sesión...</p>
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, phone")
    .eq("id", user.id)
    .single()

  const currentEmail = user.email ?? profile?.email ?? "—"

  return (
    <div className="p-6 sm:p-8 max-w-lg mx-auto space-y-5">
      <h1 className="text-xl font-bold">Mi perfil</h1>

      <Card>
        <CardHeader>
          <CardTitle>Información personal</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label className="text-muted-foreground text-xs">Nombre completo</Label>
            <p className="text-sm font-medium">{profile?.full_name || "—"}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-muted-foreground text-xs">Teléfono</Label>
            <p className="text-sm font-medium">{profile?.phone || "—"}</p>
          </div>
        </CardContent>
      </Card>

      <ChangeEmailCard currentEmail={currentEmail} />
      <ChangePasswordCard />
    </div>
  )
}
