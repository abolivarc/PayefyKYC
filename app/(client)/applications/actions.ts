"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { headers } from "next/headers"
import { createClient } from "@/lib/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { logAudit } from "@/lib/audit"
import { emailExpedienteCompleto } from "@/lib/email/templates"
import { sendEmail } from "@/lib/email/send"
import { Resend } from "resend"
import JSZip from "jszip"

// ─────────────────────────────────────
// Crear empresa + applications + documents iniciales
// ─────────────────────────────────────
export async function createApplications(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const products = formData.getAll("products") as string[]
  const legalName = formData.get("legal_name") as string
  const taxId = (formData.get("tax_id") as string).toUpperCase().trim()
  const terminalType = (formData.get("terminal_type") as string) || null
  const operatorEmail = formData.get("operator_email") as string
  const personType = (formData.get("person_type") as string) || null

  if (!products.length || !legalName || !taxId || !operatorEmail) {
    redirect(
      "/applications/new?error=" +
        encodeURIComponent("Todos los campos son requeridos")
    )
  }

  // La modalidad define qué documentos se piden (fotos vs URL del sitio)
  if (products.includes("terminals") && !terminalType) {
    redirect(
      "/applications/new?error=" +
        encodeURIComponent("Selecciona la modalidad de la terminal")
    )
  }

  // 1. Detectar si el cliente ya tiene empresa (flujo de invitación de lead)
  const { data: existingMembership } = await supabase
    .from("company_users")
    .select("company_id")
    .eq("user_id", user.id)
    .single()

  let companyId: string

  if (existingMembership) {
    // Flujo lead: actualizar empresa pre-creada con los datos del wizard
    companyId = existingMembership.company_id
    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    await adminClient.from("companies").update({
      legal_name: legalName,
      tax_id: taxId,
      terminal_type: terminalType,
      operator_email: operatorEmail,
      person_type: personType,
    }).eq("id", companyId)
  } else {
    // Flujo estándar: crear empresa nueva
    const { data: company, error: companyErr } = await supabase
      .from("companies")
      .insert({
        legal_name: legalName,
        tax_id: taxId,
        terminal_type: terminalType,
        operator_email: operatorEmail,
        person_type: personType,
        created_by: user.id,
      })
      .select("id")
      .single()

    if (companyErr || !company) {
      const msg = companyErr?.message.includes("unique")
        ? "Ya tienes una empresa registrada."
        : "Error al crear empresa."
      redirect("/applications/new?error=" + encodeURIComponent(msg))
    }
    companyId = company.id

    // Vincular usuario a la nueva empresa
    const { error: cuError } = await supabase.from("company_users").insert({
      company_id: companyId,
      user_id: user.id,
      role_in_company: "operator",
    })
    if (cuError) {
      redirect(
        "/applications/new?error=" +
          encodeURIComponent(
            "Error al vincular tu cuenta con la empresa. Intenta de nuevo."
          )
      )
    }
  }

  // 3. Obtener productos seleccionados
  const { data: productRows } = await supabase
    .from("products")
    .select("id, code")
    .in("code", products)

  let firstAppId: string | null = null

  for (const product of productRows ?? []) {
    // 4. Crear application
    const { data: app, error: appErr } = await supabase
      .from("applications")
      .insert({
        company_id: companyId,
        product_id: product.id,
        status: "draft",
      })
      .select("id")
      .single()

    if (appErr || !app) continue

    if (!firstAppId) firstAppId = app.id

    // 5. Obtener templates del producto y filtrar por tipo de persona (solo terminals)
    const { data: allTemplates, error: tmplErr } = await supabase
      .from("document_templates")
      .select("id, code, field_type")
      .eq("product_id", product.id)

    let templates = allTemplates ?? []
    if (product.code === "terminals") {
      templates = filterTerminalTemplates(templates, personType, terminalType)
    }

    console.log("[CREATE DEBUG] templates found:", templates.length, "for product:", product.id, "personType:", personType, "error:", tmplErr?.message)

    // 6. Crear un document record por template — usa service_role para bypass RLS
    // (la policy documents_insert_member usa is_company_member que puede fallar
    //  si la sesión del usuario no se propaga correctamente en este contexto)
    if (templates?.length) {
      const adminSupabase = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
      const { error: docsErr } = await adminSupabase.from("documents").insert(
        templates.map((t) => ({
          application_id: app.id,
          template_id: t.id,
          // data_check: Payefy validates internally; client has nothing to upload
          status: t.field_type === "data_check" ? "pending_review" : "pending_upload",
        }))
      )
      console.log("[CREATE DEBUG] docs insert result:", { appId: app.id, count: templates.length, error: docsErr?.message })
      if (docsErr) {
        redirect(
          "/applications/new?error=" +
            encodeURIComponent(
              "Error al crear el expediente de documentos. Intenta de nuevo."
            )
        )
      }
    }
  }

  revalidatePath("/dashboard")
  redirect(firstAppId ? `/applications/${firstAppId}/documents` : "/dashboard")
}

