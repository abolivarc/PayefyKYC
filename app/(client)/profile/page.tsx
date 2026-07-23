import { createClient } from "@/lib/supabase/server"
import {
  ProfileInfoCard,
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
      <p className="text-sm text-muted-foreground -mt-3">
        Mantén tus datos al día: al correo de esta cuenta te llegarán las
        notificaciones y correcciones de tu expediente.
      </p>

      <ProfileInfoCard
        initialName={profile?.full_name ?? ""}
        initialPhone={profile?.phone ?? ""}
      />

      <ChangeEmailCard currentEmail={currentEmail} />
      <ChangePasswordCard />
    </div>
  )
}
