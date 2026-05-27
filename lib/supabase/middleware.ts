import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return supabaseResponse
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // CRÍTICO: getUser() refresca el token si está expirado
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  const isAuthPage =
    pathname === "/login" ||
    pathname === "/admin/login" ||
    pathname === "/register" ||
    pathname === "/forgot-password" ||
    pathname.startsWith("/auth/")
  // /reset-password requiere sesión (recovery) → va en isProtected, no en isAuthPage
  const isProtected =
    (pathname === "/" ||
      pathname.startsWith("/dashboard") ||
      pathname.startsWith("/admin") ||
      pathname === "/reset-password") &&
    pathname !== "/admin/login"

  // Sin sesión + ruta protegida → /login
  if (!user && isProtected) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    return NextResponse.redirect(url)
  }

  // Con sesión + página de auth o root → dashboard correcto
  if (user && (isAuthPage || pathname === "/")) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    const url = request.nextUrl.clone()
    url.pathname = profile?.role === "client" ? "/dashboard" : "/admin/dashboard"

    const redirectResponse = NextResponse.redirect(url)
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value)
    })
    return redirectResponse
  }

  // Con sesión + portal incorrecto para el rol
  if (
    user &&
    (pathname.startsWith("/dashboard") || pathname.startsWith("/admin"))
  ) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (profile?.role) {
      const isClient = profile.role === "client"
      const wrongPortal =
        (pathname.startsWith("/dashboard") && !isClient) ||
        (pathname.startsWith("/admin") && isClient)

      if (wrongPortal) {
        const url = request.nextUrl.clone()
        url.pathname = isClient ? "/dashboard" : "/admin/dashboard"
        const redirectResponse = NextResponse.redirect(url)
        supabaseResponse.cookies.getAll().forEach((cookie) => {
          redirectResponse.cookies.set(cookie.name, cookie.value)
        })
        return redirectResponse
      }
    }
  }

  return supabaseResponse
}
