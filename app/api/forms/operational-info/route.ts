import { NextResponse } from "next/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/server"
import {
  generateOperationalInfoPdf,
  type OperationalInfoData,
} from "@/lib/pdf/operational-info"

const FIELDS: (keyof OperationalInfoData)[] = [
  "averageTicket",
  "avgTransactionsAmount",
  "avgSalesAmount",
  "lastMonthSalesAmount",
  "lastMonthSalesOperations",
  "lastMonthChargebacks",
  "pctNational",
  "pctInternational",
  "operativa",
  "terminalsRequired",
  "contactEmail",
  "contactPhone",
]

const REQUIRED: (keyof OperationalInfoData)[] = [
  "averageTicket",
  "avgTransactionsAmount",
  "avgSalesAmount",
  "lastMonthSalesAmount",
  "lastMonthSalesOperations",
  "lastMonthChargebacks",
  "pctNational",
  "pctInternational",
  "operativa",
  "contactEmail",
  "contactPhone",
]

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  let body: { applicationId?: string; templateCode?: string; data?: Record<string, string> }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 })
  }

  const { applicationId, templateCode, data: raw } = body
  if (!applicationId || !raw || !templateCode) {
    return NextResponse.json({ error: "Parámetros requeridos" }, { status: 400 })
  }
  if (!["operational_info", "pf_operational_info"].includes(templateCode)) {
    return NextResponse.json({ error: "Formulario desconocido" }, { status: 400 })
  }

  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Membresía (service role: is_company_member es poco confiable en SSR)
  const { data: app } = await serviceClient
    .from("applications")
    .select("id, company_id, product_id, companies(legal_name)")
    .eq("id", applicationId)
    .single()
  if (!app) return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 })

  const { data: membership } = await serviceClient
    .from("company_users")
    .select("id")
    .eq("company_id", app.company_id)
    .eq("user_id", user.id)
    .single()
  if (!membership) return NextResponse.json({ error: "Sin acceso" }, { status: 403 })

  // Validación
  const data = Object.fromEntries(
    FIELDS.map((f) => [f, (raw[f] ?? "").toString().trim()])
  ) as unknown as OperationalInfoData

  for (const f of REQUIRED) {
    if (!data[f]) {
      return NextResponse.json({ error: `Falta el campo: ${f}` }, { status: 422 })
    }
  }
  const pctSum = parseFloat(data.pctNational) + parseFloat(data.pctInternational)
  if (isNaN(pctSum) || Math.round(pctSum) !== 100) {
    return NextResponse.json(
      { error: "% Nacional y % Internacional deben sumar 100" },
      { status: 422 }
    )
  }
  if (data.operativa !== "ecommerce" && !data.terminalsRequired) {
    return NextResponse.json(
      { error: "Indica cuántas terminales van a requerir" },
      { status: 422 }
    )
  }

  // Documento destino
  const { data: tmpl } = await serviceClient
    .from("document_templates")
    .select("id")
    .eq("code", templateCode)
    .eq("product_id", app.product_id)
    .single()
  if (!tmpl) return NextResponse.json({ error: "Template no encontrado" }, { status: 404 })

  const { data: doc } = await serviceClient
    .from("documents")
    .select("id")
    .eq("application_id", applicationId)
    .eq("template_id", tmpl.id)
    .single()
  if (!doc) return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 })

  const legalName =
    (app.companies as unknown as { legal_name: string } | null)?.legal_name ?? "Empresa"

  try {
    const pdfBytes = await generateOperationalInfoPdf(legalName, data)
    const storagePath = `${applicationId}/${doc.id}/datos_operativos.pdf`

    const { error: upErr } = await serviceClient.storage
      .from("kyc-documents")
      .upload(storagePath, Buffer.from(pdfBytes), {
        contentType: "application/pdf",
        upsert: true,
      })
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })

    await serviceClient
      .from("documents")
      .update({
        storage_path: storagePath,
        file_name: "datos_operativos.pdf",
        file_size: pdfBytes.byteLength,
        mime_type: "application/pdf",
        status: "pending_review",
        uploaded_by: user.id,
        uploaded_at: new Date().toISOString(),
      })
      .eq("id", doc.id)

    // Respuestas registradas en la plataforma (consultables y reeditables)
    await serviceClient.from("form_submissions").upsert(
      {
        application_id: applicationId,
        template_id: tmpl.id,
        document_id: doc.id,
        form_data: data as unknown as Record<string, string>,
        submitted_at: new Date().toISOString(),
      },
      { onConflict: "application_id,template_id" }
    )

    return NextResponse.json({ success: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error desconocido"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
