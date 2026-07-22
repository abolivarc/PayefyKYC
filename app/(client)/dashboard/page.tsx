import Link from "next/link"
import Image from "next/image"
import { createClient } from "@/lib/supabase/server"
import { Progress } from "@/components/ui/progress"

const STATUS_LABELS: Record<string, string> = {
  draft: "Borrador",
  documents_pending: "Pendiente de documentos",
  in_compliance_review: "En revisión",
  changes_requested: "Cambios solicitados",
  approved_compliance: "Aprobado por compliance",
  in_provider_review: "En revisión del proveedor",
  provider_changes_requested: "Cambios solicitados",
  approved_provider: "Aprobado",
  contracts_pending: "Contratos pendientes",
  contracts_signed: "Contratos firmados",
  activation_pending: "Activación pendiente",
  activated: "Activo ✓",
  rejected: "Rechazado",
  archived: "Archivado",
}

/* Status pill: bg + text + border via token utilities (no hex) */
const STATUS_STYLE: Record<string, { pill: string; pip: string }> = {
  draft:                      { pill: "bg-muted text-muted-foreground border-border",        pip: "bg-tertiary"  },
  documents_pending:          { pill: "bg-info-tint text-info border-info/20",               pip: "bg-info"      },
  in_compliance_review:       { pill: "bg-info-tint text-info border-info/20",               pip: "bg-info"      },
  changes_requested:          { pill: "bg-warning-tint text-warning border-warning/20",      pip: "bg-warning"   },
  approved_compliance:        { pill: "bg-success-tint text-success border-success/20",      pip: "bg-success"   },
  in_provider_review:         { pill: "bg-info-tint text-info border-info/20",               pip: "bg-info"      },
  provider_changes_requested: { pill: "bg-warning-tint text-warning border-warning/20",      pip: "bg-warning"   },
  approved_provider:          { pill: "bg-success-tint text-success border-success/20",      pip: "bg-success"   },
  contracts_pending:          { pill: "bg-info-tint text-info border-info/20",               pip: "bg-info"      },
  contracts_signed:           { pill: "bg-success-tint text-success border-success/20",      pip: "bg-success"   },
  activation_pending:         { pill: "bg-info-tint text-info border-info/20",               pip: "bg-info"      },
  activated:                  { pill: "bg-success-tint text-success border-success/20",      pip: "bg-success"   },
  rejected:                   { pill: "bg-danger-tint text-danger border-danger/20",         pip: "bg-danger"    },
  archived:                   { pill: "bg-muted text-muted-foreground border-border",        pip: "bg-tertiary"  },
}

const PRODUCT_IMAGES: Record<string, string> = {
  cards: "/products/tarjeta-stack.png",
  terminals: "/products/terminal.png",
}

