"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { logAudit } from "@/lib/audit"
import { createNotification } from "@/lib/notifications"
import { emailChangesRequested, emailApproved, emailDocumentApproved } from "@/lib/email/templates"
import { sendEmail } from "@/lib/email/send"

// Copia interna cuando se piden cambios en cualquier expediente
const CHANGES_CC = "a.santibanez@payefy.me"

function adminDb() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// ─────────────────────────────────────
// Aprobar un documento
// ─────────────────────────────────────
export async function approveDocument(
  documentId: string,
  applicationId: string
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "No autenticado" }

  const { error } = await supabase
    .from("documents")
    .update({ status: "approved", reviewer_notes: null })
    .eq("id", documentId)

  if (error) return { error: error.message }

  // Notify client via email
  const { data: doc } = await supabase
    .from("documents")
    .select("document_templates(name)")
    .eq("id", documentId)
    .single()

  const { data: app } = await supabase
    .from("applications")
    .select("company_id, companies(legal_name)")
    .eq("id", applicationId)
    .single()

  const { data: member } = await supabase
    .from("company_users")
    .select("user_id, profiles(full_name, email)")
    .eq("company_id", (app?.company_id as string) ?? "")
    .limit(1)
    .single()

  const profile = (member?.profiles as unknown) as { full_name: string; email: string } | null
  const company = (app?.companies as unknown) as { legal_name: string } | null
  const templateName = ((doc?.document_templates as unknown) as { name: string } | null)?.name ?? "Documento"
  const appUrl = `${process.env.NEXT_PUBLIC_APP_URL}/applications/${applicationId}/documents`

  if (member?.user_id && profile) {
    await createNotification({
      recipientId: member.user_id,
      type: "document_approved",
      title: `Documento aprobado: ${templateName}`,
      message: `Tu documento "${templateName}" ha sido aprobado.`,
      relatedApplicationId: applicationId,
      relatedDocumentId: documentId,
      emailTo: profile.email,
      emailSubject: `[PayefyKYC] Documento aprobado: ${templateName}`,
      emailHtml: emailDocumentApproved({
        companyName: company?.legal_name ?? "",
        clientName: profile.full_name,
        documentName: templateName,
        applicationUrl: appUrl,
      }),
    })
  }

  await logAudit({
    actorId: user.id,
    action: "document_approved",
    entityType: "document",
    entityId: documentId,
    metadata: { application_id: applicationId },
  })

  revalidatePath(`/admin/applications/${applicationId}/review`)
  return { success: true }
}

