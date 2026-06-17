import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"

const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
])
const MAX_BYTES = 100 * 1024 * 1024 // 100 MB

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: documentId } = await params

  // ── 1. Auth ──────────────────────────────────────────────────────────────
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  }

  // ── 2. Parse multipart ───────────────────────────────────────────────────
  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 })
  }

  const file = formData.get("file")
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Archivo requerido" }, { status: 400 })
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `El archivo excede el límite de ${MAX_BYTES / 1024 / 1024} MB` },
      { status: 400 }
    )
  }

  if (!ALLOWED_MIME.has(file.type)) {
    return NextResponse.json(
      { error: `Tipo de archivo no permitido: ${file.type}` },
      { status: 400 }
    )
  }

  // ── 3. Lookup document → application → company (service role, faster) ───
  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: doc, error: docErr } = await serviceClient
    .from("documents")
    .select("application_id")
    .eq("id", documentId)
    .single()

  if (docErr || !doc) {
    console.error("[DOCS UPLOAD] document lookup error:", docErr?.message)
    return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 })
  }

  const { data: app, error: appErr } = await serviceClient
    .from("applications")
    .select("company_id")
    .eq("id", doc.application_id)
    .single()

  if (appErr || !app) {
    console.error("[DOCS UPLOAD] application lookup error:", appErr?.message)
    return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 })
  }

  // ── 4. Membership check (in code — is_company_member unreliable in SSR) ──
  const { data: membership } = await serviceClient
    .from("company_users")
    .select("id")
    .eq("company_id", app.company_id)
    .eq("user_id", user.id)
    .single()

  if (!membership) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 })
  }

  // ── 5. Upload to storage with service role ───────────────────────────────
  // Path: {company_id}/{application_id}/{document_id}/{filename}
  const storagePath = `${app.company_id}/${doc.application_id}/${documentId}/${file.name}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const { error: storageErr } = await serviceClient.storage
    .from("kyc-documents")
    .upload(storagePath, buffer, {
      contentType: file.type,
      upsert: true,
    })

  if (storageErr) {
    console.error("[DOCS UPLOAD] storage error:", storageErr.message)
    return NextResponse.json(
      { error: "Error al subir el archivo: " + storageErr.message },
      { status: 500 }
    )
  }

  // ── 6. Update documents record ────────────────────────────────────────────
  const { error: updateErr } = await serviceClient
    .from("documents")
    .update({
      storage_path: storagePath,
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type,
      status: "pending_review",
      uploaded_by: user.id,
      uploaded_at: new Date().toISOString(),
    })
    .eq("id", documentId)

  if (updateErr) {
    console.error("[DOCS UPLOAD] documents update error:", updateErr.message, updateErr.code, updateErr.details)
    return NextResponse.json(
      { error: "Error al registrar el documento: " + updateErr.message },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true, storagePath, fileName: file.name })
}
