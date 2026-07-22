"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"

function adminDb() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// Verifica la contraseña actual sin tocar las cookies de sesión:
// usa un cliente desechable con la anon key (sin persistencia).
async function verifyCurrentPassword(email: string, password: string) {
  const throwaway = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
  const { error } = await throwaway.auth.signInWithPassword({ email, password })
  return !error
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// ─────────────────────────────────────
// Cambiar correo de la cuenta
// ─────────────────────────────────────
export async function changeAccountEmail(
  currentPassword: string,
  newEmail: string
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user?.email) return { error: "No autenticado" }

  const email = newEmail.trim().toLowerCase()
  if (!EMAIL_RE.test(email)) return { error: "Correo inválido" }
  if (email === user.email.toLowerCase()) {
    return { error: "El correo nuevo es igual al actual" }
  }

  const ok = await verifyCurrentPassword(user.email, currentPassword)
  if (!ok) return { error: "La contraseña actual es incorrecta" }

  const admin = adminDb()

  // Cambio inmediato vía service role (sin correos de confirmación,
  // que dependen de un canal de email operativo)
  const { error: authErr } = await admin.auth.admin.updateUserById(user.id, {
    email,
    email_confirm: true,
  })
  if (authErr) {
    if (/already|registered|exists/i.test(authErr.message)) {
      return { error: "Ese correo ya está registrado en otra cuenta" }
    }
    return { error: authErr.message }
  }

  // Mantener profiles.email en sincronía
  await admin.from("profiles").update({ email }).eq("id", user.id)

  revalidatePath("/profile")
  revalidatePath("/admin/perfil")
  return { success: true, email }
}

// ─────────────────────────────────────
// Cambiar contraseña de la cuenta
// ─────────────────────────────────────
export async function changeAccountPassword(
  currentPassword: string,
  newPassword: string
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user?.email) return { error: "No autenticado" }

  if (newPassword.length < 8) {
    return { error: "La contraseña nueva debe tener al menos 8 caracteres" }
  }
  if (newPassword === currentPassword) {
    return { error: "La contraseña nueva debe ser distinta a la actual" }
  }

  const ok = await verifyCurrentPassword(user.email, currentPassword)
  if (!ok) return { error: "La contraseña actual es incorrecta" }

  // Con el cliente de sesión para que las cookies queden al día
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) return { error: error.message }

  // Si venía marcado el flag de primer ingreso, ya no aplica
  await adminDb()
    .from("profiles")
    .update({ must_change_password: false })
    .eq("id", user.id)

  return { success: true }
}
