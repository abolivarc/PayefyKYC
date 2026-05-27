"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { logAudit } from "@/lib/audit"
import { emailDocsSubmitted } from "@/lib/email/templates"
import { Resend } from "resend"

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
  const phone = formData.get("phone") as string
  const terminalType = (formData.get("terminal_type") as string) || null
  const operatorEmail = formData.get("operator_email") as string

  if (!products.length || !legalName || !taxId || !phone || !operatorEmail) {
    redirect(
      "/applications/new?error=" +
        encodeURIComponent("Todos los campos son requeridos")
    )
  }

  // 1. Crear empresa
  const { data: company, error: companyErr } = await supabase
    .from("companies")
    .insert({
      legal_name: legalName,
      tax_id: taxId,
      phone,
      terminal_type: terminalType,
      operator_email: operatorEmail,
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

  // 2. Vincular al usuario como miembro de la empresa
  // Nota: company_users usa role_in_company, no hay campo email
  const { error: cuError } = await supabase.from("company_users").insert({
    company_id: company.id,
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
        company_id: company.id,
        product_id: product.id,
        status: "draft",
      })
      .select("id")
      .single()

    if (appErr || !app) continue

    if (!firstAppId) firstAppId = app.id

    // 5. Obtener templates del producto
    const { data: templates } = await supabase
      .from("document_templates")
      .select("id")
      .eq("product_id", product.id)

    // 6. Crear un document record por template
    if (templates?.length) {
      const { error: docsErr } = await supabase.from("documents").insert(
        templates.map((t) => ({
          application_id: app.id,
          template_id: t.id,
          status: "pending_upload",
        }))
      )
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

  const { data: templates } = await supabase
    .from("document_templates")
    .select("id")
    .eq("product_id", product.id)

  if (templates?.length) {
    await supabase.from("documents").insert(
      templates.map((t) => ({
        application_id: app.id,
        template_id: t.id,
        status: "pending_upload",
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

  const { error } = await supabase
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
// Agregar un documento extra (para templates múltiples)
// ─────────────────────────────────────
export async function addExtraDocument(
  applicationId: string,
  templateId: string
) {
  const supabase = await createClient()
  const { data: doc, error } = await supabase
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
// Enviar expediente para revisión
// ─────────────────────────────────────
export async function submitApplication(applicationId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "No autenticado" }

  // Verificar que todos los requeridos están al menos en pending_review
  const { data: docs } = await supabase
    .from("documents")
    .select("status, document_templates(is_required)")
    .eq("application_id", applicationId)

  const requiredPending = (docs ?? []).filter(
    (d) =>
      ((d.document_templates as unknown as { is_required: boolean } | null)?.is_required ??
        false) && d.status === "pending_upload"
  )

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

  // Obtener datos para notificación al reviewer
  const { data: app } = await supabase
    .from("applications")
    .select(
      "id, company_id, companies(legal_name), products(name, internal_reviewer_email)"
    )
    .eq("id", applicationId)
    .single()

  const company = (app?.companies as unknown) as { legal_name: string } | null
  const product = (app?.products as unknown) as {
    name: string
    internal_reviewer_email: string | null
  } | null
  const appUrl = `${process.env.NEXT_PUBLIC_APP_URL}/admin/applications/${applicationId}/review`

  if (product?.internal_reviewer_email && process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY)
    await resend.emails
      .send({
        from: process.env.RESEND_FROM_EMAIL ?? "onboarding@payefy.com.mx",
        to: product.internal_reviewer_email,
        subject: `[PayefyKYC] Nueva solicitud: ${company?.legal_name ?? ""}`,
        html: emailDocsSubmitted({
          companyName: company?.legal_name ?? "",
          productName: product?.name ?? "",
          reviewerName: "Equipo Payefy",
          applicationUrl: appUrl,
        }),
      })
      .catch(() => {})
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
