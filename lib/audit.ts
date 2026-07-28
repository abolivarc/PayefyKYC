import { createClient as createServiceClient } from "@supabase/supabase-js"

export async function logAudit({
  actorId,
  action,
  entityType,
  entityId,
  changes,
  metadata,
}: {
  actorId: string
  action: string
  entityType: "application" | "document" | "company" | "profile"
  entityId: string
  changes?: Record<string, unknown>
  metadata?: Record<string, unknown>
}) {
  const supabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  await supabase.from("audit_logs").insert({
    actor_id: actorId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    changes: changes ?? null,
    metadata: metadata ?? null,
  })
}
