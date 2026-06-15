import { notFound } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ProductOrderForm } from "@/components/client/product-order-form"

const PIPELINE: { key: string; label: string }[] = [
  { key: "draft", label: "Borrador" },
  { key: "documents_pending", label: "Documentos pendientes" },
  { key: "in_compliance_review", label: "En revisión de compliance" },
  { key: "changes_requested", label: "Cambios solicitados (compliance)" },
  { key: "approved_compliance", label: "Aprobado por compliance" },
  { key: "in_provider_review", label: "En revisión del proveedor" },
  { key: "provider_changes_requested", label: "Cambios solicitados por proveedor" },
  { key: "approved_provider", label: "Aprobado por proveedor" },
  { key: "contracts_pending", label: "Contratos pendientes" },
  { key: "contracts_signed", label: "Contratos firmados" },
  { key: "activation_pending", label: "Activación pendiente" },
  { key: "activated", label: "Activo ✓" },
]

const STATUS_ORDER = PIPELINE.map((s) => s.key)

export default async function StatusPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: appId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return notFound()

  // Usamos service_role porque is_company_member falla en edge/serverless
  const { createClient: createAdmin } = await import("@supabase/supabase-js")
  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: app } = await admin
    .from("applications")
    .select("id, status, rejection_reason, products(name, code), company_id, companies(legal_name)")
    .eq("id", appId)
    .single()

  if (!app) return notFound()

  // Verificar membresía manualmente
  const { data: membership } = await admin
    .from("company_users")
    .select("id")
    .eq("company_id", app.company_id)
    .eq("user_id", user.id)
    .single()

  if (!membership) return notFound()

  const currentStatus = app.status as string
  const isRejected = currentStatus === "rejected"
  const currentIdx = STATUS_ORDER.indexOf(currentStatus)

  return (
    <div className="p-6 sm:p-8 max-w-2xl mx-auto">
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Dashboard
        </Link>
        <h1 className="text-xl font-bold mt-1">
          Estado de tu solicitud —{" "}
          {((app.products as unknown) as { name: string } | null)?.name ?? "Producto"}
        </h1>
      </div>

      {isRejected ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-2">
          <p className="font-semibold text-destructive">Solicitud rechazada</p>
          {app.rejection_reason && (
            <p className="text-sm text-muted-foreground">{app.rejection_reason}</p>
          )}
          <Link
            href={`/applications/${appId}/documents`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-2")}
          >
            Ver expediente
          </Link>
        </div>
      ) : (
        <div className="relative pl-6 space-y-0">
          {PIPELINE.map((stage, i) => {
            const isDone = i < currentIdx
            const isCurrent = i === currentIdx

            // Ocultar stages condicionales si no son el estado actual
            if (
              stage.key === "changes_requested" &&
              currentStatus !== "changes_requested" &&
              i > currentIdx
            )
              return null
            if (
              stage.key === "provider_changes_requested" &&
              currentStatus !== "provider_changes_requested" &&
              i > currentIdx
            )
              return null

            return (
              <div key={stage.key} className="relative flex gap-4 pb-6 last:pb-0">
                {/* Línea vertical */}
                {i < PIPELINE.length - 1 && (
                  <div
                    className={`absolute left-0 top-5 bottom-0 w-px ${
                      isDone ? "bg-emerald-500" : "bg-border"
                    }`}
                    style={{ left: "-1.25rem" }}
                  />
                )}
                {/* Indicador */}
                <div
                  className={`absolute -left-[1.375rem] flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                    isDone
                      ? "border-emerald-500 bg-emerald-500"
                      : isCurrent
                      ? "border-primary bg-primary"
                      : "border-border bg-background"
                  }`}
                >
                  {isDone && (
                    <svg
                      className="h-3 w-3 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                  {isCurrent && (
                    <div className="h-2 w-2 rounded-full bg-white" />
                  )}
                </div>
                {/* Texto */}
                <div className="ml-2">
                  <p
                    className={`text-sm ${
                      isCurrent
                        ? "font-semibold text-foreground"
                        : isDone
                        ? "text-emerald-700"
                        : "text-muted-foreground"
                    }`}
                  >
                    {stage.label}
                  </p>
                  {isCurrent && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Estado actual
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="mt-8 space-y-4">
        <Link
          href={`/applications/${appId}/documents`}
          className={buttonVariants({ variant: "outline" })}
        >
          Ver expediente
        </Link>

        {currentStatus === "activated" && (() => {
          const product = (app.products as unknown) as { name: string; code: string } | null
          return product ? (
            <div className="mt-6">
              <h2 className="text-base font-semibold mb-2">Solicitar plásticos / terminales</h2>
              <ProductOrderForm
                applicationId={appId}
                companyId={app.company_id}
                productCode={product.code}
                productName={product.name}
              />
            </div>
          ) : null
        })()}
      </div>
    </div>
  )
}
