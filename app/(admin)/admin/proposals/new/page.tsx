import Link from "next/link"
import { ProposalWizard } from "@/components/proposals/proposal-wizard"
import { getStaffContext } from "@/lib/auth/staff"
import { RATE_TIER_LABELS } from "@/lib/proposals/mcc-catalog"

export const metadata = { title: "Nueva Propuesta | Payefy Admin" }

export default async function NewProposalPage() {
  // Los pisos que verá el wizard dependen de quién está cotizando
  const ctx = await getStaffContext()
  const tier = ctx?.rateTier ?? "interno"
  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100%" }}>
      <header style={{ padding: "24px 32px 16px" }}>
        <Link
          href="/admin/proposals"
          className="hover:text-[#0F1B2A] transition-colors"
          style={{ fontSize: 13, color: "var(--admin-text-muted, #5A6B7B)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 8 }}
        >
          ← Propuestas
        </Link>
        <h1 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 800, letterSpacing: "-.02em", lineHeight: 1.1, color: "var(--admin-text, #0F1B2A)" }}>
          Generador de Propuestas Comerciales
        </h1>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--admin-text-muted, #5A6B7B)" }}>
          Crea propuestas profesionales para tus prospectos · Tarifario{" "}
          <b style={{ color: "var(--admin-text, #0F1B2A)", fontWeight: 600 }}>{RATE_TIER_LABELS[tier]}</b>
        </p>
      </header>
      <div style={{ padding: "8px 32px 32px" }}>
        <ProposalWizard tier={tier} />
      </div>
    </div>
  )
}
