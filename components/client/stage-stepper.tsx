const STAGES = [
  { key: "documents",  label: "Documentos"  },
  { key: "compliance", label: "Compliance"  },
  { key: "proveedor",  label: "Proveedor"   },
  { key: "contratos",  label: "Contratos"   },
  { key: "activacion", label: "Activación"  },
  { key: "activo",     label: "Activo"      },
]

function getStageIndex(status: string): number {
  if (status === "draft" || status === "documents_pending") return 0
  if (["in_compliance_review", "changes_requested", "approved_compliance"].includes(status)) return 1
  if (["in_provider_review", "provider_changes_requested", "approved_provider"].includes(status)) return 2
  if (["contracts_pending", "contracts_signed"].includes(status)) return 3
  if (status === "activation_pending") return 4
  if (status === "activated") return 5
  return 0
}

interface StageStepperProps {
  status: string
}

export function StageStepper({ status }: StageStepperProps) {
  const currentIdx = getStageIndex(status)

  return (
    <div
      className="flex items-center overflow-x-auto mb-5"
      style={{
        background: "#fff",
        border: "1px solid #E4ECE7",
        boxShadow: "0 1px 2px rgba(15,42,34,.04), 0 1px 3px rgba(15,42,34,.06)",
        borderRadius: 22,
        padding: "14px 20px",
        gap: 0,
      }}
    >
      {STAGES.map((stage, i) => {
        const isDone    = i < currentIdx
        const isCurrent = i === currentIdx

        return (
          <div
            key={stage.key}
            className="flex items-center"
            style={{ flex: i < STAGES.length - 1 ? "1 1 auto" : "0 0 auto" }}
          >
            <div
              className="flex items-center gap-2 shrink-0 whitespace-nowrap"
              style={{
                color: isCurrent ? "#0F2A22" : isDone ? "#5B7168" : "#8A9E94",
              }}
            >
              {/* Círculo paso */}
              <span
                className="w-6 h-6 flex items-center justify-center text-xs font-bold shrink-0"
                style={{
                  borderRadius: "50%",
                  border: isDone
                    ? "2px solid #1f7a4d"
                    : isCurrent
                    ? "2px solid #004238"
                    : "2px solid #E4ECE7",
                  background: isDone
                    ? "#1f7a4d"
                    : isCurrent
                    ? "#e7f6ec"
                    : "#fff",
                  color: isDone
                    ? "#fff"
                    : isCurrent
                    ? "#004238"
                    : "#8A9E94",
                }}
              >
                {isDone ? (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path
                      d="M2.5 6l2.5 2.5 4.5-4.5"
                      stroke="#fff"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  i + 1
                )}
              </span>

              <span className="text-sm" style={{ fontWeight: isCurrent ? 700 : 600 }}>
                {stage.label}
              </span>
            </div>

            {i < STAGES.length - 1 && (
              <div
                className="mx-1.5"
                style={{
                  flex: "1 1 18px",
                  minWidth: 18,
                  height: 2,
                  background: isDone ? "#1f7a4d" : "#E4ECE7",
                  borderRadius: 2,
                }}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
