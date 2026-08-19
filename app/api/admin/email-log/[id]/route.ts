import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"

/** Cuerpo HTML de un correo registrado — SOLO super admin. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return new NextResponse("No autorizado", { status: 401 })

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()
  if (profile?.role !== "super_admin") {
    return new NextResponse("Solo super admin", { status: 403 })
  }

  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data } = await admin
    .from("email_log")
    .select("html")
    .eq("id", id)
    .single()
  if (!data) return new NextResponse("No encontrado", { status: 404 })

  return new NextResponse(data.html as string, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      // dentro de un iframe sandbox; sin scripts
      "Content-Security-Policy": "script-src 'none'",
    },
  })
}
