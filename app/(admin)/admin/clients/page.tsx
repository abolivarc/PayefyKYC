import { createClient } from "@/lib/supabase/server"
import { ClientsGrid } from "@/components/admin/clients-grid"

export default async function ClientsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { data: profile } = user
    ? await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single()
    : { data: null }
  const isSuperAdmin = profile?.role === "super_admin"
  // El agente comercial solo ve los comercios que él dio de alta
  const isAgent = profile?.role === "sales_agent"

  let query = supabase
    .from("companies")
    .select(
      `id, legal_name, internal_alias, tax_id, created_at, applications(id, status, products(name, code))`
    )
  if (isAgent && user) query = query.eq("assigned_agent_id", user.id)

  const { data: companies } = await query.order("created_at", { ascending: false })

  const list = (companies ?? []).map((c) => ({
    ...c,
    applications: (
      c.applications as unknown as {
        id: string
        status: string
        products: { name: string; code: string } | null
      }[]
    ) ?? [],
  }))

  const reviewCount = list.filter((c) =>
    c.applications.some((a) =>
      [
        "documents_pending",
        "in_compliance_review",
        "in_provider_review",
        "activation_pending",
        "contracts_pending",
      ].includes(a.status)
    )
  ).length

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <h1 className="font-heading text-2xl font-extrabold tracking-tight text-foreground">
            Clientes
          </h1>
          <p className="text-sm mt-1 text-muted-foreground">
            <strong className="text-foreground">{list.length}</strong>{" "}
            empresas registradas
            {reviewCount > 0 && (
              <>
                {" "}
                ·{" "}
                <strong className="text-foreground">{reviewCount}</strong>{" "}
                en revisión
              </>
            )}
          </p>
        </div>
      </div>
      <ClientsGrid companies={list} isSuperAdmin={isSuperAdmin} />
    </div>
  )
}
