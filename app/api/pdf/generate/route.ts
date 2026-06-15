import { NextResponse } from "next/server"
import * as Sentry from "@sentry/nextjs"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/server"
import { generateBeneficialOwnerPdf } from "@/lib/pdf/beneficial-owner"
import { generateComplementaryInfoXlsx } from "@/lib/excel/complementary-info"

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const body = await request.json()
  const { type, applicationId, formData } = body

  if (!type || !applicationId || !formData) {
    return NextResponse.json(
      { error: "Parámetros requeridos" },
      { status: 400 }
    )
  }

  // Verificar que el user tiene acceso a esta application
  const { data: app } = await supabase
    .from("applications")
    .select("id, company_id")
    .eq("id", applicationId)
    .single()

  if (!app) {
    return NextResponse.json(
      { error: "Solicitud no encontrada" },
      { status: 404 }
    )
  }

  const { data: membership } = await supabase
    .from("company_users")
    .select("id")
    .eq("company_id", app.company_id)
    .eq("user_id", user.id)
    .single()

  if (!membership) {
    return NextResponse.json({ error: "Sin acceso" }, { status: 403 })
  }

  // Obtener el template y document
  const { data: template } = await supabase
    .from("document_templates")
    .select("id")
    .eq("code", type)
    .single()

  if (!template) {
    return NextResponse.json(
      { error: "Template no encontrado" },
      { status: 404 }
    )
  }

  const { data: doc } = await supabase
    .from("documents")
    .select("id")
    .eq("application_id", applicationId)
    .eq("template_id", template.id)
    .single()

  if (!doc) {
    return NextResponse.json(
      { error: "Documento no encontrado" },
      { status: 404 }
    )
  }

  try {
    let fileBuffer: Uint8Array | Buffer
    let fileName: string
    let mimeType: string
    let bucket: string

    if (type === "beneficial_owner") {
      fileBuffer = await generateBeneficialOwnerPdf(formData)
      fileName = "constancia_beneficiario_controlador.pdf"
      mimeType = "application/pdf"
      bucket = "generated-pdfs"
    } else if (type === "complementary_info") {
      const blob = generateComplementaryInfoXlsx(formData)
      fileBuffer = Buffer.from(await blob.arrayBuffer())
      fileName = "informacion_complementaria.xlsx"
      mimeType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      bucket = "kyc-documents"
    } else {
      return NextResponse.json({ error: "Tipo desconocido" }, { status: 400 })
    }

    const storagePath = `${applicationId}/${doc.id}/${fileName}`

    // Service Role para bypass de RLS en storage
    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { error: uploadErr } = await serviceClient.storage
      .from(bucket)
      .upload(storagePath, fileBuffer, { contentType: mimeType, upsert: true })

    if (uploadErr) {
      return NextResponse.json({ error: uploadErr.message }, { status: 500 })
    }

    // Actualizar document record
    await supabase
      .from("documents")
      .update({
        storage_path: storagePath,
        file_name: fileName,
        file_size: fileBuffer.byteLength,
        mime_type: mimeType,
        status: "pending_review",
        uploaded_by: user.id,
        uploaded_at: new Date().toISOString(),
      })
      .eq("id", doc.id)

    // Guardar form_submission
    await supabase.from("form_submissions").upsert(
      {
        application_id: applicationId,
        template_id: template.id,
        document_id: doc.id,
        form_data: formData,
        generated_pdf_path:
          type === "beneficial_owner" ? storagePath : null,
        submitted_at: new Date().toISOString(),
      },
      { onConflict: "application_id,template_id" }
    )

    // URL firmada para descarga (solo beneficial_owner PDF)
    let downloadUrl: string | null = null
    if (type === "beneficial_owner") {
      const { data: signed } = await serviceClient.storage
        .from(bucket)
        .createSignedUrl(storagePath, 3600)
      downloadUrl = signed?.signedUrl ?? null
    }

    return NextResponse.json({ success: true, documentId: doc.id, downloadUrl })
  } catch (err) {
    Sentry.captureException(err, { extra: { type, applicationId } })
    const msg = err instanceof Error ? err.message : "Error desconocido"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
