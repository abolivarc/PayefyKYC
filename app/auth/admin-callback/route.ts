import { NextResponse, type NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const token_hash = searchParams.get("token_hash")
  const type = searchParams.get("type") as "recovery" | "signup" | "email" | null

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

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      return NextResponse.redirect(
        `${origin}/admin/login?error=${encodeURIComponent(
          "El enlace expiró o ya fue usado. Solicita uno nuevo."
        )}`
      )
    }
    return NextResponse.redirect(`${origin}/admin/reset-password`)
  }

  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash, type })
    if (error) {
      return NextResponse.redirect(
        `${origin}/admin/login?error=${encodeURIComponent(
          "El enlace expiró o ya fue usado. Solicita uno nuevo."
        )}`
      )
    }
    return NextResponse.redirect(`${origin}/admin/reset-password`)
  }

  return NextResponse.redirect(
    `${origin}/admin/login?error=${encodeURIComponent("Enlace inválido o expirado.")}`
  )
}
