interface Props {
  templateName: string
  currentStatus: string
  isRequired: boolean
}

function statusBadge(status: string): { label: string; bg: string; color: string; border: string } {
  if (status === "approved")      return { label: "Validado",    bg: "#e7f6ec", color: "#1f7a4d", border: "#b8e8ca" }
  if (status === "pending_review") return { label: "En revisión", bg: "#EFF4FF", color: "#1D4ED8", border: "#dce8ff" }
  return { label: "Pendiente", bg: "#F3F7F4", color: "#5B7168", border: "#E4ECE7" }
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
