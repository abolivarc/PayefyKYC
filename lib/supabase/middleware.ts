import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { agentCanAccess, AGENT_HOME } from "@/lib/auth/agent-paths"

export async function updateSession(request: NextRequest) {
  // Inject pathname so server layouts can read it
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set("x-pathname", request.nextUrl.pathname)

  let supabaseResponse = NextResponse.next({
    request: { headers: requestHeaders },
  })

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
          supabaseResponse = NextResponse.next({
            request: { headers: requestHeaders },
          })
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
    pathname === "/admin/registro" ||
    pathname === "/register" ||
    pathname === "/forgot-password" ||
    pathname.startsWith("/auth/")
  // /reset-password requiere sesión (recovery) → va en isProtected, no en isAuthPage
  const isProtected =
    (pathname === "/" ||
      pathname.startsWith("/dashboard") ||
      pathname.startsWith("/applications") ||
      pathname.startsWith("/profile") ||
      pathname.startsWith("/terminos") ||
      pathname.startsWith("/admin") ||
      pathname === "/reset-password") &&
    pathname !== "/admin/login" &&
    pathname !== "/admin/registro"

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
    url.pathname =
      profile?.role === "client"
        ? "/dashboard"
        : profile?.role === "sales_agent"
          ? AGENT_HOME
          : "/admin/dashboard"

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

      // El agente comercial solo entra a sus propias secciones
      if (
        profile.role === "sales_agent" &&
        pathname.startsWith("/admin") &&
        !agentCanAccess(pathname)
      ) {
        const url = request.nextUrl.clone()
        url.pathname = AGENT_HOME
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