// Filtra las plantillas de terminales según tipo de persona y modalidad:
// - persona física usa las plantillas pf_*, moral las demás
// - tarjeta presente: no se pide URL del sitio; e-commerce/link: no se piden
//   fotos del negocio; ambas (o sin modalidad): se piden las dos
function filterTerminalTemplates<T extends { code: string }>(
  templates: T[],
  personType: string | null,
  terminalType: string | null
): T[] {
  let result =
    personType === "persona_fisica"
      ? templates.filter((t) => t.code.startsWith("pf_"))
      : templates.filter((t) => !t.code.startsWith("pf_"))

  const PHOTO_CODES = ["business_photos", "pf_business_photos"]
  const URL_CODES = ["website_url", "pf_website_url"]

  if (terminalType === "card_present") {
    result = result.filter((t) => !URL_CODES.includes(t.code))
  } else if (terminalType === "ecommerce") {
    result = result.filter((t) => !PHOTO_CODES.includes(t.code))
  }
  return result
}

// ─────────────────────────────────────
// Agregar un producto adicional a empresa existente
// ─────────────────────────────────────
export async function addProductToCompany(
  companyId: string,
  productCode: string
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: product } = await supabase
    .from("products")
    .select("id")
    .eq("code", productCode)
    .single()

  if (!product) return { error: "Producto no encontrado" }

  const { data: app, error } = await supabase
    .from("applications")
    .insert({
      company_id: companyId,
      product_id: product.id,
      status: "draft",
    })
    .select("id")
    .single()

  if (error || !app)
    return { error: "Ya tienes una solicitud para ese producto." }

  const { data: allTemplates } = await supabase
    .from("document_templates")
    .select("id, code, field_type")
    .eq("product_id", product.id)

  let templates = allTemplates ?? []

  if (productCode === "terminals") {
    const { data: co } = await supabase
      .from("companies")
      .select("person_type, terminal_type")
      .eq("id", companyId)
      .single()
    templates = filterTerminalTemplates(
      templates,
      co?.person_type ?? null,
      co?.terminal_type ?? null
    )
  }

  if (templates.length) {
    // Service role para INSERT — is_company_member falla en server action context
    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    await adminClient.from("documents").insert(
      templates.map((t) => ({
        application_id: app.id,
        template_id: t.id,
        status: t.field_type === "data_check" ? "pending_review" : "pending_upload",
      }))
    )
  }

  revalidatePath("/dashboard")
  redirect(`/applications/${app.id}/documents`)
}

// ─────────────────────────────────────
// Actualizar document record tras upload (llamado desde client)
// ─────────────────────────────────────
export async function recordDocumentUpload(
  documentId: string,
  storagePath: string,
  fileName: string,
  fileSize: number,
  mimeType: string
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "No autenticado" }

  // Verify membership before updating — is_company_member unreliable in SSR context
  const { data: doc } = await supabase
    .from("documents")
    .select("application_id")
    .eq("id", documentId)
    .single()
  if (!doc) return { error: "Documento no encontrado" }

  const { data: app } = await supabase
    .from("applications")
    .select("company_id")
    .eq("id", doc.application_id)
    .single()
  if (!app) return { error: "Solicitud no encontrada" }

  const { data: membership } = await supabase
    .from("company_users")
    .select("id")
    .eq("company_id", app.company_id)
    .eq("user_id", user.id)
    .single()
  if (!membership) return { error: "Sin acceso" }

  // Use service role for UPDATE — documents_update_member_pending also uses
  // is_company_member() which fails in server action SSR context
  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { error } = await adminClient
    .from("documents")
    .update({
      storage_path: storagePath,
      file_name: fileName,
      file_size: fileSize,
      mime_type: mimeType,
      status: "pending_review",
      uploaded_by: user.id,
      uploaded_at: new Date().toISOString(),
    })
    .eq("id", documentId)

  if (error) return { error: error.message }

  revalidatePath("/", "layout")
  return { success: true }
}

