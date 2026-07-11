"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { sendEmail } from "@/lib/email/send"
import { emailPasswordReset } from "@/lib/email/templates/password-reset"

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
      .select("role")
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
  }

  revalidatePath("/", "layout")
  redirect("/admin/dashboard")
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
  const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?type=recovery`
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
  const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL}/auth/admin-callback`

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
