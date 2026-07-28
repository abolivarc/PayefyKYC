import { NextResponse } from "next/server"
import { readFileSync } from "fs"
import { join } from "path"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/server"
import {
  generateAmexCoverDocx,
  type AmexCoverData,
  type AmexConditions,
} from "@/lib/docx/amex-cover"

const MIME_DOCX =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"

// Campos que captura el comercio (las condiciones comerciales las pone Payefy)
const FIELDS: (keyof AmexCoverData)[] = [
  "razonSocial", "nombreComercial", "rfc", "objetoSocial", "giroComercial",
  "fiscalCalle", "fiscalColonia", "fiscalMunicipio", "fiscalCp", "fiscalEstado", "fiscalPais", "fiscalCiudad",
  "estCalle", "estColonia", "estMunicipio", "estCp", "estEstado", "estPais", "estCiudad",
  "estTelefono", "estCorreo",
  "escrituraNumero", "fechaConstitucion", "notariaNumero", "notariaEstado",
  "folioRppc", "fechaRppc", "fedatarioNombre", "paisNacionalidadEmpresa",
  "repNombre", "repIdTipo", "repIdAutoridad", "repIdNumero",
  "repFechaNacimiento", "repPaisNacimiento", "repPaisNacionalidad", "repRfc", "repCurp",
  "poderEscritura", "poderFecha", "poderFedatarioNumero", "poderLocalidad",
  "poderFedatarioNombre", "poderFolioRppc", "poderFechaRppc",
  "repCalle", "repColonia", "repMunicipio", "repCp", "repEstado", "repPais", "repCiudad",
  "repTelefono", "repCorreo",
  "fechaFirma",
]

// Sin estos la carátula no sirve; el resto puede ir vacío y completarse a mano
const REQUIRED: (keyof AmexCoverData)[] = [
  "razonSocial", "rfc", "giroComercial",
  "fiscalCalle", "fiscalColonia", "fiscalMunicipio", "fiscalCp", "fiscalEstado", "fiscalCiudad",
  "estCalle", "estColonia", "estMunicipio", "estCp", "estEstado", "estCiudad",
  "estTelefono", "estCorreo",
  "repNombre", "repRfc", "repCurp",
]

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  let body: { applicationId?: string; data?: Record<string, string> }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 })
  }

  const { applicationId, data: raw } = body
  if (!applicationId || !raw) {
    return NextResponse.json({ error: "Parámetros requeridos" }, { status: 400 })
  }

  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: app } = await service
    .from("applications")
    .select("id, company_id, product_id, amex_conditions")
    .eq("id", applicationId)
    .single()
  if (!app) return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 })

  const { data: membership } = await service
    .from("company_users")
    .select("id")
    .eq("company_id", app.company_id)
    .eq("user_id", user.id)
    .single()
  if (!membership) return NextResponse.json({ error: "Sin acceso" }, { status: 403 })

  // Normalizar y validar
  const data = Object.fromEntries(
    FIELDS.map((f) => [f, (raw[f] ?? "").toString().trim()])
  ) as unknown as AmexCoverData

  const missing = REQUIRED.filter((f) => !data[f])
  if (missing.length) {
    return NextResponse.json(
      { error: `Faltan campos obligatorios: ${missing.length}`, missing },
      { status: 422 }
    )
  }

  const { data: tmpl } = await service
    .from("document_templates")
    .select("id")
    .eq("code", "amex_cover")
    .eq("product_id", app.product_id)
    .single()
  if (!tmpl) return NextResponse.json({ error: "Template no encontrado" }, { status: 404 })

  const { data: doc } = await service
    .from("documents")
    .select("id")
    .eq("application_id", applicationId)
    .eq("template_id", tmpl.id)
    .single()
  if (!doc) return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 })

  try {
    const templateBuffer = readFileSync(
      join(process.cwd(), "public/templates/caratula_amex.docx")
    )
    const conditions = (app.amex_conditions ?? {}) as AmexConditions
    const bytes = await generateAmexCoverDocx(templateBuffer, data, conditions)

    // Las respuestas quedan guardadas para poder corregir y regenerar
    await service.from("form_submissions").upsert(
      {
        application_id: applicationId,
        template_id: tmpl.id,
        document_id: doc.id,
        form_data: data as unknown as Record<string, string>,
        submitted_at: new Date().toISOString(),
      },
      { onConflict: "application_id,template_id" }
    )

    return NextResponse.json({
      success: true,
      base64: Buffer.from(bytes).toString("base64"),
      filename: `Caratula_AMEX_${data.razonSocial.replace(/[^a-zA-Z0-9]+/g, "_").slice(0, 50)}.docx`,
      mime: MIME_DOCX,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error desconocido"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
