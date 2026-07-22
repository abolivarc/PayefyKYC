"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { headers } from "next/headers"
import { createClient } from "@/lib/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { logAudit } from "@/lib/audit"
import { emailDocsSubmitted, emailExpedienteCompleto } from "@/lib/email/templates"
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
    if (product.code === "terminals" && personType) {
      if (personType === "persona_fisica") {
        templates = templates.filter((t) => t.code.startsWith("pf_"))
      } else {
        templates = templates.filter((t) => !t.code.startsWith("pf_"))
      }
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
      .select("person_type")
      .eq("id", companyId)
      .single()
    if (co?.person_type === "persona_fisica") {
      templates = templates.filter((t) => t.code.startsWith("pf_"))
    } else {
      templates = templates.filter((t) => !t.code.startsWith("pf_"))
    }
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
// Envío de correos del expediente al reviewer del producto
// (cards → notificación + ZIP a francisco.sosa; terminals → notificación a e.lopez)
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

  if (product?.code === "cards") {
    // Tarjetas: UN solo correo — aviso con botón a la plataforma + ZIP adjunto
    const to = product.internal_reviewer_email ?? "francisco.sosa@payefy.me"
    let attachments: { filename: string; content: string }[] | undefined
    let zipAttached = false

    try {
      const { data: docRows } = await adminClient
        .from("documents")
        .select("storage_path, file_name, document_templates(name)")
        .eq("application_id", applicationId)
        .not("storage_path", "is", null)

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
          const templateName =
            (doc.document_templates as unknown as { name: string } | null)?.name ??
            doc.file_name
          const ext = doc.file_name.split(".").pop() ?? "pdf"
          const safeName = templateName.replace(/[/\\:*?"<>|]/g, "_").trim()
          // Sufijo numérico para plantillas con varios archivos (JSZip sobrescribe nombres repetidos)
          const count = (usedNames.get(safeName) ?? 0) + 1
          usedNames.set(safeName, count)
          const finalName = count > 1 ? `${safeName} (${count}).${ext}` : `${safeName}.${ext}`
          zip.file(finalName, arrayBuf)
        }

        const zipBase64 = await zip.generateAsync({ type: "base64" })
        const safeCompany = (company?.legal_name ?? "empresa")
          .replace(/[/\\:*?"<>|]/g, "_")
          .trim()
        attachments = [
          { filename: `expediente_${safeCompany}.zip`, content: zipBase64 },
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
        productName: product?.name ?? "Tarjetas",
        reviewerName: "Francisco",
        applicationUrl: appUrl,
        zipAttached,
      }),
      attachments,
    })
    if (sendErr) errors.push(`Correo a ${to}: ${sendErr}`)
  } else if (product?.internal_reviewer_email) {
    // Otros productos (Terminales): solo el aviso con botón
    const { error: notifyErr } = await sendEmail({
      to: product.internal_reviewer_email,
      subject: `[PayefyKYC] Expediente completo: ${company?.legal_name ?? ""}`,
      html: emailDocsSubmitted({
        companyName: company?.legal_name ?? "",
        productName: product?.name ?? "",
        reviewerName: "Equipo Payefy",
        applicationUrl: appUrl,
      }),
    })
    if (notifyErr) errors.push(`Aviso a ${product.internal_reviewer_email}: ${notifyErr}`)
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
