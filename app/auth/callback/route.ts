/*
 * CONFIGURACIÓN REQUERIDA EN SUPABASE DASHBOARD:
 * Authentication → URL Configuration:
 *   Site URL: https://tu-dominio.vercel.app
 *   Redirect URLs (añadir ambas):
 *     http://localhost:3000/**
 *     https://tu-dominio.vercel.app/**
 *
 * Sin esto, los links del email no funcionarán.
 */

import { NextResponse, type NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const token_hash = searchParams.get("token_hash")
  const type = searchParams.get("type") as
    | "recovery"
    | "signup"
    | "email"
    | null
  const next = searchParams.get("next") ?? "/dashboard"

  if (!token_hash || !type) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent("Enlace inválido o expirado.")}`
    )
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) => {
          try {
            toSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )

  const { error } = await supabase.auth.verifyOtp({ token_hash, type })

  if (error) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(
        "El enlace expiró o ya fue usado. Solicita uno nuevo."
      )}`
    )
  }

  const destination = type === "recovery" ? "/reset-password" : next
  return NextResponse.redirect(`${origin}${destination}`)
}
