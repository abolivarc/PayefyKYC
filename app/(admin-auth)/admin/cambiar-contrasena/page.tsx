import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ChangePasswordForm } from "./change-password-form"

export const metadata = { title: "Cambiar contraseña | Payefy Equipo" }

export default async function ChangePasswordPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/admin/login")

  return (
    <div className="space-y-4">
      <div className="text-center mb-2">
        <h2 className="text-lg font-semibold text-white">
          Configura tu contraseña
        </h2>
        <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.5)" }}>
          Tu cuenta se creó con una contraseña temporal. Te recomendamos
          establecer una nueva para proteger tu acceso.
        </p>
      </div>
      <ChangePasswordForm />
    </div>
  )
}
