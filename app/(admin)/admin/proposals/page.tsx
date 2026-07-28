import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { LeadsTable, type LeadRow } from "@/components/proposals/leads-table"
import { getStaffContext } from "@/lib/auth/staff"
import { Plus } from "lucide-react"

export const metadata = { title: "Propuestas | Payefy Admin" }

export default async function ProposalsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return notFound()

  // El agente comercial solo ve las propuestas que él generó
  const ctx = await getStaffContext()

  let leadsQuery = supabase
    .from("leads")
    .select(
      "id, created_at, business_name, contact_name, contact_email, contact_phone, sector_name, monthly_volume, product_type, proposal_type, proposal_data, status, company_id, companies(legal_name)"
    )
  if (ctx?.isAgent) leadsQuery = leadsQuery.eq("created_by", ctx.userId)

  let companiesQuery = supabase.from("companies").select("id, legal_name")
  if (ctx?.isAgent) companiesQuery = companiesQuery.eq("assigned_agent_id", ctx.userId)

  const [{ data: leads }, { data: companies }] = await Promise.all([
    leadsQuery.order("created_at", { ascending: false }),
    companiesQuery.order("legal_name"),
  ])

  const active = (leads ?? []).filter((l) => !["ganado", "perdido"].includes(l.status))

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100%" }}>
      <header style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, padding: "24px 32px 16px", flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 800, letterSpacing: "-.02em", lineHeight: 1.1, color: "var(--admin-text, #0F1B2A)" }}>
            Propuestas y Leads
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--admin-text-muted, #5A6B7B)" }}>
            <b style={{ color: "var(--admin-text, #0F1B2A)", fontWeight: 600 }}>{active.length}</b>{" "}
            lead(s) activos · {(leads ?? []).length} en total
          </p>
        </div>
        <Link
          href="/admin/proposals/new"
          className="inline-flex items-center gap-2 rounded-md text-sm font-semibold transition-opacity hover:opacity-90"
          style={{ background: "#004238", color: "#AEFF99", padding: "10px 16px", textDecoration: "none" }}
        >
          <Plus size={16} />
          Nueva propuesta
        </Link>
      </header>
      <div style={{ padding: "0 32px 32px" }}>
        <LeadsTable
          leads={(leads ?? []) as unknown as LeadRow[]}
          companies={companies ?? []}
        />
      </div>
    </div>
  )
}