// ─────────────────────────────────────
// Solicitar cambios en un documento
// ─────────────────────────────────────
export async function requestDocumentChanges(
  documentId: string,
  applicationId: string,
  notes: string
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "No autenticado" }

  await supabase
    .from("documents")
    .update({ status: "changes_requested", reviewer_notes: notes })
    .eq("id", documentId)

  await supabase
    .from("applications")
    .update({ status: "changes_requested" })
    .eq("id", applicationId)

  const { data: app } = await supabase
    .from("applications")
    .select("company_id, companies(legal_name), products(name, code)")
    .eq("id", applicationId)
    .single()

  const { data: member } = await supabase
    .from("company_users")
    .select("user_id, profiles(full_name, email)")
    .eq("company_id", (app?.company_id as string) ?? "")
    .limit(1)
    .single()

  const profile = (member?.profiles as unknown) as {
    full_name: string
    email: string
  } | null
  const company = (app?.companies as unknown) as { legal_name: string } | null
  const product = (app?.products as unknown) as { name: string; code: string } | null
  const appUrl = `${process.env.NEXT_PUBLIC_APP_URL}/applications/${applicationId}/documents`

  if (member?.user_id && profile) {
    await createNotification({
      recipientId: member.user_id,
      type: "changes_requested",
      title: "Tu expediente requiere cambios",
      message: notes,
      relatedApplicationId: applicationId,
      relatedDocumentId: documentId,
      emailTo: profile.email,
      emailSubject: "[PayefyKYC] Tu expediente requiere cambios",
      emailHtml: emailChangesRequested({
        companyName: company?.legal_name ?? "",
        clientName: profile.full_name,
        notes,
        applicationUrl: appUrl,
      }),
    })
  }

  // Copia interna a Alejandro en cualquier producto (salvo que él mismo pida los cambios)
  {
    const { data: actor } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("id", user.id)
      .single()

    if (actor?.email?.toLowerCase() !== CHANGES_CC) {
      const reviewUrl = `${process.env.NEXT_PUBLIC_APP_URL}/admin/applications/${applicationId}/review`
      await sendEmail({
        to: CHANGES_CC,
        subject: `[PayefyKYC] Cambios solicitados a ${company?.legal_name ?? "un comercio"} (${product?.name ?? "—"})`,
        html: `
          <p><strong>${actor?.full_name ?? actor?.email ?? "Un revisor"}</strong> solicitó cambios en el expediente de <strong>${company?.legal_name ?? "—"}</strong> (${product?.name ?? "—"}).</p>
          <p><strong>Observaciones enviadas al cliente:</strong></p>
          <p style="background:#FDF1E6;border-left:3px solid #c9772f;padding:10px 14px;white-space:pre-wrap;">${notes}</p>
          <p><a href="${reviewUrl}">Ver el expediente en la plataforma</a></p>
        `,
      }).catch(() => {})
    }
  }

  await logAudit({
    actorId: user.id,
    action: "document_changes_requested",
    entityType: "document",
    entityId: documentId,
    changes: { from: "pending_review", to: "changes_requested" },
    metadata: { notes, application_id: applicationId },
  })

  revalidatePath(`/admin/applications/${applicationId}/review`)
  return { success: true }
}

// ─────────────────────────────────────
// Cambiar status de la application (kanban / review)
// ─────────────────────────────────────
export async function updateApplicationStatus(
  applicationId: string,
  newStatus: string,
  rejectionReason?: string
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "No autenticado" }

  const { data: currentApp } = await supabase
    .from("applications")
    .select(
      "status, company_id, companies(legal_name), products(name, internal_reviewer_email)"
    )
    .eq("id", applicationId)
    .single()

  const updateData: Record<string, unknown> = { status: newStatus }
  if (newStatus === "rejected" && rejectionReason) {
    updateData.rejection_reason = rejectionReason
    updateData.rejected_at = new Date().toISOString()
  }
  if (newStatus === "activated") {
    updateData.activated_at = new Date().toISOString()
  }
  if (
    newStatus === "approved_compliance" ||
    newStatus === "approved_provider"
  ) {
    updateData.approved_at = new Date().toISOString()
  }

  const { error } = await supabase
    .from("applications")
    .update(updateData)
    .eq("id", applicationId)

  if (error) return { error: error.message }

  // Notificar al cliente si se activa — guard: solo si el estado anterior no era ya 'activated'
  if (newStatus === "activated" && currentApp?.status !== "activated") {
    const { data: member } = await supabase
      .from("company_users")
      .select("user_id, profiles(full_name, email)")
      .eq("company_id", (currentApp?.company_id as string) ?? "")
      .limit(1)
      .single()

    const profile = (member?.profiles as unknown) as {
      full_name: string
      email: string
    } | null
    const company = (currentApp?.companies as unknown) as {
      legal_name: string
    } | null
    const product = (currentApp?.products as unknown) as {
      name: string
    } | null

    if (member?.user_id && profile) {
      await createNotification({
        recipientId: member.user_id,
        type: "approved",
        title: "¡Tu solicitud ha sido activada!",
        message: `El proceso KYC de ${company?.legal_name ?? ""} para ${product?.name ?? ""} ha sido completado.`,
        relatedApplicationId: applicationId,
        emailTo: profile.email,
        emailSubject: "[PayefyKYC] ¡Tu solicitud ha sido activada!",
        emailHtml: emailApproved({
          companyName: company?.legal_name ?? "",
          clientName: profile.full_name,
          productName: product?.name ?? "",
          manualUrl: process.env.ONBOARDING_MANUAL_URL,
          videoUrl: process.env.ONBOARDING_VIDEO_URL,
        }),
      })
    }
  }

  await logAudit({
    actorId: user.id,
    action: "status_changed",
    entityType: "application",
    entityId: applicationId,
    changes: { from: currentApp?.status, to: newStatus },
    metadata: rejectionReason ? { reason: rejectionReason } : undefined,
  })

  revalidatePath("/admin/kanban")
  revalidatePath(`/admin/applications/${applicationId}/review`)
  return { success: true }
}

