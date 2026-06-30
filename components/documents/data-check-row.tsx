interface Props {
  templateName: string
  currentStatus: string
  isRequired: boolean
}

function statusBadge(status: string): { label: string; bg: string; color: string; border: string } {
  if (status === "approved") return { label: "Validado", bg: "#E7F8EF", color: "#047857", border: "#CBEFDB" }
  if (status === "pending_review") return { label: "En revisión", bg: "#FFF7ED", color: "#92400E", border: "#FCEBD2" }
  return { label: "Pendiente", bg: "#F1F5F9", color: "#334155", border: "#E2E8F0" }
}

export function DataCheckRow({ templateName, currentStatus, isRequired }: Props) {
  const badge = statusBadge(currentStatus)
  return (
    <div className="flex items-center gap-3 py-3 border-b border-border last:border-b-0">
      <div className="flex-1 min-w-0">
        <span className="text-sm text-foreground leading-snug">
          {templateName}
        </span>
        {!isRequired && (
          <span className="ml-2 text-xs text-muted-foreground">opcional</span>
        )}
      </div>
      <span style={{
        fontSize: 11,
        fontWeight: 600,
        padding: "2px 8px",
        borderRadius: 999,
        background: badge.bg,
        color: badge.color,
        border: `1px solid ${badge.border}`,
        whiteSpace: "nowrap",
        flexShrink: 0,
      }}>
        {badge.label}
      </span>
    </div>
  )
}
