"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { logAudit } from "@/lib/audit"
import { ASSIGNABLE_ROLES, type StaffRole } from "@/lib/auth/staff"

function adminDb() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/** Solo super_admin administra usuarios del equipo. */
async function requireSuperAdmin(): Promise<{ userId: string } | { error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "No autenticado" }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profile?.role !== "super_admin") {
    return { error: "Solo un Super Admin puede administrar usuarios" }
  }
  return { userId: user.id }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function createStaffUser(input: {
  fullName: string
  email: string
  password: string
  role: string
}): Promise<{ error?: string; success?: true }> {
  const auth = await requireSuperAdmin()
  if ("error" in auth) return { error: auth.error }

  const fullName = input.fullName.trim()
  const email = input.email.trim().toLowerCase()
  const role = input.role as StaffRole

  if (!fullName) return { error: "El nombre es obligatorio" }
  if (!EMAIL_RE.test(email)) return { error: "Correo inválido" }
  if (input.password.length < 8) {
    return { error: "La contraseña debe tener al menos 8 caracteres" }
  }
  if (!ASSIGNABLE_ROLES.includes(role)) return { error: "Rol inválido" }

  const admin = adminDb()

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
  })
  if (createErr) {
    if (/already|registered|exists|duplicate/i.test(createErr.message)) {
      return { error: "Ese correo ya está registrado en la plataforma" }
    }
    return { error: createErr.message }
  }

  // Perfil con cambio de contraseña obligatorio en el primer ingreso
  const { error: profileErr } = await admin.from("profiles").upsert({
    id: created.user.id,
    email,
    full_name: fullName,
    role,
    is_active: true,
    must_change_password: true,
  })
  if (profileErr) return { error: profileErr.message }

  await logAudit({
    actorId: auth.userId,
    action: "staff_user_created",
    entityType: "profile",
    entityId: created.user.id,
    metadata: { email, role },
  })

  revalidatePath("/admin/usuarios")
  return { success: true }
}

export async function updateStaffRole(
  profileId: string,
  role: string
): Promise<{ error?: string; success?: true }> {
  const auth = await requireSuperAdmin()
  if ("error" in auth) return { error: auth.error }
  if (!ASSIGNABLE_ROLES.includes(role as StaffRole)) return { error: "Rol inválido" }
  if (profileId === auth.userId) {
    return { error: "No puedes cambiar tu propio rol" }
  }

  const { error } = await adminDb()
    .from("profiles")
    .update({ role })
    .eq("id", profileId)
  if (error) return { error: error.message }

  await logAudit({
    actorId: auth.userId,
    action: "staff_role_changed",
    entityType: "profile",
    entityId: profileId,
    metadata: { role },
  })

  revalidatePath("/admin/usuarios")
  return { success: true }
}

export async function setStaffActive(
  profileId: string,
  isActive: boolean
): Promise<{ error?: string; success?: true }> {
  const auth = await requireSuperAdmin()
  if ("error" in auth) return { error: auth.error }
  if (profileId === auth.userId) {
    return { error: "No puedes desactivar tu propia cuenta" }
  }

  const admin = adminDb()
  const { error } = await admin
    .from("profiles")
    .update({ is_active: isActive })
    .eq("id", profileId)
  if (error) return { error: error.message }

  // Desactivar = revocar sesiones activas para que el bloqueo sea inmediato
  if (!isActive) {
    await admin.auth.admin.signOut(profileId, "global").catch(() => {})
  }

  await logAudit({
    actorId: auth.userId,
    action: isActive ? "staff_user_activated" : "staff_user_deactivated",
    entityType: "profile",
    entityId: profileId,
  })

  revalidatePath("/admin/usuarios")
  return { success: true }
}

/** Reinicia la contraseña a una temporal y obliga a cambiarla al entrar. */
export async function resetStaffPassword(
  profileId: string,
  newPassword: string
): Promise<{ error?: string; success?: true }> {
  const auth = await requireSuperAdmin()
  if ("error" in auth) return { error: auth.error }
  if (newPassword.length < 8) {
    return { error: "La contraseña debe tener al menos 8 caracteres" }
  }

  const admin = adminDb()
  const { error } = await admin.auth.admin.updateUserById(profileId, {
    password: newPassword,
  })
  if (error) return { error: error.message }

  await admin
    .from("profiles")
    .update({ must_change_password: true })
    .eq("id", profileId)

  await logAudit({
    actorId: auth.userId,
    action: "staff_password_reset",
    entityType: "profile",
    entityId: profileId,
  })

  revalidatePath("/admin/usuarios")
  return { success: true }
}
