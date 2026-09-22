import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"

// Abre el PDF de la cotización de un expediente. Lo ve el staff siempre, y el
// comercio solo cuando la propuesta ya se le envió (es su propia propuesta).
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: applicationId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse("No autorizado", { status: 401 })

  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: quote } = await admin
    .from("application_quotes")
    .select("pdf_storage_path, pdf_file_name, sent_at, application_id")
    .eq("application_id", applicationId)
    .maybeSingle()
  if (!quote?.pdf_storage_path) return new NextResponse("Sin propuesta", { status: 404 })

  const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single()
  const esStaff = !!profile && profile.role !== "client"

  if (!esStaff) {
    // El cliente solo ve su propuesta una vez enviada
    if (!quote.sent_at) return new NextResponse("Acceso denegado", { status: 403 })
    const { data: app } = await admin
      .from("applications")
      .select("company_id")
      .eq("id", applicationId)
      .single()
    const { data: membership } = await admin
      .from("company_users")
      .select("id")
      .eq("company_id", app?.company_id as string)
      .eq("user_id", user.id)
      .maybeSingle()
    if (!membership) return new NextResponse("Acceso denegado", { status: 403 })
  }

  const { data: signed } = await admin.storage
    .from("generated-pdfs")
    .createSignedUrl(quote.pdf_storage_path as string, 300, {
      download: (quote.pdf_file_name as string) ?? "Propuesta_Payefy.pdf",
    })
  if (!signed?.signedUrl) return new NextResponse("No se pudo generar URL", { status: 500 })

  return NextResponse.redirect(signed.signedUrl)
}
