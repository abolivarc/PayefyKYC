"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { logAudit } from "@/lib/audit"

const CURRENT_TERMS_VERSION = "v1-2026"

export async function recordTermsAcceptance() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Find the company this user belongs to
  const { data: membership } = await supabase
    .from("company_users")
    .select("company_id")
    .eq("user_id", user.id)
    .single()

  if (!membership) {
    // No company yet — accept was recorded on user metadata; let them proceed
    redirect("/applications/new")
  }

  await admin
    .from("companies")
    .update({
      terms_accepted_at: new Date().toISOString(),
      terms_accepted_by: user.id,
      terms_version: CURRENT_TERMS_VERSION,
    })
    .eq("id", membership.company_id)

  await logAudit({
    actorId: user.id,
    action: "terms_accepted",
    entityType: "company",
    entityId: membership.company_id,
    metadata: { version: CURRENT_TERMS_VERSION },
  })

  revalidatePath("/", "layout")
  redirect("/dashboard")
}
