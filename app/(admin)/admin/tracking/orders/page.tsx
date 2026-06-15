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
    <div className="p-6 max-w-5xl">
      <div className="mb-6">
        <Link href="/admin/tracking" className="text-sm text-muted-foreground hover:text-foreground">
          ← Seguimiento
        </Link>
        <h1 className="text-xl font-bold mt-1">Pedidos de plásticos / terminales</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {orders?.length ?? 0} pedido(s) en total
        </p>
      </div>

      <OrdersTable orders={orders ?? []} />
    </div>
  )
}
