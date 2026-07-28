"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { headers } from "next/headers"
import { createClient } from "@/lib/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { sendEmail } from "@/lib/email/send"
import { emailPasswordReset } from "@/lib/email/templates/password-reset"

async function getAppUrl() {
  const headerStore = await headers()
  const host = headerStore.get("host") ?? "payefy.com.mx"
  const proto = host.startsWith("localhost") ? "http" : "https"
  return `${proto}://${host}`
}

export async function signIn(formData: FormData) {
  const email = formData.get("email") as string
  const password = formData.get("password") as string

  if (!email || !password) {
    redirect(
      "/login?error=" + encodeURIComponent("Correo y contraseña son requeridos")
    )
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    redirect(
      "/login?error=" +
        encodeURIComponent(
          "Credenciales inválidas. Verifica tu correo y contraseña."
        )
    )
  }

  // Leer el rol del perfil para redirigir directamente al dashboard correcto
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let destination = "/dashboard"
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (profile?.role && profile.role !== "client") {
      destination = "/admin/dashboard"
    }
  }

  revalidatePath("/", "layout")
  redirect(destination)
}

export async function signInClient(formData: FormData) {
  const email = formData.get("email") as string
  const password = formData.get("password") as string

  if (!email || !password) {
    redirect(
      "/login?error=" + encodeURIComponent("Correo y contraseña son requeridos")
    )
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    redirect(
      "/login?error=" +
        encodeURIComponent(
          "Credenciales inválidas. Verifica tu correo y contraseña."
        )
    )
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (profile?.role && profile.role !== "client") {
      await supabase.auth.signOut({ scope: "local" })
      redirect(
        "/login?error=" +
          encodeURIComponent(
            "Esta cuenta es de uso interno. Accede por el portal de empleados."
          )
      )
    }
  }

  revalidatePath("/", "layout")
  redirect("/dashboard")
}

export async function signInEmployee(formData: FormData) {
  const email = formData.get("email") as string
  const password = formData.get("password") as string

  if (!email || !password) {
    redirect(
      "/admin/login?error=" +
        encodeURIComponent("Correo y contraseña son requeridos")
    )
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    redirect(
      "/admin/login?error=" +
        encodeURIComponent(
          "Credenciales inválidas. Verifica tu correo y contraseña."
        )
    )
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, is_active")
      .eq("id", user.id)
      .single()

    if (profile?.role === "client") {
      await supabase.auth.signOut({ scope: "local" })
      redirect(
        "/admin/login?error=" +
          encodeURIComponent(
            "Esta cuenta no tiene acceso al portal interno. Si eres cliente, ingresa por el portal de onboarding."
          )
      )
    }

    // Cuenta desactivada por un administrador
    if (profile && profile.is_active === false) {
      await supabase.auth.signOut({ scope: "local" })
      redirect(
        "/admin/login?error=" +
          encodeURIComponent(
            "Tu cuenta está desactivada. Contacta a un administrador."
          )
      )
    }

    revalidatePath("/", "layout")
    redirect(profile?.role === "sales_agent" ? "/admin/proposals" : "/admin/dashboard")
  }

  revalidatePath("/", "layout")
  redirect("/admin/dashboard")
}

// Alta propia del equipo interno: solo correos @payefy.me.
// Entra como agente comercial (solo ve su propio trabajo); un Super Admin
// puede subirle el rol después desde /admin/usuarios.
const STAFF_EMAIL_DOMAIN = "@payefy.me"

