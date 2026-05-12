import { createClient } from "@/lib/supabase/server"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

function getPanelTitle(role: string | null): string {
  switch (role) {
    case "super_admin":
    case "sales_director":
      return "Panel de administración"
    case "compliance":
      return "Panel de Compliance"
    case "sales_agent":
      return "Mis clientes asignados"
    case "onboarding":
      return "Panel de Onboarding"
    case "accounting":
      return "Panel de Contabilidad"
    default:
      return "Panel de administración"
  }
}

export default async function AdminDashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return <p className="p-8 text-muted-foreground">Cargando sesión...</p>
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single()

  const name = profile?.full_name || user.email || "Usuario"
  const title = getPanelTitle(profile?.role ?? null)

  return (
    <div className="p-6 sm:p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="mt-1 text-muted-foreground">Bienvenido, {name}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Actividad reciente</CardTitle>
          <CardDescription>
            Aún no hay actividad. Los clientes que se registren aparecerán aquí.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  )
}
