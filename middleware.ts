import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { updateSession } from "./lib/supabase/middleware"

export async function middleware(request: NextRequest) {
  // Step 1: refresh session (mutates request.cookies with fresh tokens)
  const sessionResponse = await updateSession(request)

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return sessionResponse
  }

  // Step 2: read auth state using the now-refreshed cookies
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: () => {}, // already handled by updateSession
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  const redirectTo = (path: string) => {
    const response = NextResponse.redirect(new URL(path, request.url))
    sessionResponse.cookies.getAll().forEach((cookie) => {
      response.cookies.set(cookie.name, cookie.value)
    })
    return response
  }

  const isAuthPage = pathname === "/login" || pathname === "/register"
  const isProtected =
    pathname === "/" ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/admin")

  // No session → send to login
  if (!user && isProtected) return redirectTo("/login")

  // Has session → apply role-based routing
  if (user && (isAuthPage || isProtected)) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    const role = profile?.role

    // If profile unavailable, skip role redirects to avoid loops
    if (!role) return sessionResponse

    const isClient = role === "client"

    // Auth pages and root: send to the correct home
    if (isAuthPage || pathname === "/") {
      return redirectTo(isClient ? "/dashboard" : "/admin/dashboard")
    }

    // Wrong portal for role
    if (pathname.startsWith("/dashboard") && !isClient) {
      return redirectTo("/admin/dashboard")
    }
    if (pathname.startsWith("/admin") && isClient) {
      return redirectTo("/dashboard")
    }
  }

  return sessionResponse
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