// ─────────────────────────────────────
// Marcar/desmarcar is_checked en un documento (admin)
// ─────────────────────────────────────
export async function adminSetDocumentChecked(
  documentId: string,
  checked: boolean,
  applicationId: string
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "No autenticado" }

  const { error } = await adminDb()
    .from("documents")
    .update({
      is_checked: checked,
      status: checked ? "pending_review" : "pending_upload",
    })
    .eq("id", documentId)

  if (error) return { error: error.message }

  await logAudit({
    actorId: user.id,
    action: "document_checked",
    entityType: "document",
    entityId: documentId,
    changes: { is_checked: checked },
    metadata: { application_id: applicationId },
  })

  revalidatePath(`/admin/applications/${applicationId}/review`)
  return { success: true }
}

// ─────────────────────────────────────
// Validar / desvalidar un documento data_check (solo admin)
// ─────────────────────────────────────
export async function validateDataCheck(
  documentId: string,
  validated: boolean,
  applicationId: string
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "No autenticado" }

  const now = new Date().toISOString()
  const { error } = await adminDb()
    .from("documents")
    .update({
      status: validated ? "approved" : "pending_review",
      reviewed_by: validated ? user.id : null,
      reviewed_at: validated ? now : null,
    })
    .eq("id", documentId)

  if (error) return { error: error.message }

  await logAudit({
    actorId: user.id,
    action: "document_validated",
    entityType: "document",
    entityId: documentId,
    changes: { validated },
    metadata: { application_id: applicationId },
  })

  revalidatePath(`/admin/applications/${applicationId}/review`)
  return { success: true }
}

// ─────────────────────────────────────
// Editar valor de un campo data_check (solo admin)
// ─────────────────────────────────────
export async function updateDataCheckValue(
  documentId: string,
  value: string,
  applicationId: string
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "No autenticado" }

  const trimmed = value.trim()
  const { error } = await adminDb()
    .from("documents")
    .update({ file_name: trimmed || null })
    .eq("id", documentId)

  if (error) return { error: error.message }

  await logAudit({
    actorId: user.id,
    action: "document_validated",
    entityType: "document",
    entityId: documentId,
    changes: { file_name: trimmed },
    metadata: { application_id: applicationId },
  })

  revalidatePath(`/admin/applications/${applicationId}/review`)
  return { success: true }
}

// ─────────────────────────────────────
// Toggle completion_override en una application
// ─────────────────────────────────────
export async function toggleCompletionOverride(
  applicationId: string,
  newValue: boolean
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "No autenticado" }

  const { error } = await adminDb()
    .from("applications")
    .update({ completion_override: newValue })
    .eq("id", applicationId)

  if (error) return { error: error.message }

  await logAudit({
    actorId: user.id,
    action: newValue ? "completion_override_enabled" : "completion_override_disabled",
    entityType: "application",
    entityId: applicationId,
    changes: { completion_override: newValue },
  })

  revalidatePath(`/admin/applications/${applicationId}/review`)
  return { success: true }
}
