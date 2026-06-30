"use server"

import { createClient } from "@/lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"

function serviceDb() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>

export async function addAdditionalDocument(
  applicationId: string,
  title?: string
): Promise<{ documentId: string } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "No autenticado" }

  const sb = serviceDb()

  const { data: app } = await sb
    .from("applications")
    .select("company_id")
    .eq("id", applicationId)
    .single()
  if (!app) return { error: "Solicitud no encontrada" }

  // Authorize: company member OR any staff role (role != 'client')
  const { data: profile } = await sb
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  const isStaff = profile?.role && profile.role !== "client"

  if (!isStaff) {
    const { data: membership } = await sb
      .from("company_users")
      .select("id")
      .eq("company_id", app.company_id)
      .eq("user_id", user.id)
      .single()
    if (!membership) return { error: "Acceso denegado" }
  }

  // template_id is NULL intentionally — migration 20260630120000 makes it nullable
  const payload: AnyRecord = {
    application_id: applicationId,
    template_id:    null,
    title:          title?.trim() || "Documento sin título",
    status:         "pending_upload",
    uploaded_by:    user.id,
  }

  const { data: doc, error } = await sb
    .from("documents")
    .insert(payload as never)
    .select("id")
    .single()

  if (error || !doc) return { error: error?.message ?? "Error al crear documento" }

  return { documentId: (doc as AnyRecord).id as string }
}
