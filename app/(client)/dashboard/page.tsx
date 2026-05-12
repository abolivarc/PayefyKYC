import { createClient } from "@/lib/supabase/server"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default async function ClientDashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return <p className="p-8 text-muted-foreground">Cargando...</p>

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single()

  const name = profile?.full_name || user.email || "Cliente"

  return (
    <div className="p-6 sm:p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Bienvenido, {name}</h1>
        <p className="mt-1 text-muted-foreground">
          Aún no has iniciado tu proceso KYC.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Tarjetas de crédito empresariales</CardTitle>
            <CardDescription>
              Accede a líneas de crédito para financiar el crecimiento de tu negocio con Payefy.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button disabled>Iniciar KYC tarjetas</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
