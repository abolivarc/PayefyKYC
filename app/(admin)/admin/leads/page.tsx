import { createClient } from "@/lib/supabase/server"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"

export default async function LeadsPage() {
  const supabase = await createClient()

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, email, created_at")
    .eq("role", "client")
    .order("created_at", { ascending: false })

  const { data: members } = await supabase
    .from("company_users")
    .select("user_id")

  const memberIds = new Set((members ?? []).map((m) => m.user_id))
  const leads = (profiles ?? []).filter((p) => !memberIds.has(p.id))

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Leads</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Clientes registrados que aún no han iniciado su proceso KYC.
        </p>
      </div>

      {leads.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No hay leads sin empresa registrada.
        </p>
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Correo electrónico</TableHead>
                <TableHead>Registro</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.map((lead) => (
                <TableRow key={lead.id}>
                  <TableCell className="font-medium">
                    {lead.full_name || "—"}
                  </TableCell>
                  <TableCell className="text-sm">{lead.email}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(lead.created_at), {
                      addSuffix: true,
                      locale: es,
                    })}
                  </TableCell>
                  <TableCell>
                    <Badge variant="pending">Sin empresa</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
