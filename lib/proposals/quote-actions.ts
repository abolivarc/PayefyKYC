"use server"

// Cotización desde el expediente: el equipo asigna el MCC y las tasas, se
// guarda el snapshot del generador de propuestas y se le manda el PDF al
// cliente. Cierra el hueco de los comercios que llegan por redes y empiezan
// a subir documentos sin que nadie haya hablado de precio con ellos.

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { logAudit } from "@/lib/audit"
import { sendEmail } from "@/lib/email/send"
import { emailPropuestaComercial } from "@/lib/email/templates"
import { firstRateError } from "@/lib/proposals/rate-floors"
import { rateTierOf } from "@/lib/auth/staff"
import type { ProposalData } from "@/lib/proposals/types"

/** Quién puede fijar tasas: los dos admins y onboarding (Eli). */
const QUOTE_ROLES = ["super_admin", "onboarding"]

export type Quote = {
  id: string
  application_id: string
  mcc_code: string
  sector_name: string | null
  debit_rate: number
  credit_rate: number
  amex_rate: number | null
  international_rate: number | null
  monthly_volume: number | null
  proposal_type: string
  proposal_data: Record<string, unknown>
  pdf_storage_path: string | null
  pdf_file_name: string | null
  sent_at: string | null
  sent_to: string | null
  created_at: string
}

async function requireQuoter() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "No autenticado" as const }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data: profile } = await admin
    .from("profiles")
    .select("role, full_name, agent_type")
    .eq("id", user.id)
    .single()
  if (!profile || !QUOTE_ROLES.includes(profile.role as string)) {
    return { error: "Solo administración y onboarding pueden fijar tasas" as const }
  }
  return { user, admin, profile }
}

/**
 * Guarda (o reemplaza) la cotización del expediente. El PDF llega en base64
 * porque se arma en el navegador: el documento de la propuesta es JSX con
 * Tailwind y no existe render server-side.
 */
