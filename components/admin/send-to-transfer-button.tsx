"use client"

import { useState } from "react"
import { EmailComposer } from "./email-composer"

interface Props {
  applicationId: string
  transferStatus: string | null
}

const STATUS_CFG: Record<string, { label: string; bg: string; color: string; border: string }> = {
  sent:              { label: "Enviado a Transfer",    bg: "#EFF4FF", color: "#1D4ED8", border: "#C7D9FF" },
  approved:          { label: "Aprobado por Transfer", bg: "#E7F8EF", color: "#047857", border: "#CBEFDB" },
  changes_requested: { label: "Cambios (Transfer)",    bg: "#FFF7ED", color: "#92400E", border: "#FCEBD2" },
}

export function SendToTransferButton({ applicationId, transferStatus }: Props) {
  const [open, setOpen] = useState(false)

  const cfg = transferStatus ? STATUS_CFG[transferStatus] : null

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
        <button
          onClick={() => setOpen(true)}
          className="hover:bg-[#003530] transition-colors"
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "8px 14px", fontSize: 13, fontWeight: 600, borderRadius: 9,
            background: cfg ? "#F3F7F4" : "#1D4ED8",
            color: cfg ? "#5B7168" : "#fff",
            border: cfg ? "1px solid #E4ECE7" : "none",
            cursor: "pointer",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <line x1="22" y1="2" x2="11" y2="13"/>
            <polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
          {cfg ? "Re-enviar a Transfer" : "Enviar a Transfer"}
        </button>

        {cfg && (
          <span style={{
            fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 99,
            background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
          }}>
            {cfg.label}
          </span>
        )}
      </div>

      {open && (
        <EmailComposer
          applicationId={applicationId}
          onClose={() => setOpen(false)}
          initialTemplate="expediente_to_transfer"
        />
      )}
    </>
  )
}