// ─────────────────────────────────────
// Marcar casilla "está en el acta / no aplica" (check_or_upload)
// ─────────────────────────────────────
export async function setDocumentChecked(
  documentId: string,
  isChecked: boolean
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "No autenticado" }

  // Verify membership — documents_update_member_pending uses is_company_member
  // which fails in server action SSR context; check explicitly then use service role
  const { data: doc } = await supabase
    .from("documents")
    .select("application_id")
    .eq("id", documentId)
    .single()
  if (!doc) return { error: "Documento no encontrado" }

  const { data: app } = await supabase
    .from("applications")
    .select("company_id")
    .eq("id", doc.application_id)
    .single()
  if (!app) return { error: "Solicitud no encontrada" }

  const { data: membership } = await supabase
    .from("company_users")
    .select("id")
    .eq("company_id", app.company_id)
    .eq("user_id", user.id)
    .single()
  if (!membership) return { error: "Sin acceso" }

  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { error } = await adminClient
    .from("documents")
    .update({
      is_checked: isChecked,
      status: isChecked ? "pending_review" : "pending_upload",
    })
    .eq("id", documentId)

  if (error) return { error: error.message }
  revalidatePath("/", "layout")
  return { success: true }
}

// ─────────────────────────────────────
// Agregar un documento extra (para templates múltiples)
// ─────────────────────────────────────
export async function addExtraDocument(
  applicationId: string,
  templateId: string
) {
  // 1. Verificar sesión
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "No autenticado" }

  // 2. Verificar que la application existe y obtener company_id
  const { data: app } = await supabase
    .from("applications")
    .select("company_id")
    .eq("id", applicationId)
    .single()
  if (!app) return { error: "Solicitud no encontrada" }

  // 3. Verificar que el usuario pertenece a esa company
  const { data: membership } = await supabase
    .from("company_users")
    .select("id")
    .eq("company_id", app.company_id)
    .eq("user_id", user.id)
    .single()
  if (!membership) return { error: "Sin acceso" }

  // 4. INSERT con service role — is_company_member falla en server action context
  //    (mismo patrón que createApplications)
  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data: doc, error } = await adminClient
    .from("documents")
    .insert({
      application_id: applicationId,
      template_id: templateId,
      status: "pending_upload",
    })
    .select("id")
    .single()

  if (error || !doc) return { error: "No se pudo agregar" }
  revalidatePath(`/applications/${applicationId}/documents`)
  return { success: true, documentId: doc.id }
}

// ─────────────────────────────────────
// Guardar valor de un campo de datos (data_check)
// ─────────────────────────────────────
export async function saveDataCheckValue(
  documentId: string,
  applicationId: string,
  value: string
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "No autenticado" }

  const { data: doc } = await supabase
    .from("documents")
    .select("application_id")
    .eq("id", documentId)
    .single()
  if (!doc) return { error: "Documento no encontrado" }

  const { data: app } = await supabase
    .from("applications")
    .select("company_id")
    .eq("id", doc.application_id)
    .single()
  if (!app) return { error: "Solicitud no encontrada" }

  const { data: membership } = await supabase
    .from("company_users")
    .select("id")
    .eq("company_id", app.company_id)
    .eq("user_id", user.id)
    .single()
  if (!membership) return { error: "Sin acceso" }

  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const trimmed = value.trim()
  const { error } = await adminClient
    .from("documents")
    .update({
      file_name: trimmed || null,
      status: trimmed ? "pending_review" : "pending_upload",
    })
    .eq("id", documentId)

  if (error) return { error: error.message }
  revalidatePath(`/applications/${applicationId}/documents`)
  return { success: true }
}

