import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"

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

  // Step 1: Primary access check via RLS-scoped client.
  // The documents_select_member / documents_select_reviewer / documents_select_director
  // policies ensure this returns null for unauthorized users.
  const { data: doc } = await supabase
    .from("documents")
    .select("storage_path, file_name, mime_type, application_id")
    .eq("id", id)
    .single()

  if (!doc?.storage_path) {
    return new NextResponse("Documento no encontrado o sin archivo", { status: 404 })
  }

  // Step 2: Defense-in-depth — explicit company ownership check for client users.
  // Even though RLS already handles this, we verify explicitly before issuing
  // a signed URL, so a misconfigured policy can't leak storage URLs.
  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: profile } = await serviceClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  const isStaff = profile?.role && profile.role !== "client"

  if (!isStaff) {
    const { data: app } = await serviceClient
      .from("applications")
      .select("company_id")
      .eq("id", doc.application_id)
      .single()

    if (!app) return new NextResponse("Acceso denegado", { status: 403 })

    const { data: membership } = await serviceClient
      .from("company_users")
      .select("id")
      .eq("company_id", app.company_id)
      .eq("user_id", user.id)
      .single()

    if (!membership) return new NextResponse("Acceso denegado", { status: 403 })
  }

  // Step 3: Generate signed URL with service role (only reached after access is confirmed).
  const bucket =
    doc.file_name === "constancia_beneficiario_controlador.pdf"
      ? "generated-pdfs"
      : "kyc-documents"

  const { data: signed } = await serviceClient.storage
    .from(bucket)
    .createSignedUrl(doc.storage_path, 300)

  if (!signed?.signedUrl) {
    const otherBucket = bucket === "kyc-documents" ? "generated-pdfs" : "kyc-documents"
    const { data: signed2 } = await serviceClient.storage
      .from(otherBucket)
      .createSignedUrl(doc.storage_path, 300)
    if (!signed2?.signedUrl) {
      return new NextResponse("No se pudo generar URL", { status: 500 })
    }
    return NextResponse.redirect(signed2.signedUrl)
  }

  return NextResponse.redirect(signed.signedUrl)
}
