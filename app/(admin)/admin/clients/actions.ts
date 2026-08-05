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

/**
 * Alias interno del comercio: cómo se le conoce en el día a día.
 *
 * Las razones sociales no se parecen al nombre con el que el cliente se
 * presenta, así que sin esto no hay forma de saber de quién habla cuando
 * escribe. Lo pueden editar admin y compliance; el cliente nunca lo ve.
 */
export async function setInternalAlias(companyId: string, alias: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "No autenticado" }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  // Todo el staff menos el agente comercial, que solo ve su propia cartera
  const permitidos = ["super_admin", "admin", "compliance"]
  if (!profile?.role || !permitidos.includes(profile.role)) {
    return { error: "Sin permisos para editar el alias" }
  }

  const limpio = alias.trim().slice(0, 80)

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: antes } = await admin
    .from("companies")
    .select("internal_alias")
    .eq("id", companyId)
    .single()

  const { error } = await admin
    .from("companies")
    .update({ internal_alias: limpio || null })
    .eq("id", companyId)
  if (error) return { error: error.message }

  await admin.from("audit_logs").insert({
    actor_id: user.id,
    action: "company_alias_updated",
    entity_type: "company",
    entity_id: companyId,
    metadata: {
      company_id: companyId,
      antes: (antes as { internal_alias?: string } | null)?.internal_alias ?? null,
      despues: limpio || null,
    },
  })

  revalidatePath("/admin/clients")
  revalidatePath(`/admin/applications/${companyId}/review`)
  return { success: true, alias: limpio || null }
}
