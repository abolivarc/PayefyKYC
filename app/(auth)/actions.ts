"use server"

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import type { LoginFormValues, RegisterFormValues } from "@/lib/validations/auth"

export async function signIn(data: LoginFormValues) {
  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email: data.email,
    password: data.password,
  })

  if (error) {
    return { error: "Credenciales inválidas. Verifica tu correo y contraseña." }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: "Error al iniciar sesión. Intenta de nuevo." }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  const redirectTo = profile?.role === "client" ? "/dashboard" : "/admin/dashboard"
  return { success: true, redirectTo }
}

export async function signUp(data: RegisterFormValues) {
  const supabase = await createClient()

  const { error } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      data: { full_name: data.fullName },
    },
  })

  if (error) {
    if (error.message.toLowerCase().includes("already registered")) {
      return { error: "Este correo ya está registrado. Inicia sesión en su lugar." }
    }
    return { error: "No se pudo crear la cuenta. Intenta de nuevo." }
  }

  return { success: true, redirectTo: "/dashboard" }
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/login")
}
