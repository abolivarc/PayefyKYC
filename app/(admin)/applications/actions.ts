"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { logAudit } from "@/lib/audit"
import { createNotification } from "@/lib/notifications"
import { emailChangesRequested, emailApproved } from "@/lib/email/templates"
import { sendEmail } from "@/lib/email/send"
import { uploadChangeImages, signChangeImages, imagesEmailBlock, type ChangeImageInput } from "@/lib/documents/change-request-images"

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

  // Sin correo por documento: la comunicación con el cliente es el comentario
  // general. Aprobar y rechazar solo cambian el estado, que él ve en su portal.
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
// Rechazar un documento (flujo nuevo)
// ─────────────────────────────────────
// Solo marca el documento: no envía correo ni notificación. El "por qué"
// viaja en el comentario general, que lista los documentos rechazados —
// un solo correo en lugar de uno por documento.
export async function rejectDocument(
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
    .update({ status: "changes_requested" })
    .eq("id", documentId)
  if (error) return { error: error.message }

  await logAudit({
    actorId: user.id,
    action: "document_rejected",
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
  notes: string,
  images: ChangeImageInput[] = []
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "No autenticado" }

  // Capturas que acompañan la nota ("aquí está borroso, mira")
  let imagePaths: string[] = []
  let imageUrls: string[] = []
  if (images.length > 0) {
    try {
      imagePaths = await uploadChangeImages(adminDb(), applicationId, images)
      imageUrls = await signChangeImages(adminDb(), imagePaths)
    } catch (e) {
      return { error: e instanceof Error ? e.message : "No se pudieron subir las imágenes" }
    }
  }

  await supabase
    .from("documents")
    .update({
      status: "changes_requested",
      reviewer_notes: notes,
      reviewer_note_images: imagePaths.length ? imagePaths : null,
    })
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
        imagesHtml: imagesEmailBlock(imageUrls),
      }),
      imageUrls,
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

