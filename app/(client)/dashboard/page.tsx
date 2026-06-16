import Link from "next/link"
import Image from "next/image"
import { createClient } from "@/lib/supabase/server"
import { Progress } from "@/components/ui/progress"

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

const STATUS_STYLE: Record<string, { bg: string; color: string; border: string; pip: string }> = {
  draft:                      { bg: "#F1F5F9", color: "#334155", border: "#E2E8F0", pip: "#334155" },
  documents_pending:          { bg: "#EFF4FF", color: "#1D4ED8", border: "#DBE5FF", pip: "#1D4ED8" },
  in_compliance_review:       { bg: "#EFF4FF", color: "#1D4ED8", border: "#DBE5FF", pip: "#1D4ED8" },
  changes_requested:          { bg: "#FFF7ED", color: "#92400E", border: "#FCEBD2", pip: "#92400E" },
  approved_compliance:        { bg: "#E7F8EF", color: "#047857", border: "#CBEFDB", pip: "#047857" },
  in_provider_review:         { bg: "#EFF4FF", color: "#1D4ED8", border: "#DBE5FF", pip: "#1D4ED8" },
  provider_changes_requested: { bg: "#FFF7ED", color: "#92400E", border: "#FCEBD2", pip: "#92400E" },
  approved_provider:          { bg: "#E7F8EF", color: "#047857", border: "#CBEFDB", pip: "#047857" },
  contracts_pending:          { bg: "#EFF4FF", color: "#1D4ED8", border: "#DBE5FF", pip: "#1D4ED8" },
  contracts_signed:           { bg: "#E7F8EF", color: "#047857", border: "#CBEFDB", pip: "#047857" },
  activation_pending:         { bg: "#EFF4FF", color: "#1D4ED8", border: "#DBE5FF", pip: "#1D4ED8" },
  activated:                  { bg: "#E7F8EF", color: "#047857", border: "#CBEFDB", pip: "#047857" },
  rejected:                   { bg: "#FEF2F2", color: "#B91C1C", border: "#FBDADA", pip: "#B91C1C" },
  archived:                   { bg: "#F1F5F9", color: "#334155", border: "#E2E8F0", pip: "#334155" },
}

const PRODUCT_IMAGES: Record<string, string> = {
  cards: "/products/tarjeta-stack.png",
  terminals: "/products/terminal.png",
}