export default async function ClientDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

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
    .select("company_id, companies(id, legal_name, tax_id)")
    .eq("user_id", user.id)
    .single()

  const name = profile?.full_name?.split(" ")[0] || user.email?.split("@")[0] || "Cliente"

  /* ── No company yet: product selection ───────────────────────── */
  if (!membership) {
    return (
      <div className="bg-muted min-h-screen">
        <div className="max-w-2xl mx-auto px-6 py-10">
          <h1 className="font-heading text-2xl font-extrabold tracking-tight text-foreground mb-2">
            Bienvenido, {name}
          </h1>
          <p className="text-sm text-muted-foreground mb-8">
            Elige el producto con el que quieres comenzar tu proceso KYC.
          </p>

          <div className="grid sm:grid-cols-2 gap-4">
            {/* Tarjetas */}
            <Link
              href="/applications/new?product=cards"
              className="block rounded-lg overflow-hidden border border-border bg-card hover:shadow transition-shadow"
            >
              <div className="flex items-center justify-center p-6 min-h-[140px] bg-[#0E1A26]">
                <Image
                  src="/products/tarjeta-stack.png"
                  alt="Tarjeta Payefy"
                  width={180} height={110}
                  className="object-contain"
                />
              </div>
              <div className="p-5">
                <p className="text-xs font-semibold uppercase tracking-[.08em] text-success mb-1">
                  Tarjetas Empresariales
                </p>
                <h3 className="font-heading font-extrabold text-[17px] tracking-tight text-foreground mb-1">
                  Tarjeta de Crédito Payefy
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Líneas de crédito para financiar el crecimiento de tu negocio.
                </p>
                <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-semibold bg-accent text-accent-foreground">
                  Iniciar KYC
                </span>
              </div>
            </Link>

            {/* Terminales */}
            <Link
              href="/applications/new?product=terminals"
              className="block rounded-lg overflow-hidden border border-border bg-card hover:shadow transition-shadow"
            >
              <div className="flex items-center justify-center p-6 min-h-[140px] bg-[#0E1A26]">
                <Image
                  src="/products/terminal.png"
                  alt="Terminal Payefy"
                  width={100} height={140}
                  className="object-contain"
                />
              </div>
              <div className="p-5">
                <p className="text-xs font-semibold uppercase tracking-[.08em] text-success mb-1">
                  Terminales de Pago
                </p>
                <h3 className="font-heading font-extrabold text-[17px] tracking-tight text-foreground mb-1">
                  Terminal TPV Payefy Ultra
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Acepta pagos con tarjeta en tu punto de venta o e-commerce.
                </p>
                <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-semibold bg-secondary text-muted-foreground border border-border">
                  Iniciar KYC
                </span>
              </div>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const companyId = membership.company_id
  const company = (membership as unknown as { companies: { legal_name: string; tax_id: string } | null }).companies

  const { createClient: createAdmin } = await import("@supabase/supabase-js")
  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: applications } = await admin
    .from("applications")
    .select("id, status, product_id, products(name, code), documents(id, status)")
    .eq("company_id", companyId)

  const appList = applications ?? []
  const appCodes = appList.map((a) => ((a.products as unknown) as { code: string } | null)?.code)
  const missingProduct = !appCodes.includes("cards") ? "cards" : !appCodes.includes("terminals") ? "terminals" : null

  return (
    <div className="bg-muted min-h-screen">
      <div className="max-w-5xl mx-auto px-6 py-8 pb-16">

        {/* Welcome header */}
        <div className="mb-6">
          <h1 className="font-heading text-2xl font-extrabold tracking-tight text-foreground mb-1">
            Bienvenido, {name}
          </h1>
          {company && (
            <p className="text-[13px] text-muted-foreground">
              {company.legal_name}
              {company.tax_id && (
                <span className="font-mono text-xs text-tertiary ml-2">
                  {company.tax_id}
                </span>
              )}
            </p>
          )}
        </div>

        {/* Estado vacío */}
        {appList.length === 0 ? (
          <div className="rounded-lg border border-border bg-card p-8 text-center">
            <p className="text-sm text-muted-foreground mb-4">
              Aún no tienes solicitudes activas.
            </p>
            <Link
              href="/applications/new"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-semibold bg-primary text-primary-foreground hover:bg-brand-hover transition-colors"
            >
              Nueva solicitud
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {appList.map((app) => {
              const docs = (app.documents as { id: string; status: string }[]) ?? []
              const total = docs.length
              const done = docs.filter((d) => ["approved", "pending_review"].includes(d.status)).length
              const pct = total > 0 ? Math.round((done / total) * 100) : 0
              const product = (app.products as unknown) as { name: string; code: string } | null
              const st = STATUS_STYLE[app.status] ?? STATUS_STYLE.draft
              const imgSrc = product?.code ? PRODUCT_IMAGES[product.code] : null

              return (
                <div
                  key={app.id}
                  className="rounded-lg border border-border bg-card overflow-hidden hover:shadow transition-shadow"
                >
                  <div className="flex items-center gap-5 p-5 flex-wrap">
                    {/* Product thumbnail */}
                    {imgSrc && (
                      <div className="shrink-0 w-20 h-14 p-2 rounded-md hidden sm:flex items-center justify-center bg-[#0E1A26]">
                        <Image
                          src={imgSrc}
                          alt={product?.name ?? "Producto"}
                          width={72} height={44}
                          className="object-contain"
                        />
                      </div>
                    )}

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${st.pill}`}>
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${st.pip}`} />
                          {STATUS_LABELS[app.status] ?? app.status}
                        </span>
                        {product && (
                          <span className="text-xs text-muted-foreground font-medium">
                            {product.name}
                          </span>
                        )}
                      </div>
                      <div className="max-w-[220px]">
                        <div className="flex justify-between text-xs text-tertiary mb-1">
                          <span>Documentos</span>
                          <span>{done}/{total}</span>
                        </div>
                        <Progress value={pct} className="h-1.5" />
                      </div>
                    </div>

                    {/* Action */}
                    <div className="shrink-0 flex items-center gap-2 flex-wrap">
                      {app.status === "activated" && (
                        <Link
                          href={`/applications/${app.id}/status`}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-semibold transition-opacity hover:opacity-90"
                          style={{ background: "#004238", color: "#AEFF99" }}
                        >
                          Solicitar {product?.code === "cards" ? "tarjetas" : "terminales"} →
                        </Link>
                      )}
                      <Link
                        href={`/applications/${app.id}/documents`}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-semibold bg-success-tint text-success border border-success/20 hover:bg-mint-tint transition-colors"
                      >
                        Ver expediente →
                      </Link>
                    </div>
                  </div>
                </div>
              )
            })}

            {missingProduct && (
              <div className="pt-2">
                <Link
                  href={`/applications/new?product=${missingProduct}`}
                  className="text-sm font-semibold text-success hover:text-primary transition-colors"
                >
                  + Agregar también {missingProduct === "cards" ? "Tarjetas de crédito" : "Terminales TPV"}
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
