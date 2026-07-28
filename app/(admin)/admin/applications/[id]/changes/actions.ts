"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { logAudit } from "@/lib/audit"
import { sendEmail } from "@/lib/email/send"
import { generateChangesPdf, type ChangeItem } from "@/lib/pdf/changes-summary"

const CHANGES_CC = "a.santibanez@payefy.me"

const CHANGE_ACTIONS = [
  "document_changes_requested",
  "document_rejected",
  "application_changes_requested",
]

function adminDb() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

interface ChangesContext {
  companyName: string
  productName: string
  items: ChangeItem[]
  clientEmail: string | null
  clientName: string | null
  clientUserId: string | null
}

/** Reúne las observaciones del expediente con el estado actual de cada documento. */
async function loadChanges(applicationId: string): Promise<ChangesContext | null> {
  const admin = adminDb()

  const { data: app } = await admin
    .from("applications")
    .select("company_id, companies(legal_name), products(name)")
    .eq("id", applicationId)
    .single()
  if (!app) return null

  const { data: logs } = await admin
    .from("audit_logs")
    .select("id, action, created_at, entity_id, metadata, profiles(full_name, email)")
    .in("action", CHANGE_ACTIONS)
    .filter("metadata->>application_id", "eq", applicationId)
    .order("created_at", { ascending: false })

  const rows = (logs ?? []) as unknown as {
    id: string
    action: string
    created_at: string
    entity_id: string
    metadata: { notes?: string } | null
    profiles: { full_name: string | null; email: string | null } | null
  }[]

  const docIds = Array.from(new Set(rows.map((r) => r.entity_id)))
  const { data: docs } = docIds.length
    ? await admin
        .from("documents")
        .select("id, status, document_templates(name)")
        .in("id", docIds)
    : { data: [] }

  const docInfo = new Map<string, { name: string; status: string }>()
  for (const d of (docs ?? []) as unknown as {
    id: string
    status: string
    document_templates: { name: string } | null
  }[]) {
    docInfo.set(d.id, {
      name: d.document_templates?.name ?? "Documento",
      status: d.status,
    })
  }

  const items: ChangeItem[] = rows.map((r) => {
    const isGeneral = r.action === "application_changes_requested"
    const info = docInfo.get(r.entity_id)
    return {
      documentName: isGeneral ? "Todo el expediente" : (info?.name ?? "Documento"),
      isGeneral,
      notes: r.metadata?.notes ?? "",
      status: isGeneral ? null : (info?.status ?? null),
      author: r.profiles?.full_name ?? r.profiles?.email ?? "Equipo Payefy",
      createdAt: r.created_at,
    }
  })

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

  return {
    companyName: ((app.companies as unknown) as { legal_name: string } | null)?.legal_name ?? "Empresa",
    productName: ((app.products as unknown) as { name: string } | null)?.name ?? "",
    items,
    clientEmail: profile?.email ?? null,
    clientName: profile?.full_name ?? null,
    clientUserId: member?.user_id ?? null,
  }
}

// ─────────────────────────────────────
// Reenviar al cliente el resumen de cambios pendientes
// ─────────────────────────────────────
export async function resendChangesSummary(
  applicationId: string
): Promise<{ error?: string; success?: true; sentTo?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "No autenticado" }

  const ctx = await loadChanges(applicationId)
  if (!ctx) return { error: "Solicitud no encontrada" }
  if (ctx.items.length === 0) {
    return { error: "No hay cambios que reenviar" }
  }
  if (!ctx.clientEmail) {
    return { error: "El cliente aún no tiene una cuenta con correo registrado" }
  }

  // Solo lo que sigue abierto: lo aprobado o ya corregido no se vuelve a pedir
  const pending = ctx.items.filter(
    (i) => i.isGeneral || i.status === "changes_requested" || i.status === "rejected"
  )
  if (pending.length === 0) {
    return { error: "No quedan observaciones sin atender" }
  }

  const appUrl = `${process.env.NEXT_PUBLIC_APP_URL}/applications/${applicationId}/documents`
  const list = pending
    .map(
      (i) => `
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid #E4ECE7;vertical-align:top;">
            <strong style="color:#0F2A22;">${i.documentName}</strong>
            <div style="margin-top:4px;color:#5B7168;white-space:pre-wrap;">${i.notes}</div>
          </td>
        </tr>`
    )
    .join("")

  const { error: sendErr } = await sendEmail({
    to: ctx.clientEmail,
    subject: `[PayefyKYC] Recordatorio: tu expediente requiere cambios`,
    html: `
      <p>Hola${ctx.clientName ? ` ${ctx.clientName.split(" ")[0]}` : ""},</p>
      <p>Te recordamos los puntos pendientes de tu expediente de
      <strong>${ctx.companyName}</strong>${ctx.productName ? ` (${ctx.productName})` : ""}:</p>
      <table style="width:100%;border-collapse:collapse;border:1px solid #E4ECE7;border-radius:8px;">
        ${list}
      </table>
      <p style="margin-top:18px;">
        <a href="${appUrl}" style="background:#004238;color:#AEFF99;padding:11px 20px;border-radius:8px;text-decoration:none;font-weight:600;">
          Ir a mi expediente
        </a>
      </p>
      <p style="color:#5B7168;font-size:13px;">En cuanto lo actualices seguimos con tu alta.</p>
    `,
  })
  if (sendErr) return { error: `No se pudo enviar el correo: ${sendErr}` }

  // Copia interna
  const { data: actor } = await adminDb()
    .from("profiles")
    .select("email, full_name")
    .eq("id", user.id)
    .single()
  if (actor?.email?.toLowerCase() !== CHANGES_CC) {
    await sendEmail({
      to: CHANGES_CC,
      subject: `[PayefyKYC] Recordatorio de cambios reenviado a ${ctx.companyName}`,
      html: `<p><strong>${actor?.full_name ?? actor?.email ?? "Un revisor"}</strong> reenvió a
             ${ctx.clientEmail} el recordatorio con ${pending.length} punto(s) pendiente(s)
             del expediente de <strong>${ctx.companyName}</strong>.</p>`,
    }).catch(() => {})
  }

  await logAudit({
    actorId: user.id,
    action: "changes_summary_resent",
    entityType: "application",
    entityId: applicationId,
    metadata: { application_id: applicationId, count: pending.length, to: ctx.clientEmail },
  })

  revalidatePath(`/admin/applications/${applicationId}/changes`)
  return { success: true, sentTo: ctx.clientEmail }
}

// ─────────────────────────────────────
// Exportar los cambios en PDF
// ─────────────────────────────────────
export async function exportChangesPdf(
  applicationId: string
): Promise<{ error?: string; base64?: string; filename?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "No autenticado" }

  const ctx = await loadChanges(applicationId)
  if (!ctx) return { error: "Solicitud no encontrada" }
  if (ctx.items.length === 0) return { error: "No hay cambios que exportar" }

  const bytes = await generateChangesPdf({
    companyName: ctx.companyName,
    productName: ctx.productName,
    items: ctx.items,
    exportDate: new Date().toLocaleDateString("es-MX", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
  })

  const safe = ctx.companyName.replace(/[^a-zA-Z0-9_\- ]/g, "_").trim()
  return {
    base64: Buffer.from(bytes).toString("base64"),
    filename: `Cambios_solicitados_${safe}.pdf`,
  }
}
