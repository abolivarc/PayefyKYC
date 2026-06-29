import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { sanitizeStorageKey } from "@/lib/documents/storage-path"

// Matches kyc-documents bucket allowed_mime_types exactly.
// image/webp and image/gif are intentionally excluded — the bucket rejects them
// and would cause a 400 at the PUT step if we issued a signed URL for them.
const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
])
const MAX_BYTES = 100 * 1024 * 1024 // 100 MB

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: documentId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const body = await req.json()
  const { mimeType, fileSize, fileName } = body as {
    mimeType: string
    fileSize: number
    fileName: string
  }

  if (!mimeType || !fileSize || !fileName) {
    return NextResponse.json({ error: "Parámetros requeridos" }, { status: 400 })
  }
  if (fileSize > MAX_BYTES) {
    return NextResponse.json(
      { error: `El archivo excede el límite de ${MAX_BYTES / 1024 / 1024} MB` },
      { status: 400 }
    )
  }
  if (!ALLOWED_MIME.has(mimeType)) {
    return NextResponse.json({ error: `Tipo de archivo no permitido: ${mimeType}` }, { status: 400 })
  }

  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: doc } = await serviceClient
    .from("documents")
    .select("application_id")
    .eq("id", documentId)
    .single()
  if (!doc) return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 })

  const { data: app } = await serviceClient
    .from("applications")
    .select("company_id")
    .eq("id", doc.application_id)
    .single()
  if (!app) return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 })

  const { data: membership } = await serviceClient
    .from("company_users")
    .select("id")
    .eq("company_id", app.company_id)
    .eq("user_id", user.id)
    .single()
  if (!membership) return NextResponse.json({ error: "Acceso denegado" }, { status: 403 })

  const safeFileName = sanitizeStorageKey(fileName)
  // Unique prefix prevents 400 "Object already exists" on retry: Supabase's signed
  // upload endpoint does not upsert by default, so a re-upload to the same path fails.
  const storagePath = `${app.company_id}/${doc.application_id}/${documentId}/${Date.now()}-${safeFileName}`

  const { data: signed, error: signErr } = await serviceClient.storage
    .from("kyc-documents")
    .createSignedUploadUrl(storagePath)

  if (signErr || !signed) {
    console.error("[UPLOAD-URL] signed URL error:", signErr?.message)
    return NextResponse.json({ error: "Error al generar URL de subida" }, { status: 500 })
  }

  return NextResponse.json({ signedUrl: signed.signedUrl, path: storagePath })
}
