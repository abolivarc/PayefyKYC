import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"

// Autoguardado de borradores de formularios (carátula AMEX, datos
// operativos…). El cliente escribe, esto persiste en form_submissions cada
// pocos segundos, y si cierra el navegador —o se va a una junta— al volver
// encuentra todo: los loaders de /forms/[code] ya rehidratan form_data.
// No toca submitted_at ni genera nada: solo memoria.
export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  let body: { applicationId?: string; templateCode?: string; data?: Record<string, string> }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 })
  }
  const { applicationId, templateCode, data } = body
  if (!applicationId || !templateCode || !data || typeof data !== "object") {
    return NextResponse.json({ error: "Parámetros requeridos" }, { status: 400 })
  }

  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: app } = await service
    .from("applications")
    .select("id, company_id, product_id")
    .eq("id", applicationId)
    .single()
  if (!app) return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 })

  // Miembro de la empresa o staff
  const { data: membership } = await service
    .from("company_users")
    .select("id")
    .eq("company_id", app.company_id)
    .eq("user_id", user.id)
    .maybeSingle()
  if (!membership) {
    const { data: profile } = await service
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()
    if (!profile?.role || profile.role === "client") {
      return NextResponse.json({ error: "Sin acceso" }, { status: 403 })
    }
  }

  const { data: tmpl } = await service
    .from("document_templates")
    .select("id")
    .eq("code", templateCode)
    .eq("product_id", app.product_id)
    .single()
  if (!tmpl) return NextResponse.json({ error: "Formulario no encontrado" }, { status: 404 })

  // Solo texto plano y acotado: es un borrador, no un vertedero
  const clean: Record<string, string> = {}
  for (const [k, v] of Object.entries(data).slice(0, 120)) {
    clean[String(k).slice(0, 60)] = String(v ?? "").slice(0, 500)
  }

  const { error } = await service.from("form_submissions").upsert(
    {
      application_id: applicationId,
      template_id: tmpl.id,
      form_data: clean,
    },
    { onConflict: "application_id,template_id" }
  )
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ saved: true })
}
