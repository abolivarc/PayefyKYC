"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"

export async function deleteClient(companyId: string) {
  const supabase = await createClient()

  // 1. Verificar que el caller es super_admin — server-side, no confiar en el cliente
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "No autenticado" }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profile?.role !== "super_admin") {
    return { error: "Sin permisos para eliminar clientes" }
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 2. Leer datos de la empresa ANTES de borrar (para el audit log)
  const { data: company } = await admin
    .from("companies")
    .select("legal_name, tax_id, created_by")
    .eq("id", companyId)
    .single()

  if (!company) return { error: "Cliente no encontrado" }

  // 3. Registrar en audit_logs ANTES del borrado (actor_id sobrevive con SET NULL)
  await admin.from("audit_logs").insert({
    actor_id: user.id,
    action: "client_deleted",
    entity_type: "company",
    entity_id: companyId,
    changes: {
      legal_name: company.legal_name,
      tax_id: company.tax_id,
    },
    metadata: { deleted_by: user.email },
  })

  // 4. Borrar empresa — CASCADE elimina: applications, documents,
  //    application_contracts, application_comments, form_submissions,
  //    notifications (related_application_id), company_users, product_orders
  const { error: delError } = await admin
    .from("companies")
    .delete()
    .eq("id", companyId)

  if (delError) return { error: delError.message }

  // 5. Borrar auth user solo si no queda ligado a otras empresas
  if (company.created_by) {
    const { count } = await admin
      .from("companies")
      .select("id", { count: "exact", head: true })
      .eq("created_by", company.created_by)

    if (count === 0) {
      await admin.auth.admin.deleteUser(company.created_by)
    }
  }

  revalidatePath("/admin/clients")
  return { success: true, legalName: company.legal_name }
}