// ─────────────────────────────────────
// Solicitar cambios generales del expediente (comentario libre al cliente)
// A diferencia de requestDocumentChanges, no se ata a un documento: es un
// mensaje al cliente sobre el expediente completo.
// ─────────────────────────────────────
export async function requestGeneralChanges(
  applicationId: string,
  notes: string,
  images: ChangeImageInput[] = [],
  rejectedDocIds: string[] = []
): Promise<{ error?: string; success?: true }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "No autenticado" }

  const message = notes.trim()
  if (!message) return { error: "Escribe el mensaje para el cliente" }

  const admin = adminDb()

  let generalImageUrls: string[] = []
  if (images.length > 0) {
    try {
      const paths = await uploadChangeImages(admin, applicationId, images)
      generalImageUrls = await signChangeImages(admin, paths)
    } catch (e) {
      return { error: e instanceof Error ? e.message : "No se pudieron subir las imágenes" }
    }
  }

  const { data: app } = await admin
    .from("applications")
    .select("company_id, status, companies(legal_name), products(name, code)")
    .eq("id", applicationId)
    .single()
  if (!app) return { error: "Solicitud no encontrada" }

  const company = (app.companies as unknown) as { legal_name: string } | null
  const product = (app.products as unknown) as { name: string; code: string } | null

  // Los archivos marcados en el diálogo se rechazan aquí mismo: un solo
  // correo Y los documentos quedan en rojo para el cliente (baja su %).
  if (rejectedDocIds.length > 0) {
    await admin
      .from("documents")
      .update({ status: "changes_requested" })
      .in("id", rejectedDocIds)
      .eq("application_id", applicationId)
  }

  // Documentos que el revisor rechazó: van listados en el mismo correo, como
  // los puntos numerados de un correo de revisión.
  const { data: rejectedRows } = await admin
    .from("documents")
    .select("document_templates(name)")
    .eq("application_id", applicationId)
    .in("status", ["changes_requested", "rejected"])
  const rejectedDocs = ((rejectedRows ?? []) as unknown as {
    document_templates: { name: string } | null
  }[])
    .map((r) => r.document_templates?.name)
    .filter((n): n is string => !!n)

  // El expediente pasa a "cambios solicitados" salvo que ya esté cerrado
  if (!["activated", "rejected", "archived"].includes(app.status)) {
    await admin
      .from("applications")
      .update({ status: "changes_requested" })
      .eq("id", applicationId)
  }

  const { data: member } = await admin
    .from("company_users")
    .select("user_id, profiles(full_name, email)")
    .eq("company_id", app.company_id as string)
    .limit(1)
    .single()

  const profile = (member?.profiles as unknown) as {
    full_name: string
    email: string
  } | null

  const appUrl = `${process.env.NEXT_PUBLIC_APP_URL}/applications/${applicationId}/documents`

  // En la plataforma el cliente ve lo mismo que en el correo: el comentario
  // completo y la lista de documentos a corregir.
  const messageForApp = rejectedDocs.length
    ? `${message}\n\nDocumentos a corregir:\n${rejectedDocs.map((n) => `• ${n}`).join("\n")}`
    : message

  if (member?.user_id && profile) {
    await createNotification({
      recipientId: member.user_id,
      type: "changes_requested",
      title: "Tu expediente requiere cambios",
      message: messageForApp,
      relatedApplicationId: applicationId,
      emailTo: profile.email,
      emailSubject: "[PayefyKYC] Tu expediente requiere cambios",
      emailHtml: emailChangesRequested({
        companyName: company?.legal_name ?? "",
        clientName: profile.full_name,
        notes: message,
        applicationUrl: appUrl,
        imagesHtml: imagesEmailBlock(generalImageUrls),
        rejectedDocs,
      }),
      imageUrls: generalImageUrls,
    })
  }

  // Copia interna (salvo que la escriba el propio destinatario)
  const { data: actor } = await admin
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
        <p><strong>${actor?.full_name ?? actor?.email ?? "Un revisor"}</strong> envió un comentario general sobre el expediente de <strong>${company?.legal_name ?? "—"}</strong> (${product?.name ?? "—"}).</p>
        <p><strong>Mensaje enviado al cliente:</strong></p>
        <p style="background:#FDF1E6;border-left:3px solid #c9772f;padding:10px 14px;white-space:pre-wrap;">${message}</p>
        <p><a href="${reviewUrl}">Ver el expediente en la plataforma</a></p>
      `,
    }).catch(() => {})
  }

  await logAudit({
    actorId: user.id,
    action: "application_changes_requested",
    entityType: "application",
    entityId: applicationId,
    metadata: { notes: message, application_id: applicationId },
  })

  revalidatePath(`/admin/applications/${applicationId}/changes`)
  revalidatePath(`/admin/applications/${applicationId}/review`)
  return { success: true }
}

// ─────────────────────────────────────
// Activar / quitar la carátula AMEX en un expediente ya creado
// (cuando el comercio decide aceptar American Express después del alta)
// ─────────────────────────────────────
export async function setAmexRequirement(
  applicationId: string,
  wanted: boolean
): Promise<{ error?: string; success?: true }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "No autenticado" }

  const admin = adminDb()

  const { data: app } = await admin
    .from("applications")
    .select("company_id, product_id, products(code)")
    .eq("id", applicationId)
    .single()
  if (!app) return { error: "Solicitud no encontrada" }

  const productCode = ((app.products as unknown) as { code: string } | null)?.code
  if (productCode !== "terminals") {
    return { error: "La carátula AMEX solo aplica a solicitudes de terminales" }
  }

  const { error: compErr } = await admin
    .from("companies")
    .update({ wants_amex: wanted })
    .eq("id", app.company_id as string)
  if (compErr) return { error: compErr.message }

  const { data: tmpl } = await admin
    .from("document_templates")
    .select("id")
    .eq("code", "amex_cover")
    .eq("product_id", app.product_id)
    .single()
  if (!tmpl) return { error: "Falta la plantilla de la carátula AMEX" }

  const { data: existing } = await admin
    .from("documents")
    .select("id, storage_path")
    .eq("application_id", applicationId)
    .eq("template_id", tmpl.id)
    .maybeSingle()

  if (wanted) {
    if (!existing) {
      const { error } = await admin.from("documents").insert({
        application_id: applicationId,
        template_id: tmpl.id,
        status: "pending_upload",
      })
      if (error) return { error: error.message }
    }
  } else if (existing) {
    // No se borra si el comercio ya subió algo: se conserva la evidencia
    if (existing.storage_path) {
      return {
        error: "El comercio ya subió la carátula; no se puede quitar el requisito",
      }
    }
    await admin.from("documents").delete().eq("id", existing.id)
  }

  await logAudit({
    actorId: user.id,
    action: wanted ? "amex_cover_requested" : "amex_cover_removed",
    entityType: "application",
    entityId: applicationId,
    metadata: { application_id: applicationId },
  })

  revalidatePath(`/admin/applications/${applicationId}/review`)
  return { success: true }
}

// ─────────────────────────────────────
// Ronda del proveedor (Transfer)
// ─────────────────────────────────────
// Una ronda = una respuesta del proveedor: los comentarios pegados tal cual,
// qué documentos existentes rechazó y qué documentos NUEVOS pide. Los nuevos
// se crean como casilleros con nombre en la documentación adicional del
// cliente (provider_requested: cuentan para su porcentaje de avance).
// Al cliente le llega UN correo, sin mencionar al proveedor.
export async function registerProviderRound(
  applicationId: string,
  comments: string,
  rejectedDocIds: string[],
  newDocTitles: string[],
  images: ChangeImageInput[] = []
): Promise<{ error?: string; success?: true }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "No autenticado" }

  const message = comments.trim()
  if (!message) return { error: "Pega los comentarios del proveedor" }
  const titles = newDocTitles.map((t) => t.trim()).filter(Boolean)
  if (rejectedDocIds.length === 0 && titles.length === 0) {
    return { error: "Marca al menos un documento rechazado o pide uno nuevo" }
  }

  const admin = adminDb()

  const { data: app } = await admin
    .from("applications")
    .select("company_id, status, companies(legal_name), products(name, code)")
    .eq("id", applicationId)
    .single()
  if (!app) return { error: "Solicitud no encontrada" }
  const company = (app.companies as unknown) as { legal_name: string } | null

  let imagePaths: string[] = []
  let imageUrls: string[] = []
  if (images.length > 0) {
    try {
      imagePaths = await uploadChangeImages(admin, applicationId, images)
      imageUrls = await signChangeImages(admin, imagePaths)
    } catch (e) {
      return { error: e instanceof Error ? e.message : "No se pudieron subir las imágenes" }
    }
  }

  // 1. Rechazar los documentos observados
  const rejectedNames: string[] = []
  if (rejectedDocIds.length > 0) {
    const { data: rejDocs } = await admin
      .from("documents")
      .select("id, title, document_templates(name)")
      .in("id", rejectedDocIds)
      .eq("application_id", applicationId)
    await admin
      .from("documents")
      .update({ status: "changes_requested" })
      .in("id", rejectedDocIds)
      .eq("application_id", applicationId)
    for (const d of (rejDocs ?? []) as unknown as {
      id: string; title: string | null; document_templates: { name: string } | null
    }[]) {
      rejectedNames.push(d.document_templates?.name ?? d.title ?? "Documento")
    }
  }

  // 2. Crear los casilleros de documentos nuevos
  const newDocIds: string[] = []
  for (const title of titles) {
    const { data: nuevo, error: insErr } = await admin
      .from("documents")
      .insert({
        application_id: applicationId,
        template_id: null,
        title,
        status: "pending_upload",
        provider_requested: true,
      })
      .select("id")
      .single()
    if (insErr || !nuevo) return { error: `No se pudo crear "${title}": ${insErr?.message}` }
    newDocIds.push((nuevo as { id: string }).id)
  }

  // 3. Registrar la ronda
  const { count: rondasPrevias } = await admin
    .from("provider_rounds")
    .select("id", { count: "exact", head: true })
    .eq("application_id", applicationId)
  const { data: ronda, error: rondaErr } = await admin
    .from("provider_rounds")
    .insert({
      application_id: applicationId,
      round_no: (rondasPrevias ?? 0) + 1,
      comments: message,
      image_paths: imagePaths.length ? imagePaths : null,
      created_by: user.id,
    })
    .select("id, round_no")
    .single()
  if (rondaErr || !ronda) return { error: rondaErr?.message ?? "No se pudo crear la ronda" }

  const items = [
    ...rejectedDocIds.map((id) => ({ round_id: (ronda as { id: string }).id, document_id: id, kind: "reject" })),
    ...newDocIds.map((id) => ({ round_id: (ronda as { id: string }).id, document_id: id, kind: "new" })),
  ]
  if (items.length) await admin.from("provider_round_items").insert(items)

  // 4. La solicitud pasa a "cambios del proveedor" (salvo cerradas)
  if (!["activated", "rejected", "archived"].includes(app.status)) {
    await admin
      .from("applications")
      .update({ status: "provider_changes_requested" })
      .eq("id", applicationId)
  }

  // 5. Un solo correo al cliente — sin mencionar al proveedor
  const { data: member } = await admin
    .from("company_users")
    .select("user_id, profiles(full_name, email)")
    .eq("company_id", app.company_id as string)
    .limit(1)
    .single()
  const profile = (member?.profiles as unknown) as { full_name: string; email: string } | null
  const appUrl = `${process.env.NEXT_PUBLIC_APP_URL}/applications/${applicationId}/documents`

  const messageForApp = [
    message,
    rejectedNames.length ? `\nDocumentos a corregir:\n${rejectedNames.map((n) => `• ${n}`).join("\n")}` : "",
    titles.length ? `\nDocumentos nuevos a subir (sección "Documentación adicional"):\n${titles.map((n) => `• ${n}`).join("\n")}` : "",
  ].filter(Boolean).join("\n")

  if (member?.user_id && profile) {
    await createNotification({
      recipientId: member.user_id,
      type: "changes_requested",
      title: "Tu expediente requiere cambios",
      message: messageForApp,
      relatedApplicationId: applicationId,
      emailTo: profile.email,
      emailSubject: "[PayefyKYC] Tu expediente requiere cambios",
      emailHtml: emailChangesRequested({
        companyName: company?.legal_name ?? "",
        clientName: profile.full_name,
        notes: message,
        applicationUrl: appUrl,
        imagesHtml: imagesEmailBlock(imageUrls),
        rejectedDocs: [...rejectedNames, ...titles.map((t) => `${t} (documento nuevo — súbelo en "Documentación adicional")`)],
      }),
      imageUrls,
    })
  }

  await logAudit({
    actorId: user.id,
    action: "provider_round_registered",
    entityType: "application",
    entityId: applicationId,
    metadata: {
      application_id: applicationId,
      round_no: (ronda as { round_no: number }).round_no,
      rechazados: rejectedNames,
      nuevos: titles,
    },
  })

  revalidatePath(`/admin/applications/${applicationId}/review`)
  return { success: true }
}

// ─────────────────────────────────────
// Cambiar la modalidad de una solicitud de terminales
// ─────────────────────────────────────
// Caso recurrente (ALTIX, ARANDAS): el cliente elige "ambas" por error y el
// expediente exige una URL que no aplica. Esto ajusta la modalidad y
// reconcilia los casilleros: borra los que ya no aplican SOLO si están
// vacíos (nunca se pierde un archivo subido) y crea los que falten.
export async function changeTerminalModality(
  applicationId: string,
  newType: "card_present" | "ecommerce" | "link_de_pago" | "both"
): Promise<{ error?: string; success?: true }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "No autenticado" }

  const admin = adminDb()
  const { data: app } = await admin
    .from("applications")
    .select("company_id, product_id, companies(terminal_type, person_type), products(code)")
    .eq("id", applicationId)
    .single()
  if (!app) return { error: "Solicitud no encontrada" }
  if (((app.products as unknown) as { code: string } | null)?.code !== "terminals") {
    return { error: "La modalidad solo aplica a terminales" }
  }
  const companyInfo = (app.companies as unknown) as {
    terminal_type: string | null
    person_type: string | null
  } | null
  const anterior = companyInfo?.terminal_type ?? null
  if (anterior === newType) return { success: true }

  const esFisica = companyInfo?.person_type === "persona_fisica"
  const urlCode = esFisica ? "pf_website_url" : "website_url"
  const fotosCode = esFisica ? "pf_business_photos" : "business_photos"
  const pideUrl = newType !== "card_present"
  const pideFotos = newType === "card_present" || newType === "both"

  await admin.from("companies").update({ terminal_type: newType }).eq("id", app.company_id)

  const { data: tmpls } = await admin
    .from("document_templates")
    .select("id, code")
    .eq("product_id", app.product_id)
    .in("code", [urlCode, fotosCode])
  const tmplPorCodigo = new Map(
    ((tmpls ?? []) as unknown as { id: string; code: string }[]).map((t) => [t.code, t.id])
  )

  const { data: docs } = await admin
    .from("documents")
    .select("id, template_id, storage_path")
    .eq("application_id", applicationId)
    .in("template_id", [...tmplPorCodigo.values()])
  const docsPorTmpl = new Map<string, { id: string; storage_path: string | null }[]>()
  for (const d of (docs ?? []) as unknown as { id: string; template_id: string; storage_path: string | null }[]) {
    const arr = docsPorTmpl.get(d.template_id) ?? []
    arr.push(d)
    docsPorTmpl.set(d.template_id, arr)
  }

  async function reconciliar(code: string, requerido: boolean, filasNuevas: number) {
    const tmplId = tmplPorCodigo.get(code)
    if (!tmplId) return
    const existentes = docsPorTmpl.get(tmplId) ?? []
    if (!requerido) {
      // solo se eliminan casilleros VACÍOS; un archivo subido nunca se borra
      const vacios = existentes.filter((d) => !d.storage_path).map((d) => d.id)
      if (vacios.length) await admin.from("documents").delete().in("id", vacios)
    } else if (existentes.length === 0) {
      await admin.from("documents").insert(
        Array.from({ length: filasNuevas }, () => ({
          application_id: applicationId,
          template_id: tmplId,
          status: "pending_upload",
        }))
      )
    }
  }

  await reconciliar(urlCode, pideUrl, 1)
  await reconciliar(fotosCode, pideFotos, 4)

  await logAudit({
    actorId: user.id,
    action: "terminal_modality_changed",
    entityType: "application",
    entityId: applicationId,
    metadata: { application_id: applicationId, de: anterior, a: newType },
  })

  revalidatePath(`/admin/applications/${applicationId}/review`)
  return { success: true }
}