export default async function ClientDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return <p className="p-8" style={{ color: "#5A6B7B" }}>Cargando sesión...</p>
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

  // No company yet — onboarding start
  if (!membership) {
    return (
      <div style={{ background: "#F4F8F6", minHeight: "100vh" }}>
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "40px 24px" }}>
          <h1
            className="font-extrabold mb-2"
            style={{ fontFamily: "var(--font-display)", fontSize: 26, letterSpacing: "-.02em", color: "#0F1B2A", margin: "0 0 8px" }}
          >
            Bienvenido, {name}
          </h1>
          <p className="mb-8" style={{ color: "#5A6B7B", fontSize: 14, margin: "0 0 32px" }}>
            Elige el producto con el que quieres comenzar tu proceso KYC.
          </p>

          <div className="grid sm:grid-cols-2 gap-4">
            {/* Cards */}
            <Link
              href="/applications/new?product=cards"
              className="block rounded-2xl overflow-hidden transition-all"
              style={{
                background: "#fff",
                border: "1px solid #E7ECF1",
                boxShadow: "0 1px 2px rgba(16,30,45,.05)",
                textDecoration: "none",
              }}
            >
              <div
                className="flex items-center justify-center p-6"
                style={{ background: "#0E1A26", minHeight: 140 }}
              >
                <Image src="/products/tarjeta-stack.png" alt="Tarjeta Payefy" width={180} height={110} className="object-contain" />
              </div>
              <div className="p-5">
                <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "#0B7A44", letterSpacing: ".08em" }}>
                  Tarjetas Empresariales
                </p>
                <h3 className="font-extrabold mb-1" style={{ fontFamily: "var(--font-display)", fontSize: 17, color: "#0F1B2A" }}>
                  Tarjeta de Crédito Payefy
                </h3>
                <p className="text-sm mb-4" style={{ color: "#5A6B7B" }}>
                  Líneas de crédito para financiar el crecimiento de tu negocio.
                </p>
                <span
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold"
                  style={{ background: "#A8F898", color: "#08130C" }}
                >
                  Iniciar KYC
                </span>
              </div>
            </Link>

            {/* Terminals */}
            <Link
              href="/applications/new?product=terminals"
              className="block rounded-2xl overflow-hidden transition-all"
              style={{
                background: "#fff",
                border: "1px solid #E7ECF1",
                boxShadow: "0 1px 2px rgba(16,30,45,.05)",
                textDecoration: "none",
              }}
            >
              <div
                className="flex items-center justify-center p-6"
                style={{ background: "#0E1A26", minHeight: 140 }}
              >
                <Image src="/products/terminal.png" alt="Terminal Payefy" width={100} height={140} className="object-contain" />
              </div>
              <div className="p-5">
                <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "#0B7A44", letterSpacing: ".08em" }}>
                  Terminales de Pago
                </p>
                <h3 className="font-extrabold mb-1" style={{ fontFamily: "var(--font-display)", fontSize: 17, color: "#0F1B2A" }}>
                  Terminal TPV Payefy Ultra
                </h3>
                <p className="text-sm mb-4" style={{ color: "#5A6B7B" }}>
                  Acepta pagos con tarjeta en tu punto de venta o e-commerce.
                </p>
                <span
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold"
                  style={{ background: "#F1F5F9", color: "#334155", border: "1px solid #E2E8F0" }}
                >
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
    <div style={{ background: "#F4F8F6", minHeight: "100vh" }}>
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "32px 24px 64px" }}>

        {/* Welcome header */}
        <div className="mb-6">
          <h1
            className="font-extrabold"
            style={{ fontFamily: "var(--font-display)", fontSize: 26, letterSpacing: "-.02em", color: "#0F1B2A", margin: "0 0 4px" }}
          >
            Bienvenido, {name}
          </h1>
          {company && (
            <p style={{ fontSize: 13, color: "#5A6B7B", margin: 0 }}>
              {company.legal_name}
              {company.tax_id && (
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#8A99A8", marginLeft: 8 }}>
                  {company.tax_id}
                </span>
              )}
            </p>
          )}
        </div>

        {/* Applications */}
        {appList.length === 0 ? (
          <div
            className="rounded-2xl p-8 text-center"
            style={{ background: "#fff", border: "1px solid #E7ECF1" }}
          >
            <p style={{ color: "#5A6B7B", fontSize: 14, marginBottom: 16 }}>
              Aún no tienes solicitudes activas.
            </p>
            <Link
              href="/applications/new"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold"
              style={{ background: "#A8F898", color: "#08130C", textDecoration: "none" }}
            >
              Nueva solicitud
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
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
                  className="rounded-2xl overflow-hidden"
                  style={{
                    background: "#fff",
                    border: "1px solid #E7ECF1",
                    boxShadow: "0 1px 2px rgba(16,30,45,.05)",
                  }}
                >
                  <div className="flex items-center gap-5 p-5 flex-wrap">
                    {/* Product thumbnail */}
                    {imgSrc && (
                      <div
                        className="shrink-0 rounded-xl flex items-center justify-center hidden sm:flex"
                        style={{ width: 80, height: 56, background: "#0E1A26", padding: 8 }}
                      >
                        <Image src={imgSrc} alt={product?.name ?? "Producto"} width={72} height={44} className="object-contain" />
                      </div>
                    )}

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span
                          className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold"
                          style={{ background: st.bg, color: st.color, border: `1px solid ${st.border}` }}
                        >
                          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: st.pip }} />
                          {STATUS_LABELS[app.status] ?? app.status}
                        </span>
                        {product && (
                          <span
                            className="text-xs font-semibold"
                            style={{ color: "#5A6B7B" }}
                          >
                            {product.name}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex-1" style={{ maxWidth: 220 }}>
                          <div className="flex justify-between text-xs mb-1" style={{ color: "#8A99A8" }}>
                            <span>Documentos</span>
                            <span>{done}/{total}</span>
                          </div>
                          <Progress value={pct} className="h-1.5" />
                        </div>
                      </div>
                    </div>

                    {/* Action */}
                    <Link
                      href={`/applications/${app.id}/documents`}
                      className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
                      style={{
                        background: "#EDFBEA",
                        color: "#0B7A44",
                        textDecoration: "none",
                        border: "1px solid #CBEFDB",
                      }}
                    >
                      Ver expediente →
                    </Link>
                  </div>
                </div>
              )
            })}

            {missingProduct && (
              <div className="pt-1">
                <Link
                  href={`/applications/new?product=${missingProduct}`}
                  className="text-sm font-semibold"
                  style={{ color: "#0B7A44", textDecoration: "none" }}
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
