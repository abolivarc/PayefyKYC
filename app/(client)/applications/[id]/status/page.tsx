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

  const [{ data: app }, { data: contracts }] = await Promise.all([
    admin
      .from("applications")
      .select("id, status, rejection_reason, products(name, code), company_id, companies(legal_name)")
      .eq("id", appId)
      .single(),
    admin
      .from("application_contracts")
      .select("kind, status, external_link, signed_at")
      .eq("application_id", appId),
  ])

  if (!app) return notFound()

  const contractMap = new Map((contracts ?? []).map((c) => [c.kind, c]))

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
    <div style={{ background: "#F4F8F6", minHeight: "100vh" }}>
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "24px 24px 64px" }}>
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="text-sm font-medium"
          style={{ color: "#5A6B7B", textDecoration: "none" }}
        >
          ← Inicio
        </Link>
        <h1
          className="font-extrabold mt-2"
          style={{ fontFamily: "var(--font-display)", fontSize: 22, letterSpacing: "-.02em", color: "#0F1B2A" }}
        >
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

      {/* ── Contracts section ── */}
      {(() => {
        const CONTRACT_STAGES = ["contracts_pending", "contracts_signed", "activation_pending", "activated"]
        if (!CONTRACT_STAGES.includes(currentStatus) && currentIdx < STATUS_ORDER.indexOf("contracts_pending")) return null

        const CONTRACT_DEFS = [
          { kind: "payefy_service", label: "Contrato de servicios Payefy", method: "DocuSign" },
          { kind: "transfer_increase_letter", label: "Carta de aumento Transfer", method: "" },
          { kind: "transfer_contract", label: "Contrato Transfer", method: "Weetrust" },
        ]

        const hasAnyContract = CONTRACT_DEFS.some((d) => contractMap.has(d.kind))
        if (!hasAnyContract) return null

        return (
          <div style={{ marginTop: 32, background: "#fff", border: "1px solid #E7ECF1", borderRadius: 14, overflow: "hidden", boxShadow: "0 1px 2px rgba(16,30,45,.05)" }}>
            <div style={{ padding: "14px 20px", borderBottom: "1px solid #E7ECF1", background: "#FBFCFD" }}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: ".07em", textTransform: "uppercase", color: "#8A99A8" }}>
                Contratos y firmas
              </p>
            </div>
            <div style={{ padding: "4px 0" }}>
              {CONTRACT_DEFS.map((def) => {
                const c = contractMap.get(def.kind)
                if (!c) return null
                const isSigned = c.status === "signed"
                const isSent = c.status === "sent"

                return (
                  <div key={def.kind} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 20px", borderBottom: "1px solid #F0F4F2" }}>
                    {/* Icon */}
                    <div style={{ width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                      background: isSigned ? "#EDFBEA" : isSent ? "#FFF7ED" : "#F4F8F6",
                      border: `1.5px solid ${isSigned ? "#0B7A44" : isSent ? "#F59E0B" : "#D1D9E0"}`,
                      display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {isSigned ? (
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                          <path d="M2 5l2.5 2.5 3.5-4" stroke="#0B7A44" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      ) : isSent ? (
                        <svg width="8" height="8" viewBox="0 0 8 8" fill="#F59E0B"><circle cx="4" cy="4" r="3"/></svg>
                      ) : (
                        <svg width="8" height="8" viewBox="0 0 8 8" fill="#CBD5E1"><circle cx="4" cy="4" r="3"/></svg>
                      )}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: "#0F1B2A" }}>
                        {def.label}
                        {def.method && <span style={{ fontSize: 11, color: "#8A99A8", marginLeft: 5 }}>({def.method})</span>}
                      </p>
                      <p style={{ margin: "2px 0 0", fontSize: 12, color: isSigned ? "#047857" : isSent ? "#92400E" : "#8A99A8" }}>
                        {isSigned ? "Firmado" : isSent ? "Pendiente de tu firma" : "Pendiente"}
                      </p>
                    </div>

                    {/* Action link for sent contracts */}
                    {isSent && c.external_link && (
                      <a
                        href={c.external_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontSize: 13, fontWeight: 600, color: "#0B7A44", textDecoration: "none",
                          padding: "6px 14px", border: "1px solid #0B7A44", borderRadius: 8, whiteSpace: "nowrap" }}
                      >
                        Firmar →
                      </a>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })()}

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
    </div>
  )
}
