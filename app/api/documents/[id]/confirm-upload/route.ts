import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { sendEmail } from "@/lib/email/send"
import { emailChangeCorrected, emailAllChangesResolved, emailNewUploadAdmin } from "@/lib/email/templates"

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
    .select("status, application_id, title, version, storage_path, file_name, file_size, mime_type, uploaded_by, uploaded_at, document_templates(name)")
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
  // Solo cuando el documento estaba observado: las subidas normales del alta
  // no generan correo (el submit manda el expediente completo).
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

        const companyName = ((appRow?.companies as unknown) as { legal_name: string } | null)?.legal_name ?? ""
        const documentName = ((prevDoc.document_templates as unknown) as { name: string } | null)?.name ?? fileName
        const reviewUrl = `${process.env.NEXT_PUBLIC_APP_URL}/admin/applications/${prevDoc.application_id}/review`

        // ¿Quedan documentos observados sin corregir?
        const { count: remaining } = await serviceClient
          .from("documents")
          .select("id", { count: "exact", head: true })
          .eq("application_id", prevDoc.application_id)
          .in("status", ["changes_requested", "rejected"])

        if ((remaining ?? 0) === 0) {
          await sendEmail({
            to: reviewerEmail,
            subject: `[PayefyKYC] Todos los cambios corregidos: ${companyName}`,
            html: emailAllChangesResolved({
              companyName,
              productName: product?.name ?? "",
              reviewUrl,
            }),
          })
        } else {
          await sendEmail({
            to: reviewerEmail,
            subject: `[PayefyKYC] Cambio corregido: ${companyName} (quedan ${remaining})`,
            html: emailChangeCorrected({
              companyName,
              documentName,
              remaining: remaining ?? 0,
              reviewUrl,
            }),
          })
        }
      } catch (e) {
        console.error("[CONFIRM-UPLOAD] aviso de corrección error:", e)
      }
    })()
  }

  // ── Aviso a Alejandro: contenido nuevo en un expediente ─────────────────
  // Un correo por ráfaga, no por archivo: si el comercio ya subió algo en los
  // últimos 15 minutos, este archivo viaja en la misma ráfaga y no se repite
  // el correo (el primero de la ráfaga lo advierte).
  ;(async () => {
    try {
      const ADMIN_EMAIL = "a.santibanez@payefy.me"
      const { data: uploader } = await serviceClient
        .from("profiles")
        .select("full_name, email")
        .eq("id", user.id)
        .single()
      // Sus propias subidas no se auto-notifican
      if (uploader?.email?.toLowerCase() === ADMIN_EMAIL) return
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
        to: ADMIN_EMAIL,
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
        to: "a.santibanez@payefy.me",
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
