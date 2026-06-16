import { createClient } from "@/lib/supabase/server"
import { ClientsTable } from "@/components/admin/clients-table"

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

  const { data: companies } = await supabase
    .from("companies")
    .select(
      `id, legal_name, tax_id, created_at, applications(id, status, products(name, code))`
    )
    .order("created_at", { ascending: false })

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
          <h1
            className="text-2xl font-extrabold tracking-tight"
            style={{
              fontFamily: "var(--font-display)",
              color: "var(--admin-text, #0F1B2A)",
              letterSpacing: "-0.02em",
            }}
          >
            Clientes
          </h1>
          <p
            className="text-sm mt-1"
            style={{ color: "var(--admin-text-muted, #5A6B7B)" }}
          >
            <strong style={{ color: "var(--admin-text, #0F1B2A)" }}>
              {list.length}
            </strong>{" "}
            empresas registradas
            {reviewCount > 0 && (
              <>
                {" "}
                ·{" "}
                <strong style={{ color: "var(--admin-text, #0F1B2A)" }}>
                  {reviewCount}
                </strong>{" "}
                en revisión
              </>
            )}
          </p>
        </div>
      </div>
      <ClientsTable companies={list} isSuperAdmin={isSuperAdmin} />
    </div>
  )
}
