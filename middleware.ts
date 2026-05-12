import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { updateSession } from "./lib/supabase/middleware"

export async function middleware(request: NextRequest) {
  // Refresh session and mutate request.cookies with fresh tokens
  const sessionResponse = await updateSession(request)

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return sessionResponse
  }

  // Create a read-only client using the (now-refreshed) request cookies
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: () => {}, // already handled by updateSession above
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  const redirect = (path: string) =>
    NextResponse.redirect(new URL(path, request.url))

  const isAuthPage = pathname === "/login" || pathname === "/register"
  const isProtected =
    pathname === "/" || pathname.startsWith("/dashboard") || pathname.startsWith("/admin")

  // Unauthenticated user trying to access protected route
  if (!user && isProtected) return redirect("/login")

  if (user && (isAuthPage || isProtected)) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    const isClient = profile?.role === "client"
    const home = isClient ? "/dashboard" : "/admin/dashboard"

    // Authenticated user on auth pages or root → send home
    if (isAuthPage || pathname === "/") return redirect(home)

    // Wrong portal for role
    if (pathname.startsWith("/dashboard") && !isClient) return redirect("/admin/dashboard")
    if (pathname.startsWith("/admin") && isClient) return redirect("/dashboard")
  }

  return sessionResponse
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
