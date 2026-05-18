import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { buttonVariants } from "@/components/ui/button"

type AppStatus =
  | "draft"
  | "documents_pending"
  | "in_compliance_review"
  | "changes_requested"
  | "approved_compliance"
  | "in_provider_review"
  | "provider_changes_requested"
  | "approved_provider"
  | "contracts_pending"
  | "contracts_signed"
  | "activation_pending"
  | "activated"
  | "rejected"
  | "archived"

const STATUS_LABELS: Record<string, string> = {
  draft: "Borrador",
  documents_pending: "Pendiente de documentos",
  in_compliance_review: "En revisión de compliance",
  changes_requested: "Cambios solicitados",
  approved_compliance: "Aprobado por compliance",
  in_provider_review: "En revisión del proveedor",
  provider_changes_requested: "Cambios solicitados por proveedor",
  approved_provider: "Aprobado por proveedor",
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
  provider_changes_requested: "destructive",
  approved_provider: "success",
  contracts_pending: "warning",
  contracts_signed: "success",
  activation_pending: "warning",
  activated: "success",
  rejected: "destructive",
  archived: "pending",
}

export default async function ClientDashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return <p className="p-8 text-muted-foreground">Cargando sesión...</p>
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single()

  const { data: membership } = await supabase
    .from("company_users")
    .select("company_id, companies(id, legal_name, tax_id, terminal_type)")
    .eq("user_id", user.id)
    .single()

  const name = profile?.full_name || user.email || "Cliente"

  // Sin empresa → bienvenida
  if (!membership) {
    return (
      <div className="p-6 sm:p-8 max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Bienvenido, {name}</h1>
          <p className="mt-1 text-muted-foreground">
            Aún no has iniciado tu proceso KYC. Elige un producto para comenzar.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Tarjetas de crédito empresariales</CardTitle>
              <CardDescription>
                Líneas de crédito para financiar el crecimiento de tu negocio.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/applications/new?product=cards" className={buttonVariants({ variant: "default" })}>
                Iniciar KYC tarjetas
              </Link>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Terminales TPV</CardTitle>
              <CardDescription>
                Acepta pagos con tarjeta en tu punto de venta o e-commerce.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/applications/new?product=terminals" className={buttonVariants({ variant: "outline" })}>
                Iniciar KYC terminales
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Tiene empresa → mostrar sus applications
  const company = ((membership as unknown) as { company_id: string; companies: { id: string; legal_name: string; tax_id: string } | null }).companies
  const companyId = membership.company_id

  const { data: applications } = await supabase
    .from("applications")
    .select(
      "id, status, product_id, products(name, code), documents(id, status)"
    )
    .eq("company_id", companyId)

  const appList = applications ?? []
  const appCodes = appList.map(
    (a) => ((a.products as unknown) as { code: string } | null)?.code
  )
  const missingProduct = !appCodes.includes("cards")
    ? "cards"
    : !appCodes.includes("terminals")
    ? "terminals"
    : null

  return (
    <div className="p-6 sm:p-8 max-w-4xl mx-auto">
      <div className="mb-2">
        <h1 className="text-2xl font-bold">Bienvenido, {name}</h1>
      </div>
      {company && (
        <p className="text-sm text-muted-foreground mb-6">
          Empresa: <span className="font-medium text-foreground">{company.legal_name}</span>{" "}
          <span className="text-xs">({company.tax_id})</span>
        </p>
      )}

      {appList.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Sin solicitudes activas</CardTitle>
            <CardDescription>
              Aún no tienes solicitudes. Inicia tu proceso KYC.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/applications/new" className={buttonVariants({ variant: "default" })}>
              Nueva solicitud
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {appList.map((app) => {
            const docs = (app.documents as { id: string; status: string }[]) ?? []
            const total = docs.length
            const done = docs.filter((d) =>
              ["approved", "pending_review"].includes(d.status)
            ).length
            const pct = total > 0 ? Math.round((done / total) * 100) : 0
            const product = (app.products as unknown) as { name: string; code: string } | null
            const status = app.status as AppStatus

            return (
              <Card key={app.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{product?.name ?? "Producto"}</Badge>
                      <Badge variant={STATUS_VARIANT[status] ?? "pending"}>
                        {STATUS_LABELS[status] ?? status}
                      </Badge>
                    </div>
                    <Link href={`/applications/${app.id}/documents`} className={buttonVariants({ size: "sm", variant: "outline" })}>
                      Ver expediente
                    </Link>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 pt-0">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Documentos entregados</span>
                    <span>
                      {done} / {total}
                    </span>
                  </div>
                  <Progress value={pct} />
                </CardContent>
              </Card>
            )
          })}

          {missingProduct && (
            <div className="pt-2">
              <Link href={`/applications/new?product=${missingProduct}`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
                + Agregar también{" "}
                {missingProduct === "cards" ? "Tarjetas de crédito" : "Terminales TPV"}
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