export async function saveQuote(input: {
  applicationId: string
  data: Partial<ProposalData>
  pdfBase64?: string
  pdfFileName?: string
  /** Propuesta previa del generador que se retomó: se marca como ganada */
  fromLeadId?: string
}): Promise<{ error?: string; quoteId?: string }> {
  const auth = await requireQuoter()
  if ("error" in auth) return { error: auth.error }
  const { user, admin } = auth

  const { applicationId, data } = input
  if (!applicationId) return { error: "Falta la solicitud" }
  if (!data.mccCode) return { error: "Asigna el giro (MCC) del comercio" }

  // Mismo candado que el generador: nunca por debajo del piso comercial que le
  // toca a quien cotiza (el tarifario sale de su perfil, no del navegador)
  const rateError = firstRateError(data, rateTierOf(auth.profile?.agent_type as string | null))
  if (rateError) return { error: rateError }

  const { data: app } = await admin
    .from("applications")
    .select("id, company_id")
    .eq("id", applicationId)
    .single()
  if (!app) return { error: "Solicitud no encontrada" }

  let pdfStoragePath: string | null = null
  const pdfFileName = input.pdfFileName ?? null

  if (input.pdfBase64 && pdfFileName) {
    const buffer = Buffer.from(input.pdfBase64, "base64")
    const path = `cotizaciones/${applicationId}/${Date.now()}-${pdfFileName}`
    const { error: upErr } = await admin.storage
      .from("generated-pdfs")
      .upload(path, buffer, { contentType: "application/pdf", upsert: true })
    if (upErr) return { error: `No se pudo guardar el PDF: ${upErr.message}` }
    pdfStoragePath = path
  }

  const row = {
    application_id: applicationId,
    mcc_code: data.mccCode,
    sector_name: data.sectorName ?? null,
    sector_debit_floor: data.sectorDebitFloor ?? null,
    sector_credit_floor: data.sectorCreditFloor ?? null,
    debit_rate: data.negotiatedDebitRate ?? null,
    credit_rate: data.negotiatedCreditRate ?? null,
    amex_rate: data.negotiatedAmexRate ?? null,
    international_rate: data.negotiatedInternationalRate ?? null,
    monthly_volume: data.monthlyVolume ?? null,
    proposal_type: data.proposalType ?? "general",
    proposal_data: data as Record<string, unknown>,
    ...(pdfStoragePath ? { pdf_storage_path: pdfStoragePath, pdf_file_name: pdfFileName } : {}),
    created_by: user.id,
    updated_at: new Date().toISOString(),
  }

  const { data: saved, error } = await admin
    .from("application_quotes")
    .upsert(row, { onConflict: "application_id" })
    .select("id")
    .single()
  if (error) return { error: error.message }

  // La propuesta del generador ya encontró a su cliente: se queda pegada al
  // comercio y sale de la lista de pendientes comerciales.
  if (input.fromLeadId) {
    await admin
      .from("leads")
      .update({
        company_id: app.company_id,
        status: "ganado",
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.fromLeadId)
    revalidatePath("/admin/proposals")
  }

  await logAudit({
    actorId: user.id,
    action: "quote_saved",
    entityType: "application",
    entityId: applicationId,
    metadata: {
      application_id: applicationId,
      mcc: data.mccCode,
      debito: data.negotiatedDebitRate,
      credito: data.negotiatedCreditRate,
      ...(input.fromLeadId ? { lead_id: input.fromLeadId } : {}),
    },
  })

  revalidatePath(`/admin/applications/${applicationId}/review`)
  return { quoteId: (saved as { id: string }).id }
}

/** Envía la propuesta al cliente por correo, con el PDF adjunto. */
export async function sendQuote(
  applicationId: string
): Promise<{ error?: string; sentTo?: string }> {
  const auth = await requireQuoter()
  if ("error" in auth) return { error: auth.error }
  const { user, admin } = auth

  const { data: quote } = await admin
    .from("application_quotes")
    .select("id, pdf_storage_path, pdf_file_name, debit_rate, credit_rate, mcc_code, sector_name, proposal_data")
    .eq("application_id", applicationId)
    .maybeSingle()
  if (!quote) return { error: "Todavía no hay cotización guardada" }
  if (!quote.pdf_storage_path) return { error: "La cotización no tiene PDF; vuelve a guardarla" }

  const { data: app } = await admin
    .from("applications")
    .select("id, company_id, companies(legal_name, contact_email, operator_email), products(name)")
    .eq("id", applicationId)
    .single()
  if (!app) return { error: "Solicitud no encontrada" }

  const company = (app.companies as unknown) as {
    legal_name: string
    contact_email: string | null
    operator_email: string | null
  } | null
  const destino = company?.contact_email || company?.operator_email
  if (!destino) return { error: "El comercio no tiene correo de contacto" }

  const { data: file, error: dlErr } = await admin.storage
    .from("generated-pdfs")
    .download(quote.pdf_storage_path as string)
  if (dlErr || !file) return { error: "No se pudo leer el PDF de la propuesta" }
  const base64 = Buffer.from(await file.arrayBuffer()).toString("base64")

  const productName = ((app.products as unknown) as { name: string } | null)?.name ?? "Payefy"
  const { error: mailErr } = await sendEmail({
    to: destino,
    subject: `Tu propuesta comercial Payefy — ${company?.legal_name ?? ""}`,
    html: emailPropuestaComercial({
      companyName: company?.legal_name ?? "tu negocio",
      productName,
      debitRate: Number(quote.debit_rate),
      creditRate: Number(quote.credit_rate),
      sectorName: (quote.sector_name as string | null) ?? null,
      portalUrl: `${process.env.NEXT_PUBLIC_APP_URL}/applications/${applicationId}/documents`,
    }),
    attachments: [
      { filename: (quote.pdf_file_name as string) ?? "Propuesta_Payefy.pdf", content: base64 },
    ],
    applicationId,
  })
  if (mailErr) return { error: `No se pudo enviar: ${mailErr}` }

  await admin
    .from("application_quotes")
    .update({ sent_at: new Date().toISOString(), sent_to: destino, sent_by: user.id })
    .eq("id", quote.id as string)

  await logAudit({
    actorId: user.id,
    action: "quote_sent",
    entityType: "application",
    entityId: applicationId,
    metadata: { application_id: applicationId, to: destino },
  })

  revalidatePath(`/admin/applications/${applicationId}/review`)
  return { sentTo: destino }
}
