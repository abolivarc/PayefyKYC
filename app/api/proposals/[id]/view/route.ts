import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"

// Abre una propuesta comercial adjunta al expediente. Solo personal interno:
// la propuesta no es parte del KYC del cliente.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse("No autorizado", { status: 401 })

  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single()
  if (!profile || profile.role === "client") {
    return new NextResponse("Acceso denegado", { status: 403 })
  }

  const { data: proposal } = await admin
    .from("application_proposals")
    .select("storage_path")
    .eq("id", id)
    .single()
  if (!proposal) return new NextResponse("Propuesta no encontrada", { status: 404 })

  const { data: signed } = await admin.storage
    .from("kyc-documents")
    .createSignedUrl(proposal.storage_path, 300)
  if (!signed?.signedUrl) return new NextResponse("No se pudo generar URL", { status: 500 })

  return NextResponse.redirect(signed.signedUrl)
}