// ─────────────────────────────────────
// Enviar expediente para revisión
// ─────────────────────────────────────
export async function submitApplication(applicationId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "No autenticado" }

  // Verificar que todos los requeridos están al menos en pending_review
  // check_or_upload docs: satisfied if is_checked OR storage_path IS NOT NULL
  const { data: docs } = await supabase
    .from("documents")
    .select("status, storage_path, is_checked, document_templates(is_required, field_type)")
    .eq("application_id", applicationId)

  const requiredPending = (docs ?? []).filter((d) => {
    const tmpl = d.document_templates as unknown as { is_required: boolean; field_type: string } | null
    if (!tmpl?.is_required) return false
    if (tmpl.field_type === "check_or_upload") {
      return !d.is_checked && !d.storage_path
    }
    return d.status === "pending_upload"
  })

  if (requiredPending.length > 0) {
    return {
      error: `Faltan ${requiredPending.length} documentos requeridos por subir.`,
    }
  }

  const { error } = await supabase
    .from("applications")
    .update({
      status: "documents_pending",
      submitted_at: new Date().toISOString(),
    })
    .eq("id", applicationId)

  if (error) return { error: error.message }

  // Notificar al reviewer del producto (+ ZIP si es Tarjetas).
  // En el submit no bloqueamos si el correo falla — el expediente ya quedó enviado.
  const emailResult = await dispatchExpedienteEmails(applicationId)
  if (emailResult.error) {
    console.error("[SUBMIT] email dispatch error:", emailResult.error)
  }

  await logAudit({
    actorId: user.id,
    action: "application_submitted",
    entityType: "application",
    entityId: applicationId,
    changes: { from: "draft", to: "documents_pending" },
  })

  revalidatePath(`/applications/${applicationId}/documents`)
  revalidatePath("/dashboard")
  return { success: true }
}

// ─────────────────────────────────────
// Archivos que van en el ZIP de una solicitud: los documentos de esta
// solicitud MÁS los heredados de otra solicitud de la misma empresa (mismo
// código de plantilla). Cuando el cliente pide ambos productos, cada
// expediente viaja completo aunque el archivo se haya subido en el otro.
async function collectExpedienteFiles(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adminClient: any,
  applicationId: string,
  companyId: string
): Promise<{ storage_path: string; file_name: string; templateName: string }[]> {
  const { data: appRow } = await adminClient
    .from("applications")
    .select("product_id")
    .eq("id", applicationId)
    .single()
  const productId = (appRow as unknown as { product_id?: string } | null)?.product_id
  if (!productId) return []

  // Códigos que pertenecen a este producto
  const { data: templates } = await adminClient
    .from("document_templates")
    .select("id, code, name")
    .eq("product_id", productId)
  const codeToName = new Map<string, string>()
  const templateRows = (templates ?? []) as unknown as { code: string; name: string }[]
  for (const t of templateRows) codeToName.set(t.code, t.name)

  // Todos los documentos de la empresa (cualquier solicitud) con archivo
  const { data: appIdsRows } = await adminClient
    .from("applications")
    .select("id")
    .eq("company_id", companyId)
  const appIds = ((appIdsRows ?? []) as unknown as { id: string }[]).map((a) => a.id)

  const { data: docs } = await adminClient
    .from("documents")
    .select("application_id, storage_path, file_name, document_templates(code, name)")
    .in("application_id", appIds)
    .not("storage_path", "is", null)

  const out: { storage_path: string; file_name: string; templateName: string }[] = []
  const seen = new Set<string>()

  const docRows = (docs ?? []) as unknown as {
    application_id: string
    storage_path: string | null
    file_name: string | null
    document_templates: { code: string; name: string } | null
  }[]

  for (const d of docRows) {
    if (!d.storage_path || !d.file_name) continue
    const tmpl = (d.document_templates as unknown) as { code: string; name: string } | null

    // Documentos adicionales (sin plantilla): solo los de esta solicitud
    if (!tmpl) {
      if (d.application_id === applicationId) {
        out.push({ storage_path: d.storage_path, file_name: d.file_name, templateName: d.file_name })
      }
      continue
    }

    // Solo códigos que apliquen a este producto (propios o heredados)
    const name = codeToName.get(tmpl.code)
    if (!name) continue

    // Evitar duplicados: preferir el archivo de esta solicitud
    const key = `${tmpl.code}::${d.storage_path}`
    if (seen.has(key)) continue
    seen.add(key)

    out.push({ storage_path: d.storage_path, file_name: d.file_name, templateName: name })
  }

  return out
}

