"use client"

import { useState, useTransition } from "react"
import { toggleCompletionOverride } from "@/app/(admin)/applications/actions"

interface Props {
  applicationId: string
  initialValue: boolean
}

export function CompletionOverrideButton({ applicationId, initialValue }: Props) {
  const [active, setActive] = useState(initialValue)
  const [isPending, startTransition] = useTransition()

  function handleToggle() {
    const newValue = !active
    setActive(newValue)
    startTransition(async () => {
      const result = await toggleCompletionOverride(applicationId, newValue)
      if (result?.error) setActive(!newValue)
    })
  }

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      style={{
        padding: "6px 12px",
        fontSize: 12,
        fontWeight: 600,
        borderRadius: 8,
        border: `1px solid ${active ? "#0B7A44" : "var(--admin-border, #E7ECF1)"}`,
        background: active ? "#E7F8EF" : "transparent",
        color: active ? "#047857" : "var(--admin-text-muted, #5A6B7B)",
        cursor: isPending ? "wait" : "pointer",
        transition: "all .15s",
        whiteSpace: "nowrap",
      }}
    >
      {isPending ? "…" : active ? "✓ Forzado 100%" : "Forzar 100%"}
    </button>
  )
}
