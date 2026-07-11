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
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const token_hash = searchParams.get("token_hash")
  const type = searchParams.get("type") as
    | "recovery"
    | "signup"
    | "email"
    | "invite"
    | null
  const next = searchParams.get("next") ?? "/dashboard"

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

  // PKCE flow (Supabase sends ?code=xxx)
  const code = searchParams.get("code")
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent(
          "El enlace expiró o ya fue usado. Solicita uno nuevo."
        )}`
      )
    }
    const destination = type === "recovery" ? (searchParams.get("next") ?? "/reset-password") : next
    return NextResponse.redirect(`${origin}${destination}`)
  }

  // OTP flow (token_hash + type)
  if (!token_hash || !type) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent("Enlace inválido o expirado.")}`
    )
  }

  const { error } = await supabase.auth.verifyOtp({ token_hash, type })

  if (error) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(
        "El enlace expiró o ya fue usado. Solicita uno nuevo."
      )}`
    )
  }

  // Flujo de invitación: vincular al usuario con la empresa pre-creada
  if (type === "invite") {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const companyId = user?.user_metadata?.company_id as string | undefined

    if (user && companyId) {
      const admin = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )

      // Crear vínculo usuario–empresa si no existe
      await admin
        .from("company_users")
        .upsert(
          { company_id: companyId, user_id: user.id, role_in_company: "operator" },
          { onConflict: "company_id,user_id", ignoreDuplicates: true }
        )

      // Promover estado de la empresa de 'lead' a 'active'
      await admin
        .from("companies")
        .update({ status: "active" })
        .eq("id", companyId)
        .eq("status", "lead")
    }
  }

  const destination = type === "recovery"
    ? (searchParams.get("next") ?? "/reset-password")
    : next
  return NextResponse.redirect(`${origin}${destination}`)
}
