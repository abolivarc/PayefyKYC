import Link from "next/link"
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
import { buttonVariants } from "@/components/ui/button"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"

const STATUS_LABELS: Record<string, string> = {
  draft: "Borrador",
  documents_pending: "Pendiente docs",
  in_compliance_review: "En revisión",
  changes_requested: "Cambios solicitados",
  approved_compliance: "Aprobado compliance",
  in_provider_review: "En revisión proveedor",
  approved_provider: "Aprobado proveedor",
  contracts_pending: "Contratos pendientes",
  contracts_signed: "Contratos firmados",
  activation_pending: "Activación pendiente",
  activated: "Activo ✓",
  rejected: "Rechazado",
  archived: "Archivado",
}

const STATUS_VARIANT: Record<
  string,
  "default" | "success" | "warning" | "destructive" | "pending"
> = {
  draft: "pending",
  documents_pending: "warning",
  in_compliance_review: "warning",
  changes_requested: "destructive",
  approved_compliance: "success",
  in_provider_review: "warning",
  approved_provider: "success",
  contracts_pending: "warning",
  contracts_signed: "success",
  activation_pending: "warning",
  activated: "success",
  rejected: "destructive",
  archived: "pending",
}

export default async function ClientsPage() {
  const supabase = await createClient()

  const { data: companies } = await supabase
    .from("companies")
    .select(
      `id, legal_name, tax_id, created_at,
       applications(id, status, products(name, code))`
    )
    .order("created_at", { ascending: false })

  if (!companies?.length) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Clientes</h1>
        <p className="text-muted-foreground">
          Aún no hay clientes registrados.
        </p>
      </div>
    )
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Clientes</h1>
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Empresa</TableHead>
              <TableHead>RFC</TableHead>
              <TableHead>Producto(s) / Estado</TableHead>
              <TableHead>Registro</TableHead>
              <TableHead className="text-right">Acción</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {companies.map((company) => {
              const apps = ((company.applications as unknown) as {
                id: string
                status: string
                products: { name: string; code: string } | null
              }[]) ?? []
              const timeAgo = formatDistanceToNow(
                new Date(company.created_at),
                { addSuffix: true, locale: es }
              )

              return (
                <TableRow key={company.id}>
                  <TableCell className="font-medium">
                    {company.legal_name}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {company.tax_id}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1.5">
                      {apps.map((app) => (
                        <div key={app.id} className="flex items-center gap-1">
                          <Badge variant="outline" className="text-xs">
                            {app.products?.name ?? "Producto"}
                          </Badge>
                          <Badge
                            variant={STATUS_VARIANT[app.status] ?? "pending"}
                            className="text-xs"
                          >
                            {STATUS_LABELS[app.status] ?? app.status}
                          </Badge>
                        </div>
                      ))}
                      {apps.length === 0 && (
                        <span className="text-xs text-muted-foreground">
                          Sin solicitudes
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {timeAgo}
                  </TableCell>
                  <TableCell className="text-right">
                    {apps[0] && (
                      <Link
                        href={`/admin/applications/${apps[0].id}/review`}
                        className={buttonVariants({ size: "sm", variant: "outline" })}
                      >
                        Revisar
                      </Link>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
