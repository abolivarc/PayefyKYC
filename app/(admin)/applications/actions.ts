"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { logAudit } from "@/lib/audit"
import { createNotification } from "@/lib/notifications"
import { emailChangesRequested, emailApproved } from "@/lib/email/templates"

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
    .update({ status: "approved" })
    .eq("id", documentId)

  if (error) return { error: error.message }

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
    .select("company_id, companies(legal_name), products(name)")
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

  // Notificar al cliente si se activa
  if (newStatus === "activated") {
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