export async function signUpEmployee(formData: FormData) {
  const fullName = ((formData.get("fullName") as string) ?? "").trim()
  const email = ((formData.get("email") as string) ?? "").trim().toLowerCase()
  const password = (formData.get("password") as string) ?? ""

  const fail = (msg: string) =>
    redirect("/admin/registro?error=" + encodeURIComponent(msg))

  if (!fullName || !email || !password) {
    fail("Todos los campos son requeridos")
  }
  if (!email.endsWith(STAFF_EMAIL_DOMAIN)) {
    fail(`Solo se pueden crear cuentas con un correo ${STAFF_EMAIL_DOMAIN}`)
  }
  if (password.length < 8) {
    fail("La contraseña debe tener al menos 8 caracteres")
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (createErr || !created?.user) {
    fail(
      /already|registered|exists|duplicate/i.test(createErr?.message ?? "")
        ? "Ese correo ya tiene una cuenta. Inicia sesión."
        : "No se pudo crear la cuenta. Intenta de nuevo."
    )
    return
  }

  const { error: profileErr } = await admin.from("profiles").upsert({
    id: created.user.id,
    email,
    full_name: fullName,
    role: "sales_agent",
    is_active: true,
    must_change_password: false,
  })
  if (profileErr) {
    // Sin perfil la cuenta no sirve: se limpia para poder reintentar
    await admin.auth.admin.deleteUser(created.user.id).catch(() => {})
    fail("No se pudo crear la cuenta. Intenta de nuevo.")
  }

  redirect(
    "/admin/login?success=" +
      encodeURIComponent("Cuenta creada. Ya puedes iniciar sesión.")
  )
}

export async function signUp(formData: FormData) {
  const fullName = formData.get("fullName") as string
  const email = formData.get("email") as string
  const password = formData.get("password") as string

  if (!fullName || !email || !password) {
    redirect(
      "/register?error=" +
        encodeURIComponent("Todos los campos son requeridos")
    )
  }

  if (password.length < 8) {
    redirect(
      "/register?error=" +
        encodeURIComponent("La contraseña debe tener al menos 8 caracteres")
    )
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  })

  if (error) {
    const msg = error.message.toLowerCase().includes("already registered")
      ? "Este correo ya está registrado. Inicia sesión en su lugar."
      : error.status === 429 || error.message.includes("security purposes") || error.message.includes("rate limit")
      ? "Ya enviamos un enlace de confirmación a ese correo. Revisa tu bandeja de entrada (incluyendo spam)."
      : "No se pudo crear la cuenta. Intenta de nuevo."
    redirect("/register?error=" + encodeURIComponent(msg))
  }

  revalidatePath("/", "layout")
  redirect("/dashboard")
}

export async function signOut() {
  const supabase = await createClient()
  // scope: 'local' para no invalidar otras sesiones del mismo usuario
  await supabase.auth.signOut({ scope: "local" })
  revalidatePath("/", "layout")
  redirect("/login")
}

export async function requestPasswordReset(formData: FormData) {
  const email = formData.get("email") as string

  if (!email || !email.includes("@")) {
    redirect("/forgot-password?error=" + encodeURIComponent("Correo electrónico inválido."))
  }

  const supabase = await createClient()
  const appUrl = await getAppUrl()
  const redirectTo = `${appUrl}/auth/callback?type=recovery`
  await supabase.auth.resetPasswordForEmail(email, { redirectTo })

  redirect(
    "/forgot-password?success=" +
      encodeURIComponent("Si ese correo está registrado, recibirás un enlace en breve.")
  )
}

export async function requestAdminPasswordReset(formData: FormData) {
  const email = formData.get("email") as string

  if (!email || !email.includes("@")) {
    redirect(
      "/admin/forgot-password?error=" +
        encodeURIComponent("Correo electrónico inválido.")
    )
  }

  const supabase = await createClient()
  const appUrl = await getAppUrl()
  const redirectTo = `${appUrl}/auth/admin-callback`

  await supabase.auth.resetPasswordForEmail(email, { redirectTo })

  redirect(
    "/admin/forgot-password?success=" +
      encodeURIComponent(
        "Si ese correo está registrado, recibirás un enlace en breve."
      )
  )
}

export async function updateAdminPassword(formData: FormData) {
  const password = formData.get("password") as string
  const confirm = formData.get("confirm_password") as string

  if (!password || password.length < 8) {
    redirect(
      "/admin/reset-password?error=" +
        encodeURIComponent("La contraseña debe tener al menos 8 caracteres.")
    )
  }

  if (password !== confirm) {
    redirect(
      "/admin/reset-password?error=" +
        encodeURIComponent("Las contraseñas no coinciden.")
    )
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password })

  if (error) {
    redirect(
      "/admin/reset-password?error=" +
        encodeURIComponent(
          "No se pudo actualizar la contraseña. El enlace puede haber expirado."
        )
    )
  }

  revalidatePath("/", "layout")
  redirect(
    "/admin/login?success=" +
      encodeURIComponent("Contraseña actualizada. Ya puedes iniciar sesión.")
  )
}

export async function updatePassword(formData: FormData) {
  const password = formData.get("password") as string
  const confirm = formData.get("confirm_password") as string

  if (!password || password.length < 8) {
    redirect(
      "/reset-password?error=" +
        encodeURIComponent("La contraseña debe tener al menos 8 caracteres.")
    )
  }

  if (password !== confirm) {
    redirect(
      "/reset-password?error=" +
        encodeURIComponent("Las contraseñas no coinciden.")
    )
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password })

  if (error) {
    redirect(
      "/reset-password?error=" +
        encodeURIComponent(
          "No se pudo actualizar la contraseña. El enlace puede haber expirado."
        )
    )
  }

  revalidatePath("/", "layout")
  redirect(
    "/login?success=" +
      encodeURIComponent("Contraseña actualizada. Ya puedes iniciar sesión.")
  )
}
