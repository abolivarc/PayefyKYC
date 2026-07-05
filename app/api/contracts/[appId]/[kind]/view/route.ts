import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"

const STAFF_ROLES = ["sales_agent", "sales_director", "compliance", "onboarding", "accounting", "super_admin"]

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ appId: string; kind: string }> }
) {
  const { appId, kind } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse("No autorizado", { status: 401 })

  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single()
  if (!profile || !STAFF_ROLES.includes(profile.role as string)) {
    return new NextResponse("Acceso denegado", { status: 403 })
  }

  const { data: contract } = await admin
    .from("application_contracts")
    .select("signed_doc_path")
    .eq("application_id", appId)
    .eq("kind", kind)
    .single()

  if (!contract?.signed_doc_path) {
    return new NextResponse("Contrato sin archivo adjunto", { status: 404 })
  }

  const { data: signed } = await admin.storage
    .from("kyc-documents")
    .createSignedUrl(contract.signed_doc_path, 300)

  if (!signed?.signedUrl) return new NextResponse("No se pudo generar URL", { status: 500 })

  return NextResponse.redirect(signed.signedUrl)
}
