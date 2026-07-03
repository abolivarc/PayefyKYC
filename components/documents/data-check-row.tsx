const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string; border: string; dot: string }> = {
  approved:       { label: "Validado",    bg: "#e7f6ec", color: "#1f7a4d", border: "#b8e8ca", dot: "#1f7a4d" },
  pending_review: { label: "En revisión", bg: "#EFF4FF", color: "#1D4ED8", border: "#dce8ff", dot: "#1D4ED8" },
}

const DEFAULT_CFG = { label: "Pendiente", bg: "#F3F7F4", color: "#5B7168", border: "#E4ECE7", dot: "#D1D5DB" }

interface Props {
  templateName: string
  currentStatus: string
  isRequired: boolean
}

export function DataCheckRow({ templateName, currentStatus, isRequired }: Props) {
  const cfg = STATUS_CONFIG[currentStatus] ?? DEFAULT_CFG

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #E4ECE7",
        borderRadius: 14,
        boxShadow: "0 1px 3px rgba(15,42,34,.06)",
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      {/* Status badge */}
      <div className="flex items-center gap-2">
        <span
          className="inline-flex items-center gap-1.5 rounded-full text-[11px] font-semibold"
          style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, padding: "3px 10px" }}
        >
          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: cfg.dot }} />
          {cfg.label}
        </span>
        {!isRequired && (
          <span className="text-[11px] font-medium rounded-full" style={{ background: "#F3F7F4", color: "#8A9E94", padding: "3px 8px" }}>
            Opcional
          </span>
        )}
      </div>

      {/* Name */}
      <p className="font-bold leading-snug" style={{ fontSize: 16, color: "#0F2A22" }}>
        {templateName}
      </p>

      {/* Note */}
      <p className="text-xs leading-relaxed" style={{ color: "#8A9E94" }}>
        Este dato es validado por el equipo de cumplimiento — no se requiere acción de tu parte.
      </p>
    </div>
  )
}
