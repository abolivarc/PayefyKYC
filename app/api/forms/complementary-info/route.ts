import { NextResponse } from "next/server"
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import { createClient as createServiceClient, type SupabaseClient } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/server"
import { readFileSync } from "fs"
import { join } from "path"
import * as XLSX from "xlsx"
import { generateComplementaryInfoXlsx } from "@/lib/excel/complementary-info"
import { validateComplementaryInfoXlsx } from "@/lib/excel/validate-complementary-info"
import { complementaryInfoSchemaV2 } from "@/lib/validations/complementary-info-v2"

const MIME_XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  let fd: FormData
  try {
    fd = await request.formData()
  } catch {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 })
  }

  const mode = fd.get("mode") as string | null
  const applicationId = fd.get("applicationId") as string | null
  if (!mode || !applicationId) {
    return NextResponse.json({ error: "Parámetros requeridos" }, { status: 400 })
  }

  // Membership check (auth client so RLS applies for reads)
  const { data: app } = await supabase
    .from("applications")
    .select("id, company_id, companies(legal_name)")
    .eq("id", applicationId)
    .single()
  if (!app) return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 })

  const { data: membership } = await supabase
    .from("company_users")
    .select("id")
    .eq("company_id", app.company_id)
    .eq("user_id", user.id)
    .single()
  if (!membership) return NextResponse.json({ error: "Sin acceso" }, { status: 403 })

  const legalName =
    (app.companies as unknown as { legal_name: string } | null)?.legal_name ?? "Empresa"

  // Get document record
  const { data: tmpl } = await supabase
    .from("document_templates")
    .select("id")
    .eq("code", "complementary_info")
    .single()
  if (!tmpl) return NextResponse.json({ error: "Template no encontrado" }, { status: 404 })

  const { data: doc } = await supabase
    .from("documents")
    .select("id")
    .eq("application_id", applicationId)
    .eq("template_id", tmpl.id)
    .single()
  if (!doc) return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 })

  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const storagePath = `${applicationId}/${doc.id}/informacion_complementaria.xlsx`

  try {
    if (mode === "portal") {
      // Opción A: generate XLSX from form fields
      const raw: Record<string, string> = {}
      for (const [k, v] of fd.entries()) {
        if (typeof v === "string") raw[k] = v
      }

      const parsed = complementaryInfoSchemaV2.safeParse(raw)
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Datos inválidos", validationErrors: parsed.error.flatten().fieldErrors },
          { status: 422 }
        )
      }

      const orgFile = fd.get("orgFile") as File | null
      const taxFile = fd.get("taxFile") as File | null

      const templateBuffer = readFileSync(
        join(process.cwd(), "public/templates/informacion_complementaria.xlsx")
      )
      const fileBuffer = generateComplementaryInfoXlsx(
        templateBuffer,
        parsed.data,
        legalName,
        orgFile?.name,
        taxFile?.name,
      )

      const { error: upErr } = await serviceClient.storage
        .from("kyc-documents")
        .upload(storagePath, fileBuffer, { contentType: MIME_XLSX, upsert: true })
      if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })

      await serviceClient
        .from("documents")
        .update({
          storage_path: storagePath,
          file_name: "informacion_complementaria.xlsx",
          file_size: fileBuffer.byteLength,
          mime_type: MIME_XLSX,
          status: "pending_review",
          uploaded_by: user.id,
          uploaded_at: new Date().toISOString(),
        })
        .eq("id", doc.id)

      await serviceClient.from("form_submissions").upsert(
        {
          application_id: applicationId,
          template_id: tmpl.id,
          document_id: doc.id,
          form_data: parsed.data,
          submitted_at: new Date().toISOString(),
        },
        { onConflict: "application_id,template_id" }
      )

      if (orgFile) await uploadAttachment(serviceClient, applicationId, orgFile, "organigrama", user.id)
      if (taxFile) await uploadAttachment(serviceClient, applicationId, taxFile, "tax_declaration", user.id)

      return NextResponse.json({ success: true })
    } else if (mode === "upload") {
      // Opción B: validate and save uploaded XLSX
      const xlsxFile = fd.get("xlsxFile") as File | null
      if (!xlsxFile) return NextResponse.json({ error: "Archivo XLSX requerido" }, { status: 400 })
      if (xlsxFile.size > 10 * 1024 * 1024)
        return NextResponse.json({ error: "El archivo supera el límite de 10 MB" }, { status: 400 })

      const orgFile = fd.get("orgFile") as File | null
      const taxFile = fd.get("taxFile") as File | null

      const xlsxBuffer = Buffer.from(await xlsxFile.arrayBuffer())
      const validation = validateComplementaryInfoXlsx(xlsxBuffer)

      if (!validation.valid || validation.structureErrors.length > 0) {
        return NextResponse.json(
          {
            error: "Archivo inválido",
            structureErrors: validation.structureErrors,
            fieldErrors: validation.fieldErrors,
          },
          { status: 422 }
        )
      }

      // Rename sheet to legal_name
      let finalBuffer = xlsxBuffer
      try {
        const wb = XLSX.read(xlsxBuffer, { type: "buffer" })
        const oldName = wb.SheetNames[0]
        const safeName = legalName.slice(0, 31)
        wb.Sheets[safeName] = wb.Sheets[oldName]
        delete wb.Sheets[oldName]
        wb.SheetNames[0] = safeName
        finalBuffer = Buffer.from(XLSX.write(wb, { bookType: "xlsx", type: "buffer" }) as ArrayBuffer)
      } catch {
        /* use original if rename fails */
      }

      const { error: upErr } = await serviceClient.storage
        .from("kyc-documents")
        .upload(storagePath, finalBuffer, { contentType: MIME_XLSX, upsert: true })
      if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })

      await serviceClient
        .from("documents")
        .update({
          storage_path: storagePath,
          file_name: xlsxFile.name,
          file_size: finalBuffer.byteLength,
          mime_type: MIME_XLSX,
          status: "pending_review",
          uploaded_by: user.id,
          uploaded_at: new Date().toISOString(),
        })
        .eq("id", doc.id)

      if (orgFile) await uploadAttachment(serviceClient, applicationId, orgFile, "organigrama", user.id)
      if (taxFile) await uploadAttachment(serviceClient, applicationId, taxFile, "tax_declaration", user.id)

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: "Modo desconocido" }, { status: 400 })
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error desconocido"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function uploadAttachment(
  serviceClient: SupabaseClient<any>,
  applicationId: string,
  file: File,
  templateCode: string,
  userId: string,
) {
  const { data: t } = await serviceClient
    .from("document_templates")
    .select("id")
    .eq("code", templateCode)
    .single()
  if (!t) return

  const { data: d } = await serviceClient
    .from("documents")
    .select("id")
    .eq("application_id", applicationId)
    .eq("template_id", t.id)
    .single()
  if (!d) return

  const ext = file.name.split(".").pop() ?? "pdf"
  const path = `${applicationId}/${d.id}/${templateCode}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())

  await serviceClient.storage
    .from("kyc-documents")
    .upload(path, buffer, { contentType: file.type, upsert: true })
  await serviceClient
    .from("documents")
    .update({
      storage_path: path,
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type,
      status: "pending_review",
      uploaded_by: userId,
      uploaded_at: new Date().toISOString(),
    })
    .eq("id", d.id)
}
