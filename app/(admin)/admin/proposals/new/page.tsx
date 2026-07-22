import Link from "next/link"
import { ProposalWizard } from "@/components/proposals/proposal-wizard"

export const metadata = { title: "Nueva Propuesta | Payefy Admin" }

export default function NewProposalPage() {
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
          Crea propuestas profesionales para tus prospectos
        </p>
      </header>
      <div style={{ padding: "8px 32px 32px" }}>
        <ProposalWizard />
      </div>
    </div>
  )
}
