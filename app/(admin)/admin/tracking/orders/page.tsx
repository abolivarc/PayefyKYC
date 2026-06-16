import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import Link from "next/link"
import { OrdersTable } from "@/components/admin/orders-table"

export const metadata = { title: "Pedidos | Payefy Admin" }

export default async function OrdersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return notFound()

  const { data: orders } = await supabase
    .from("product_orders")
    .select(`
      id, product_code, quantity, shipping_address, notes, status, created_at,
      companies(legal_name, operator_email),
      applications(id)
    `)
    .order("created_at", { ascending: false })

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100%" }}>
      <header style={{ padding: "24px 32px 16px" }}>
        <Link
          href="/admin/tracking"
          style={{ fontSize: 13, color: "var(--admin-text-muted, #5A6B7B)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 8 }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--admin-text, #0F1B2A)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--admin-text-muted, #5A6B7B)")}
        >
          ← Seguimiento
        </Link>
        <h1 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 800, letterSpacing: "-.02em", lineHeight: 1.1, color: "var(--admin-text, #0F1B2A)" }}>
          Pedidos
        </h1>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--admin-text-muted, #5A6B7B)" }}>
          <b style={{ color: "var(--admin-text, #0F1B2A)", fontWeight: 600 }}>{orders?.length ?? 0}</b> pedido(s) en total
        </p>
      </header>
      <div style={{ padding: "0 32px 32px" }}>
        <OrdersTable orders={orders ?? []} />
      </div>
    </div>
  )
}
