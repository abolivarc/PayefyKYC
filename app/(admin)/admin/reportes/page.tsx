import { createClient } from "@supabase/supabase-js"
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns"
import { es } from "date-fns/locale"
import { ReportsDashboard, type AppSummary, type MonthlyPoint } from "@/components/admin/reports-dashboard"

export const dynamic = "force-dynamic"
export const metadata = { title: "Reportes | Payefy Admin" }

export default async function ReportesPage() {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Fetch apps + docs in parallel
  const { data: applications } = await admin
    .from("applications")
    .select("id, status, created_at, updated_at, products(code, name)")
    .not("status", "in", "(archived)")

  const appIds = (applications ?? []).map((a) => a.id)

  const [{ data: documents }, { data: activationLogs }] = await Promise.all([
    appIds.length
      ? admin.from("documents").select("application_id, status").in("application_id", appIds)
      : Promise.resolve({ data: [] as { application_id: string; status: string }[] }),
    admin
      .from("audit_logs")
      .select("created_at")
      .eq("action", "application_activated")
      .gte("created_at", subMonths(new Date(), 6).toISOString()),
  ])

  // Build doc count map
  const docsByApp = new Map<string, { total: number; uploaded: number }>()
  for (const doc of documents ?? []) {
    const cur = docsByApp.get(doc.application_id) ?? { total: 0, uploaded: 0 }
    cur.total++
    if (doc.status !== "pending_upload") cur.uploaded++
    docsByApp.set(doc.application_id, cur)
  }

  // Build app summaries
  const apps: AppSummary[] = (applications ?? []).map((app) => {
    const product = (app.products as unknown) as { code: string; name: string } | null
    const docs = docsByApp.get(app.id) ?? { total: 0, uploaded: 0 }
    const pct = docs.total > 0 ? Math.round((docs.uploaded / docs.total) * 100) : 0
    return {
      id: app.id,
      status: app.status as string,
      createdAt: app.created_at as string,
      updatedAt: app.updated_at as string,
      productCode: product?.code ?? "",
      productName: product?.name ?? "",
      docsPct: pct,
    }
  })

  // Monthly activations for last 6 months
  const monthlyActivations: MonthlyPoint[] = Array.from({ length: 6 }, (_, i) => {
    const d = subMonths(new Date(), 5 - i)
    const start = startOfMonth(d)
    const end = endOfMonth(d)
    const count = (activationLogs ?? []).filter((l) => {
      const t = new Date(l.created_at as string)
      return t >= start && t <= end
    }).length
    return { month: format(d, "MMM yyyy", { locale: es }), count }
  })

  return <ReportsDashboard apps={apps} monthlyActivations={monthlyActivations} />
}
