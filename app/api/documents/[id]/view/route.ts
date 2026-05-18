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

  const { data: doc } = await supabase
    .from("documents")
    .select("storage_path, file_name, mime_type")
    .eq("id", id)
    .single()

  if (!doc?.storage_path) {
    return new NextResponse("Documento no encontrado o sin archivo", {
      status: 404,
    })
  }

  // Determinar el bucket: los PDFs generados de beneficial_owner van a generated-pdfs
  const bucket =
    doc.file_name === "constancia_beneficiario_controlador.pdf"
      ? "generated-pdfs"
      : "kyc-documents"

  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: signed } = await serviceClient.storage
    .from(bucket)
    .createSignedUrl(doc.storage_path, 300)

  if (!signed?.signedUrl) {
    // Fallback: try the other bucket
    const otherBucket =
      bucket === "kyc-documents" ? "generated-pdfs" : "kyc-documents"
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
