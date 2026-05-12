"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

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

  revalidatePath("/", "layout")
  redirect("/") // El middleware redirige al dashboard correcto según rol
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
        encodeURIComponent(
          "La contraseña debe tener al menos 8 caracteres"
        )
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
  redirect("/")
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath("/", "layout")
  redirect("/login")
}
