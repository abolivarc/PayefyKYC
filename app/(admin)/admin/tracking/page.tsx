import { createClient as createAdminClient } from "@supabase/supabase-js"
import { TrackingDashboard } from "@/components/admin/tracking-dashboard"

export const dynamic = "force-dynamic"

export default async function TrackingPage() {
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: applications } = await admin
    .from("applications")
    .select(
      `id, status, updated_at, submitted_at, transfer_status,
       companies(legal_name, tax_id, person_type, contact_email),
       products(code, name)`
    )
    .not("status", "in", "(archived)")
    .order("updated_at", { ascending: false })

  if (!applications?.length) {
    return <TrackingDashboard applications={[]} />
  }

  const appIds = applications.map((a) => a.id)

  const [
    { data: documents },
    { data: auditLogs },
    { data: contracts },
    { data: comments },
  ] = await Promise.all([
    admin
      .from("documents")
      .select(
        "application_id, status, is_checked, document_templates(name, is_required, code, field_type)"
      )
      .in("application_id", appIds),
    admin
      .from("audit_logs")
      .select("entity_id, action, created_at, actor_id, changes")
      .in("entity_id", appIds)
      .not("action", "like", "cron_%")
      .order("created_at", { ascending: false })
      .limit(500),
    admin
      .from("application_contracts")
      .select("application_id, kind, status")
      .in("application_id", appIds),
    admin
      .from("application_comments")
      .select("application_id, body, kind, created_at, author_id")
      .in("application_id", appIds)
      .order("created_at", { ascending: false })
      .limit(300),
  ])

  // Gather all actor IDs from audit_logs + comments
  const actorIds = [
    ...new Set([
      ...(auditLogs ?? []).map((l) => l.actor_id),
      ...(comments ?? []).map((c) => c.author_id),
    ].filter(Boolean) as string[]),
  ]
  const actorMap = new Map<string, string>()
  if (actorIds.length) {
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, full_name")
      .in("id", actorIds)
    for (const p of profiles ?? []) actorMap.set(p.id, p.full_name ?? "")
  }

  // Group by app ID
  const docsByApp = new Map<string, NonNullable<typeof documents>[number][]>()
  for (const doc of documents ?? []) {
    if (!docsByApp.has(doc.application_id)) docsByApp.set(doc.application_id, [])
    docsByApp.get(doc.application_id)!.push(doc)
  }

  const contractsByApp = new Map<string, NonNullable<typeof contracts>[number][]>()
  for (const c of contracts ?? []) {
    if (!contractsByApp.has(c.application_id)) contractsByApp.set(c.application_id, [])
    contractsByApp.get(c.application_id)!.push(c)
  }

  const logsByApp = new Map<string, NonNullable<typeof auditLogs>[number][]>()
  for (const log of auditLogs ?? []) {
    if (!logsByApp.has(log.entity_id)) logsByApp.set(log.entity_id, [])
    logsByApp.get(log.entity_id)!.push(log)
  }

  const commentsByApp = new Map<string, NonNullable<typeof comments>[number][]>()
  for (const c of comments ?? []) {
    if (!commentsByApp.has(c.application_id)) commentsByApp.set(c.application_id, [])
    commentsByApp.get(c.application_id)!.push(c)
  }

  const enriched = applications.map((app) => {
    const company = (app.companies as unknown) as {
      legal_name: string
      tax_id: string | null
      person_type: string | null
      contact_email: string | null
    } | null
    const product = (app.products as unknown) as { code: string; name: string } | null
    const appDocs = docsByApp.get(app.id) ?? []
    const appContracts = contractsByApp.get(app.id) ?? []
    const appLogs = logsByApp.get(app.id) ?? []
    const appComments = commentsByApp.get(app.id) ?? []

    const total = appDocs.length
    // check_or_upload satisfecho si is_checked OR storage_path; upload satisfecho si status != pending_upload
    const uploaded = appDocs.filter((d) => {
      const tmpl = (d.document_templates as unknown) as { field_type?: string } | null
      if (tmpl?.field_type === "check_or_upload") return d.is_checked || d.status !== "pending_upload"
      return d.status !== "pending_upload"
    }).length
    const approved = appDocs.filter((d) => d.status === "approved").length

    // Contract dots: keyed by kind
    const contractMap: Record<string, string> = {}
    for (const c of appContracts) contractMap[c.kind] = c.status

    // Merge audit_logs + comments into one bitácora, sorted by date desc
    type BitacoraEntry = { createdAt: string; label: string; actorName: string }
    const bitacora: BitacoraEntry[] = []

    for (const log of appLogs.slice(0, 12)) {
      bitacora.push({
        createdAt: log.created_at as string,
        label: log.action as string,
        actorName: log.actor_id ? (actorMap.get(log.actor_id as string) ?? "Usuario") : "Sistema",
      })
    }
    for (const c of appComments.slice(0, 8)) {
      bitacora.push({
        createdAt: c.created_at,
        label: c.body,
        actorName: c.author_id ? (actorMap.get(c.author_id) ?? "Usuario") : "Sistema",
      })
    }
    bitacora.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    return {
      id: app.id,
      status: app.status as string,
      transferStatus: (app.transfer_status as string | null) ?? "not_sent",
      updatedAt: app.updated_at as string,
      company: {
        legalName: company?.legal_name ?? "—",
        taxId: company?.tax_id ?? null,
        personType: company?.person_type ?? null,
        contactEmail: company?.contact_email ?? null,
      },
      product: {
        code: product?.code ?? "",
        name: product?.name ?? "",
      },
      docs: { total, uploaded, approved },
      contracts: {
        payefy: contractMap["payefy_service"] ?? null,
        transfer_increase: contractMap["transfer_increase_letter"] ?? null,
        transfer_contract: contractMap["transfer_contract"] ?? null,
      },
      documentList: appDocs.map((d) => {
        const tmpl = (d.document_templates as unknown) as {
          name: string
          is_required: boolean
          code: string
          field_type: string
        } | null
        return {
          name: tmpl?.name ?? "Documento",
          status: d.status as string,
          isRequired: tmpl?.is_required ?? false,
          code: tmpl?.code ?? "",
          fieldType: tmpl?.field_type ?? "upload",
          isChecked: d.is_checked,
        }
      }),
      bitacora: bitacora.slice(0, 12),
    }
  })

  return <TrackingDashboard applications={enriched} />
}
