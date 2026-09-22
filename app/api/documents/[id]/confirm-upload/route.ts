import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { sendEmail } from "@/lib/email/send"
import { emailAllChangesResolved, emailNewUploadAdmin, emailCotizacionPendiente } from "@/lib/email/templates"
import { CSF_CODES } from "@/lib/documents/healthcare"
import { ADMIN_EMAILS, adminRecipientsExcept } from "@/lib/email/recipients"

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: documentId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const { path, fileName, fileSize, mimeType } = await req.json() as {
    path: string
    fileName: string
    fileSize: number
    mimeType: string
  }

  if (!path || !fileName || !fileSize || !mimeType) {
    return NextResponse.json({ error: "Parámetros requeridos" }, { status: 400 })
  }

  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Estado ANTES de confirmar: si venía de "cambios solicitados", esta subida
  // es una corrección y hay que avisarle al revisor.
  const { data: prevDoc } = await serviceClient
    .from("documents")
    .select("status, application_id, title, version, storage_path, file_name, file_size, mime_type, uploaded_by, uploaded_at, document_templates(code, name)")
    .eq("id", documentId)
    .single()

  // La versión anterior se archiva ANTES de pisarla: sin esto no hay forma
  // de saber si el archivo que ve el revisor es el original o el corregido.
  const versionActual = (prevDoc as unknown as { version?: number })?.version ?? 1
  const esResubida = !!prevDoc?.storage_path
  if (esResubida) {
    await serviceClient.from("document_versions").insert({
      document_id: documentId,
      version: versionActual,
      storage_path: prevDoc.storage_path,
      file_name: (prevDoc as unknown as { file_name?: string }).file_name ?? null,
      file_size: (prevDoc as unknown as { file_size?: number }).file_size ?? null,
      mime_type: (prevDoc as unknown as { mime_type?: string }).mime_type ?? null,
      uploaded_by: (prevDoc as unknown as { uploaded_by?: string }).uploaded_by ?? null,
      uploaded_at: (prevDoc as unknown as { uploaded_at?: string }).uploaded_at ?? null,
    })
  }

  const { error: updateErr } = await serviceClient
    .from("documents")
    .update({
      storage_path: path,
      file_name: fileName,
      file_size: fileSize,
      mime_type: mimeType,
      status: "pending_review",
      uploaded_by: user.id,
      uploaded_at: new Date().toISOString(),
      version: esResubida ? versionActual + 1 : versionActual,
    })
    .eq("id", documentId)

  if (updateErr) {
    console.error("[CONFIRM-UPLOAD] update error:", updateErr.message)
    return NextResponse.json({ error: "Error al registrar el documento" }, { status: 500 })
  }

  // ── Aviso al revisor cuando el comercio corrige un cambio ───────────────
  // Un solo correo, y solo cuando el expediente queda al 100%: sin documentos
  // observados pendientes y sin requeridos por subir. Antes se mandaba uno por
  // cada corrección ("quedan N") y a la revisora le llegaban decenas de avisos
  // por un mismo comercio; revisar a medias no le sirve de nada.
  const wasCorrection = ["changes_requested", "rejected"].includes(prevDoc?.status ?? "")
  if (wasCorrection && prevDoc?.application_id) {
    ;(async () => {
      try {
        const { data: appRow } = await serviceClient
          .from("applications")
          .select("id, companies(legal_name), products(name, internal_reviewer_email)")
          .eq("id", prevDoc.application_id)
          .single()
        const product = (appRow?.products as unknown) as { name: string; internal_reviewer_email: string | null } | null
        const reviewerEmail = product?.internal_reviewer_email
        if (!reviewerEmail) return

        // Estado de todos los documentos del expediente (mismo criterio de
        // "faltantes" que usa el panel de revisión)
        const { data: allDocs } = await serviceClient
          .from("documents")
          .select("status, storage_path, file_name, is_checked, provider_requested, document_templates(is_required, field_type)")
          .eq("application_id", prevDoc.application_id)

        type DocRow = {
          status: string
          storage_path: string | null
          file_name: string | null
          is_checked: boolean | null
          provider_requested: boolean | null
          document_templates: { is_required: boolean; field_type: string | null } | null
        }
        const rows = (allDocs ?? []) as unknown as DocRow[]

        const observados = rows.filter((d) => ["changes_requested", "rejected"].includes(d.status)).length
        const faltantes = rows.filter((d) => {
          const t = d.document_templates
          // Adicionales pedidos por el proveedor cuentan como requeridos
          if (!t) return !!d.provider_requested && d.status === "pending_upload" && !d.storage_path
          if (!t.is_required) return false
          if (t.field_type === "data_check") return d.status === "pending_review" && !d.file_name
          if (t.field_type === "check_or_upload") return !d.is_checked && !d.storage_path
          return d.status === "pending_upload" && !d.storage_path
        }).length

        if (observados > 0 || faltantes > 0) return // todavía no está al 100%: sin correo

        const companyName = ((appRow?.companies as unknown) as { legal_name: string } | null)?.legal_name ?? ""
        const reviewUrl = `${process.env.NEXT_PUBLIC_APP_URL}/admin/applications/${prevDoc.application_id}/review`

        await sendEmail({
          to: reviewerEmail,
          subject: `[PayefyKYC] Expediente completo, listo para revisar: ${companyName}`,
          html: emailAllChangesResolved({
            companyName,
            productName: product?.name ?? "",
            reviewUrl,
          }),
        })
      } catch (e) {
        console.error("[CONFIRM-UPLOAD] aviso de corrección error:", e)
      }
    })()
  }

  // ── Aviso a los administradores: contenido nuevo en un expediente ──────
  // Un correo por ráfaga, no por archivo: si el comercio ya subió algo en los
  // últimos 15 minutos, este archivo viaja en la misma ráfaga y no se repite
  // el correo (el primero de la ráfaga lo advierte).
  ;(async () => {
    try {
      const { data: uploader } = await serviceClient
        .from("profiles")
        .select("full_name, email")
        .eq("id", user.id)
        .single()
      // Un admin no se auto-notifica de sus propias subidas; los demás sí se enteran
      const recipients = adminRecipientsExcept(uploader?.email)
      if (recipients.length === 0) return
      if (!prevDoc?.application_id) return

      const hace15min = new Date(Date.now() - 15 * 60 * 1000).toISOString()
      const { count: recientes } = await serviceClient
        .from("documents")
        .select("id", { count: "exact", head: true })
        .eq("application_id", prevDoc.application_id)
        .neq("id", documentId)
        .gte("uploaded_at", hace15min)
      if ((recientes ?? 0) > 0) return // ya salió el correo de esta ráfaga

      const { data: appRow } = await serviceClient
        .from("applications")
        .select("id, companies(legal_name, internal_alias), products(name)")
        .eq("id", prevDoc.application_id)
        .single()
      const companyRow = (appRow?.companies as unknown) as { legal_name: string; internal_alias: string | null } | null
      const documentName =
        ((prevDoc.document_templates as unknown) as { name: string } | null)?.name ??
        ((prevDoc as unknown as { title?: string | null }).title ?? "Documento adicional")

      await sendEmail({
        to: recipients,
        subject: `[PayefyKYC] ${companyRow?.legal_name?.trim() ?? "Un comercio"} subió: ${documentName}`,
        html: emailNewUploadAdmin({
          companyName: companyRow?.legal_name ?? "",
          alias: companyRow?.internal_alias,
          uploaderName: uploader?.full_name || uploader?.email || "Cliente",
          documentName,
          fileName,
          productName: ((appRow?.products as unknown) as { name: string } | null)?.name ?? "",
          burstNote: true,
          reviewUrl: `${process.env.NEXT_PUBLIC_APP_URL}/admin/applications/${prevDoc.application_id}/review`,
        }),
      })
    } catch (e) {
      console.error("[CONFIRM-UPLOAD] aviso admin error:", e)
    }
  })()

  // ── ¿Ya se puede cotizar? ───────────────────────────────────────────────
  // La constancia de situación fiscal trae la actividad económica real: con
  // ella el equipo asigna el MCC y las tasas. Se avisa una sola vez, cuando
  // todavía no hay cotización, y fuera de la ráfaga de 15 min: es el
  // disparador del paso comercial, no un aviso más de documentos.
  ;(async () => {
    try {
      const code = ((prevDoc?.document_templates as unknown) as { code?: string } | null)?.code
      if (!code || !CSF_CODES.includes(code)) return
      if (!prevDoc?.application_id) return

      const { data: yaCotizado } = await serviceClient
        .from("application_quotes")
        .select("id")
        .eq("application_id", prevDoc.application_id)
        .maybeSingle()
      if (yaCotizado) return

      const { data: appRow } = await serviceClient
        .from("applications")
        .select("id, companies(legal_name, internal_alias, business_activity), products(name)")
        .eq("id", prevDoc.application_id)
        .single()
      const co = (appRow?.companies as unknown) as {
        legal_name: string
        internal_alias: string | null
        business_activity: string | null
      } | null

      await sendEmail({
        to: ADMIN_EMAILS,
        subject: `[PayefyKYC] Listo para cotizar: ${co?.legal_name?.trim() ?? "comercio"}`,
        html: emailCotizacionPendiente({
          companyName: co?.legal_name ?? "Comercio",
          alias: co?.internal_alias,
          businessActivity: co?.business_activity,
          productName: ((appRow?.products as unknown) as { name: string } | null)?.name ?? "",
          quoteUrl: `${process.env.NEXT_PUBLIC_APP_URL}/admin/applications/${prevDoc.application_id}/quote`,
        }),
        applicationId: prevDoc.application_id,
      })
    } catch (e) {
      console.error("[CONFIRM-UPLOAD] aviso cotización error:", e)
    }
  })()

  // ── ¿Esta subida completó la ronda del proveedor? ───────────────────────
  // Se avisa UNA vez a Alejandro cuando el último pendiente de la ronda cae.
  ;(async () => {
    try {
      if (!prevDoc?.application_id) return
      const { data: ronda } = await serviceClient
        .from("provider_rounds")
        .select("id, round_no, created_at, notified_complete")
        .eq("application_id", prevDoc.application_id)
        .order("round_no", { ascending: false })
        .limit(1)
        .maybeSingle()
      if (!ronda || (ronda as { notified_complete: boolean }).notified_complete) return

      const { data: itemRows } = await serviceClient
        .from("provider_round_items")
        .select("kind, documents(storage_path, uploaded_at)")
        .eq("round_id", (ronda as { id: string }).id)
      const items = (itemRows ?? []) as unknown as {
        kind: string
        documents: { storage_path: string | null; uploaded_at: string | null } | null
      }[]
      if (items.length === 0) return
      const completa = items.every((it) => {
        const d = it.documents
        if (!d) return false
        if (it.kind === "new") return !!d.storage_path
        return !!d.uploaded_at && d.uploaded_at > (ronda as { created_at: string }).created_at
      })
      if (!completa) return

      await serviceClient
        .from("provider_rounds")
        .update({ notified_complete: true, resolved_at: new Date().toISOString() })
        .eq("id", (ronda as { id: string }).id)

      const { data: appRow } = await serviceClient
        .from("applications")
        .select("companies(legal_name, internal_alias), products(name)")
        .eq("id", prevDoc.application_id)
        .single()
      const empresa = ((appRow?.companies as unknown) as { legal_name: string; internal_alias: string | null } | null)
      await sendEmail({
        to: ADMIN_EMAILS,
        subject: `[PayefyKYC] Ronda del proveedor completa: ${empresa?.legal_name?.trim() ?? ""}`,
        html: emailAllChangesResolved({
          companyName: `${empresa?.legal_name ?? ""}${empresa?.internal_alias ? ` (${empresa.internal_alias})` : ""}`,
          productName: ((appRow?.products as unknown) as { name: string } | null)?.name ?? "",
          reviewUrl: `${process.env.NEXT_PUBLIC_APP_URL}/admin/applications/${prevDoc.application_id}/review`,
        }),
      })
    } catch (e) {
      console.error("[CONFIRM-UPLOAD] aviso ronda completa error:", e)
    }
  })()

  return NextResponse.json({ success: true })
}
