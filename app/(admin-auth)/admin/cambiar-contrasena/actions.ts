"use server"

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"

function adminDb() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// Cambia la contraseña del usuario actual y limpia el flag de primer ingreso.
export async function changeOwnPassword(newPassword: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "No autenticado" }

  if (newPassword.length < 8) {
    return { error: "La contraseña debe tener al menos 8 caracteres" }
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) {
    // Supabase rechaza reutilizar la misma contraseña, entre otros casos
    return { error: error.message }
  }

  const { data: profile } = await adminDb()
    .from("profiles")
    .update({ must_change_password: false })
    .eq("id", user.id)
    .select("role")
    .single()

  // El agente comercial no tiene dashboard general
  redirect(
    (profile as unknown as { role?: string } | null)?.role === "sales_agent"
      ? "/admin/proposals"
      : "/admin/dashboard"
  )
}
