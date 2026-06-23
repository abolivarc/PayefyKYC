import type { ChecklistCategory, DocGroup } from "@/components/documents/document-checklist"
import { isDocumentExpired } from "@/lib/documents/expiry"

type GroupStatus = "done" | "review" | "changes" | "empty"

function getGroupStatus(group: DocGroup): GroupStatus {
  const doc = group.docs[0]
  if (!doc) return "empty"

  if (group.isMulti) {
    const anyDone = group.docs.some(
      (d) => d.status === "approved" || d.status === "pending_review"
    )
    if (anyDone) return "review"
    return "empty"
  }

  if (group.field_type === "check_or_upload") {
    if (doc.is_checked || !!doc.storage_path) return "done"
    return "empty"
  }

  if (doc.status === "approved") return "done"
  if (doc.status === "changes_requested") return "changes"
  if (doc.status === "pending_review") {
    if (isDocumentExpired(doc.uploaded_at)) return "empty"
    return "review"
  }
  return "empty"
}

const STATUS_CONFIG: Record<GroupStatus, { icon: string; color: string; bg: string; label: string }> = {
  done:    { icon: "✓", color: "#047857", bg: "#E7F8EF", label: "Listo" },
  review:  { icon: "●", color: "#1D4ED8", bg: "#EFF6FF", label: "En revisión" },
  changes: { icon: "⚠", color: "#B45309", bg: "#FFFBEB", label: "Requiere cambios" },
  empty:   { icon: "○", color: "#8A99A8", bg: "#F4F8F6", label: "Pendiente" },
}

interface Props {
  categories: ChecklistCategory[]
}

export function KycSummaryPanel({ categories }: Props) {
  const allGroups = categories.flatMap((c) => c.groups)
  const requiredGroups = allGroups.filter((g) => g.is_required)
  const doneRequired = requiredGroups.filter((g) => getGroupStatus(g) === "done").length
  const totalRequired = requiredGroups.length

  const visibleCategories = categories.filter((c) => c.groups.length > 0)

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #E7ECF1",
        borderRadius: 16,
        boxShadow: "0 1px 2px rgba(16,30,45,.05)",
        padding: "18px 20px 20px",
        marginBottom: 20,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 14,
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: 14,
            color: "#0F1B2A",
          }}
        >
          Resumen de requisitos KYC
        </span>
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: doneRequired === totalRequired ? "#047857" : "#5A6B7B",
            background: doneRequired === totalRequired ? "#E7F8EF" : "#F4F8F6",
            border: `1px solid ${doneRequired === totalRequired ? "#A7F3D0" : "#E7ECF1"}`,
            borderRadius: 999,
            padding: "3px 10px",
          }}
        >
          {doneRequired}/{totalRequired} obligatorios listos
        </span>
      </div>

      {/* Categories */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {visibleCategories.map((cat) => (
          <div key={cat.title}>
            <p
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "#8A99A8",
                margin: "0 0 6px",
              }}
            >
              {cat.title}
            </p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                gap: "4px 8px",
              }}
            >
              {cat.groups.map((group) => {
                const status = getGroupStatus(group)
                const cfg = STATUS_CONFIG[status]
                return (
                  <div
                    key={group.templateCode}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 7,
                      padding: "5px 8px",
                      borderRadius: 8,
                      background: cfg.bg,
                    }}
                    title={cfg.label}
                  >
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: cfg.color,
                        flexShrink: 0,
                        width: 14,
                        textAlign: "center",
                        lineHeight: 1,
                      }}
                    >
                      {cfg.icon}
                    </span>
                    <span
                      style={{
                        fontSize: 12,
                        color: "#0F1B2A",
                        lineHeight: 1.3,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {group.templateName}
                      {!group.is_required && (
                        <span style={{ fontSize: 10, marginLeft: 4, color: "#8A99A8" }}>
                          opc.
                        </span>
                      )}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div
        style={{
          display: "flex",
          gap: 12,
          marginTop: 14,
          paddingTop: 12,
          borderTop: "1px solid #E7ECF1",
          flexWrap: "wrap",
        }}
      >
        {(Object.entries(STATUS_CONFIG) as [GroupStatus, typeof STATUS_CONFIG[GroupStatus]][]).map(
          ([, cfg]) => (
            <span
              key={cfg.label}
              style={{ fontSize: 11, color: "#5A6B7B", display: "flex", alignItems: "center", gap: 4 }}
            >
              <span style={{ color: cfg.color, fontWeight: 700 }}>{cfg.icon}</span>
              {cfg.label}
            </span>
          )
        )}
      </div>
    </div>
  )
}