// Hoja PDF con los datos capturados (data_check) y la modalidad de la terminal.
// Se incluye en el ZIP del expediente porque esos datos no son archivos.
async function buildDatosSolicitadosPdf(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adminClient: any,
  applicationId: string,
  companyId: string,
  productName: string | null
): Promise<Uint8Array | null> {
  const { generateDataPdf } = await import("@/lib/documents/generate-data-pdf")

  const { data: company } = await adminClient
    .from("companies")
    .select("legal_name, tax_id, person_type, terminal_type")
    .eq("id", companyId)
    .single()

  const { data: docs } = await adminClient
    .from("documents")
    .select("status, file_name, document_templates(name, field_type, sort_order)")
    .eq("application_id", applicationId)

  const rows = ((docs ?? []) as unknown as {
    status: string
    file_name: string | null
    document_templates: { name: string; field_type: string; sort_order: number } | null
  }[])
    .filter((d) => d.document_templates?.field_type === "data_check")
    .sort(
      (a, b) =>
        (a.document_templates?.sort_order ?? 999) - (b.document_templates?.sort_order ?? 999)
    )
    .map((d) => ({
      label: d.document_templates?.name ?? "Dato",
      value: d.file_name,
      status: d.status,
    }))

  const co = (company as unknown) as {
    legal_name?: string
    tax_id?: string | null
    person_type?: string | null
    terminal_type?: string | null
  } | null

  // Sin datos capturados y sin modalidad no aporta nada
  if (rows.length === 0 && !co?.terminal_type) return null

  return generateDataPdf({
    companyName: co?.legal_name ?? "Empresa",
    taxId: co?.tax_id ?? null,
    personType: co?.person_type ?? null,
    productName,
    terminalType: co?.terminal_type ?? null,
    applicationId,
    exportDate: new Date().toLocaleDateString("es-MX", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    fields: rows,
  })
}

// Envío del correo del expediente al reviewer del producto: un solo correo
// con botón a la plataforma + ZIP con toda la documentación.
// (cards → francisco.sosa; terminals → e.lopez)
// Compartido entre submitApplication y resendExpedienteEmail.
// ─────────────────────────────────────
async function dispatchExpedienteEmails(
  applicationId: string
): Promise<{ error?: string }> {
  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: app } = await adminClient
    .from("applications")
    .select(
      "id, company_id, companies(legal_name), products(name, code, internal_reviewer_email)"
    )
    .eq("id", applicationId)
    .single()

  if (!app) return { error: "Solicitud no encontrada" }

  const company = (app.companies as unknown) as { legal_name: string } | null
  const product = (app.products as unknown) as {
    name: string
    code: string
    internal_reviewer_email: string | null
  } | null

  const headerStore = await headers()
  const host = headerStore.get("host") ?? "payefy.com.mx"
  const proto = host.startsWith("localhost") ? "http" : "https"
  const appUrl = `${proto}://${host}/admin/applications/${applicationId}/review`

  const errors: string[] = []

  if (product?.internal_reviewer_email || product?.code === "cards") {
    // UN solo correo al revisor del producto — aviso con botón a la
    // plataforma + ZIP adjunto con toda la documentación
    // (cards → francisco.sosa, terminals → e.lopez)
    const to = product.internal_reviewer_email ?? "francisco.sosa@payefy.me"
    let attachments: { filename: string; content: string }[] | undefined
    let zipAttached = false

    try {
      const docRows = await collectExpedienteFiles(adminClient, applicationId, app.company_id)

      if (docRows?.length) {
        const zip = new JSZip()
        const usedNames = new Map<string, number>()

        for (const doc of docRows) {
          if (!doc.storage_path || !doc.file_name) continue
          const { data: blob } = await adminClient.storage
            .from("kyc-documents")
            .download(doc.storage_path)
          if (!blob) continue
          const arrayBuf = await blob.arrayBuffer()
          const ext = doc.file_name.split(".").pop() ?? "pdf"
          const safeName = doc.templateName.replace(/[/\\:*?"<>|]/g, "_").trim()
          // Sufijo numérico para plantillas con varios archivos (JSZip sobrescribe nombres repetidos)
          const count = (usedNames.get(safeName) ?? 0) + 1
          usedNames.set(safeName, count)
          const finalName = count > 1 ? `${safeName} (${count}).${ext}` : `${safeName}.${ext}`
          zip.file(finalName, arrayBuf)
        }

        // Hoja de datos capturados (CURP, RFC, contacto) + modalidad de la
        // terminal: son campos de texto, no archivos, así que sin esta hoja
        // el revisor no los vería en el ZIP.
        try {
          const dataPdf = await buildDatosSolicitadosPdf(
            adminClient,
            applicationId,
            app.company_id,
            product?.name ?? null
          )
          if (dataPdf) zip.file("DATOS_SOLICITADOS.pdf", dataPdf)
        } catch {
          /* el ZIP sale igual sin la hoja de datos */
        }

        const zipBase64 = await zip.generateAsync({ type: "base64" })
        const safeCompany = (company?.legal_name ?? "empresa")
          .replace(/[/\\:*?"<>|]/g, "_")
          .trim()
        // El nombre del ZIP incluye el producto: si el cliente pidió ambos,
        // cada revisor recibe un archivo claramente distinguible
        const safeProduct = (product?.name ?? "expediente")
          .replace(/[/\\:*?"<>|]/g, "_")
          .trim()
        attachments = [
          { filename: `expediente_${safeCompany}_${safeProduct}.zip`, content: zipBase64 },
        ]
        zipAttached = true
      }
    } catch (e) {
      // Sin ZIP no bloqueamos el aviso: el correo sale igual con el botón
      errors.push(`Error generando ZIP: ${(e as Error).message}`)
    }

    const { error: sendErr } = await sendEmail({
      to,
      subject: `[PayefyKYC] Expediente completo: ${company?.legal_name ?? ""}`,
      html: emailExpedienteCompleto({
        companyName: company?.legal_name ?? "",
        productName: product?.name ?? "",
        reviewerName: product?.code === "cards" ? "Francisco" : "Equipo Payefy",
        applicationUrl: appUrl,
        zipAttached,
      }),
      attachments,
    })
    if (sendErr) errors.push(`Correo a ${to}: ${sendErr}`)
  }

  return errors.length ? { error: errors.join(" · ") } : {}
}

// ─────────────────────────────────────
// Reenviar el correo del expediente (botón "Reenviar" del cliente)
// ─────────────────────────────────────
export async function resendExpedienteEmail(applicationId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "No autenticado" }

  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data: app } = await adminClient
    .from("applications")
    .select("company_id, status")
    .eq("id", applicationId)
    .single()
  if (!app) return { error: "Solicitud no encontrada" }
  if (app.status === "draft") {
    return { error: "El expediente aún no ha sido enviado a revisión" }
  }

  const { data: membership } = await supabase
    .from("company_users")
    .select("id")
    .eq("company_id", app.company_id)
    .eq("user_id", user.id)
    .single()
  if (!membership) return { error: "Sin acceso" }

  // A diferencia del submit, aquí SÍ reportamos el error al usuario:
  // el propósito del botón es confirmar que el correo salió.
  const result = await dispatchExpedienteEmails(applicationId)
  if (result.error) return { error: result.error }

  await logAudit({
    actorId: user.id,
    action: "expediente_reenviado",
    entityType: "application",
    entityId: applicationId,
    metadata: { source: "client_portal" },
  })

  return { success: true }
}

// ─────────────────────────────────────
// Guardar nota del cliente en un documento
// ─────────────────────────────────────
export async function saveClientNote(
  documentId: string,
  applicationId: string,
  note: string
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "No autenticado" }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: doc } = await admin
    .from("documents")
    .select("application_id, applications(company_id)")
    .eq("id", documentId)
    .single()

  if (!doc) return { error: "Documento no encontrado" }

  const companyId = (doc.applications as unknown as { company_id: string } | null)?.company_id
  if (!companyId) return { error: "Empresa no encontrada" }

  const { data: membership } = await admin
    .from("company_users")
    .select("id")
    .eq("company_id", companyId)
    .eq("user_id", user.id)
    .single()

  if (!membership) return { error: "Acceso denegado" }

  const trimmed = note.trim() || null

  await admin
    .from("documents")
    .update({ client_notes: trimmed })
    .eq("id", documentId)

  await logAudit({
    actorId: user.id,
    action: "client_note_saved",
    entityType: "document",
    entityId: documentId,
    changes: { client_notes: trimmed },
    metadata: { application_id: applicationId },
  })

  revalidatePath(`/applications/${applicationId}/documents`)
  return { success: true }
}
