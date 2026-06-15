"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"

export type ContractKind =
  | "payefy_service"
  | "transfer_increase_letter"
  | "transfer_contract"

export type ContractStatus = "pending" | "sent" | "signed" | "not_applicable"

export async function upsertContract({
  applicationId,
  kind,
  status,
  externalLink,
  signedDocPath,
}: {
  applicationId: string
  kind: ContractKind
  status: ContractStatus
  externalLink?: string
  signedDocPath?: string
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "No autenticado" }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const now = new Date().toISOString()
  const updateData: Record<string, unknown> = { status, updated_at: now }
  if (externalLink !== undefined) updateData.external_link = externalLink
  if (signedDocPath !== undefined) updateData.signed_doc_path = signedDocPath
  if (status === "sent") updateData.sent_at = now
  if (status === "signed") updateData.signed_at = now

  const { error } = await admin
    .from("application_contracts")
    .upsert(
      { application_id: applicationId, kind, ...updateData },
      { onConflict: "application_id,kind" }
    )

  if (error) return { error: error.message }

  const kindLabels: Record<ContractKind, string> = {
    payefy_service: "Contrato Payefy",
    transfer_increase_letter: "Carta aumento Transfer",
    transfer_contract: "Contrato Transfer",
  }
  const statusLabels: Record<ContractStatus, string> = {
    pending: "pendiente",
    sent: "enviado",
    signed: "firmado",
    not_applicable: "no aplica",
  }

  await admin.from("application_comments").insert({
    application_id: applicationId,
    author_id: user.id,
    body: `${kindLabels[kind]} marcado como ${statusLabels[status]}${externalLink ? ` — ${externalLink}` : ""}`,
    kind: "status",
    metadata: { contract_kind: kind, contract_status: status, external_link: externalLink ?? null },
  })

  revalidatePath("/admin/tracking")
  return { success: true }
}
