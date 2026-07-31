"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import type { ProposalData } from "@/lib/proposals/types"
import { firstRateError } from "@/lib/proposals/rate-floors"

function adminDb() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function requireStaff() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  // El layout de admin ya restringe el acceso a staff; validamos sesión aquí.
  return user
}

// Guarda (o actualiza) el lead generado por el wizard de propuestas
export async function saveLead(
  data: Partial<ProposalData>,
  existingLeadId?: string
): Promise<{ error?: string; leadId?: string }> {
  const user = await requireStaff()
  if (!user) return { error: "No autenticado" }

  // El piso se valida también aquí: la propuesta se arma en el navegador, así
  // que este es el único punto que no se puede saltar retrocediendo un paso
  // ni tocando el estado del wizard.
  const rateError = firstRateError(data)
  if (rateError) return { error: rateError }

  const admin = adminDb()
  const row = {
    created_by: user.id,
    business_name: data.businessName ?? "Sin nombre",
    contact_name: data.contactName ?? null,
    contact_email: data.contactEmail ?? null,
    contact_phone: data.contactPhone ?? null,
    entity_type: data.entityType ?? null,
    product_type: data.productType ?? null,
    mcc_code: data.mccCode ?? null,
    sector_name: data.sectorFamilia
      ? `${data.sectorFamilia} — ${data.sectorName ?? ""}`
      : (data.sectorName ?? null),
    monthly_volume: data.monthlyVolume ?? null,
    average_ticket: data.averageTicket ?? null,
    proposal_type: data.proposalType ?? null,
    proposal_data: data as Record<string, unknown>,
    updated_at: new Date().toISOString(),
  }

  if (existingLeadId) {
    const { error } = await admin.from("leads").update(row).eq("id", existingLeadId)
    if (error) return { error: error.message }
    revalidatePath("/admin/proposals")
    return { leadId: existingLeadId }
  }

  const { data: inserted, error } = await admin
    .from("leads")
    .insert(row)
    .select("id")
    .single()
  if (error) return { error: error.message }

  revalidatePath("/admin/proposals")
  return { leadId: inserted.id }
}

export async function updateLeadStatus(
  leadId: string,
  status: "propuesta" | "negociacion" | "ganado" | "perdido"
): Promise<{ error?: string }> {
  const user = await requireStaff()
  if (!user) return { error: "No autenticado" }

  const { error } = await adminDb()
    .from("leads")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", leadId)
  if (error) return { error: error.message }

  revalidatePath("/admin/proposals")
  return {}
}

// "Casar" un lead con un cliente KYC real (venta concretada)
export async function linkLeadToCompany(
  leadId: string,
  companyId: string | null
): Promise<{ error?: string }> {
  const user = await requireStaff()
  if (!user) return { error: "No autenticado" }

  const update: Record<string, unknown> = {
    company_id: companyId,
    updated_at: new Date().toISOString(),
  }
  // Al vincular con un cliente real, el lead pasa a ganado
  if (companyId) update.status = "ganado"

  const { error } = await adminDb().from("leads").update(update).eq("id", leadId)
  if (error) return { error: error.message }

  revalidatePath("/admin/proposals")
  return {}
}

export async function deleteLead(leadId: string): Promise<{ error?: string }> {
  const user = await requireStaff()
  if (!user) return { error: "No autenticado" }

  const { error } = await adminDb().from("leads").delete().eq("id", leadId)
  if (error) return { error: error.message }

  revalidatePath("/admin/proposals")
  return {}
}
