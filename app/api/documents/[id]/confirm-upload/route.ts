import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: documentId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const { path, fileName, fileSize, mimeType } = await req.json() as {
    path: string
    fileName: string
    fileSize: number
    mimeType: string
  }

  if (!path || !fileName || !fileSize || !mimeType) {
    return NextResponse.json({ error: "Parámetros requeridos" }, { status: 400 })
  }

  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { error: updateErr } = await serviceClient
    .from("documents")
    .update({
      storage_path: path,
      file_name: fileName,
      file_size: fileSize,
      mime_type: mimeType,
      status: "pending_review",
      uploaded_by: user.id,
      uploaded_at: new Date().toISOString(),
    })
    .eq("id", documentId)

  if (updateErr) {
    console.error("[CONFIRM-UPLOAD] update error:", updateErr.message)
    return NextResponse.json({ error: "Error al registrar el documento" }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
