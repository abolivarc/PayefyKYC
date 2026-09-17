"use server"

// Propuestas comerciales adjuntas al expediente (tabla application_proposals).
// La subida se hace del lado del servidor con el service role: así no depende
// de las políticas de storage del navegador y el archivo queda fuera del
// flujo de `documents` (no lo ve el cliente ni viaja al proveedor).

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { sanitizeStorageKey } from "@/lib/documents/storage-path"
import { logAudit } from "@/lib/audit"

const MAX_SIZE_BYTES = 20 * 1024 * 1024 // límite del bucket kyc-documents
const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/heic",
  "image/heif",
])

export type ApplicationProposal = {
  id: string
  application_id: string
  storage_path: string
  file_name: string
  file_size: number | null
  mime_type: string | null
  notes: string | null
  uploaded_by: string | null
  created_at: string
  uploader_name?: string | null
}

async function requireStaff() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "No autenticado" as const }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single()
  if (!profile || profile.role === "client") return { error: "Acceso denegado" as const }
  return { user, admin }
}

export async function uploadCommercialProposal(formData: FormData) {
  const auth = await requireStaff()
  if ("error" in auth) return { error: auth.error }
  const { user, admin } = auth

  const applicationId = String(formData.get("applicationId") ?? "")
  const file = formData.get("file")
  const notes = String(formData.get("notes") ?? "").trim() || null

  if (!applicationId) return { error: "Falta la solicitud" }
  if (!(file instanceof File) || file.size === 0) return { error: "Selecciona un archivo" }
  if (file.size > MAX_SIZE_BYTES) return { error: "El archivo supera 20 MB" }
  if (file.type && !ALLOWED_MIME.has(file.type)) return { error: "Solo PDF o imagen" }

  const { data: app } = await admin
    .from("applications")
    .select("id")
    .eq("id", applicationId)
    .single()
  if (!app) return { error: "Solicitud no encontrada" }

  const storagePath = `proposals/${applicationId}/${Date.now()}-${sanitizeStorageKey(file.name)}`
  const bytes = Buffer.from(await file.arrayBuffer())

  const { error: upErr } = await admin.storage
    .from("kyc-documents")
    .upload(storagePath, bytes, { contentType: file.type || "application/pdf", upsert: false })
  if (upErr) return { error: upErr.message }

  const { data: row, error } = await admin
    .from("application_proposals")
    .insert({
      application_id: applicationId,
      storage_path: storagePath,
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type || null,
      notes,
      uploaded_by: user.id,
    })
    .select("id")
    .single()
  if (error) {
    await admin.storage.from("kyc-documents").remove([storagePath])
    return { error: error.message }
  }

  await logAudit({
    actorId: user.id,
    action: "proposal_attached",
    entityType: "application",
    entityId: applicationId,
    metadata: { proposal_id: row.id, file_name: file.name },
  })

  revalidatePath(`/admin/applications/${applicationId}/review`)
  return { success: true, id: row.id }
}

export async function deleteCommercialProposal(proposalId: string, applicationId: string) {
  const auth = await requireStaff()
  if ("error" in auth) return { error: auth.error }
  const { user, admin } = auth

  const { data: row } = await admin
    .from("application_proposals")
    .select("id, storage_path, file_name")
    .eq("id", proposalId)
    .eq("application_id", applicationId)
    .single()
  if (!row) return { error: "Propuesta no encontrada" }

  const { error } = await admin.from("application_proposals").delete().eq("id", proposalId)
  if (error) return { error: error.message }
  await admin.storage.from("kyc-documents").remove([row.storage_path])

  await logAudit({
    actorId: user.id,
    action: "proposal_removed",
    entityType: "application",
    entityId: applicationId,
    metadata: { proposal_id: proposalId, file_name: row.file_name },
  })

  revalidatePath(`/admin/applications/${applicationId}/review`)
  return { success: true }
}
