import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { agentCanAccess, AGENT_HOME } from "@/lib/auth/agent-paths"

/**
 * Redirige conservando las cookies de sesión COMPLETAS.
 *
 * `cookies.set(name, value)` pierde path, maxAge, sameSite, httpOnly y secure.
 * Como getUser() rota el refresh token, perder esas opciones deja al navegador
 * con cookies mutiladas: el token viejo ya se consumió, el nuevo no sirve, y
 * Supabase responde `session_not_found`. El síntoma es cerrar sesión sola en
 * cada clic — y le pega sobre todo al agente comercial, que pasa por un
 * redirect en casi cada navegación.
 */
function redirectPreservingSession(
  url: URL,
  supabaseResponse: NextResponse
): NextResponse {
  const redirectResponse = NextResponse.redirect(url)
  for (const cookie of supabaseResponse.cookies.getAll()) {
    redirectResponse.cookies.set(cookie)
  }
  return redirectResponse
}

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
    return redirectPreservingSession(url, supabaseResponse)
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

    return redirectPreservingSession(url, supabaseResponse)
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
        return redirectPreservingSession(url, supabaseResponse)
      }

      // El agente comercial solo entra a sus propias secciones
      if (
        profile.role === "sales_agent" &&
        pathname.startsWith("/admin") &&
        !agentCanAccess(pathname)
      ) {
        const url = request.nextUrl.clone()
        url.pathname = AGENT_HOME
        return redirectPreservingSession(url, supabaseResponse)
      }
    }
  }

  // ── Puerta de Términos y Condiciones ────────────────────────────────────
  // Vive aquí y NO en el layout: un redirect() lanzado desde un layout durante
  // una navegación suave deja la página en blanco hasta recargar (bug de Next).
  // El middleware redirige antes de renderizar y el problema desaparece.
  const CLIENT_TERMS_VERSION = "v1-2026"
  const isClientArea =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/applications") ||
    pathname.startsWith("/notifications") ||
    pathname.startsWith("/profile")

  if (user && isClientArea && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/company_users?user_id=eq.${user.id}&select=companies(terms_accepted_at,terms_version)&limit=1`,
        {
          headers: {
            apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          },
        }
      )
      const rows = (await res.json()) as {
        companies: { terms_accepted_at: string | null; terms_version: string | null } | null
      }[]
      const company = rows?.[0]?.companies
      if (
        company &&
        (!company.terms_accepted_at || company.terms_version !== CLIENT_TERMS_VERSION)
      ) {
        const url = request.nextUrl.clone()
        url.pathname = "/terminos"
        return redirectPreservingSession(url, supabaseResponse)
      }
    } catch {
      // Si la consulta falla no bloqueamos la navegación; el gate volverá a
      // evaluarse en la siguiente petición.
    }
  }

  return supabaseResponse
}
