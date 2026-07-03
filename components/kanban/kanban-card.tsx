"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"

export type KanbanApp = {
  id: string
  status: string
  updated_at: string
  company: { legal_name: string } | null
  product: { name: string; code: string } | null
  docStats: { total: number; done: number }
}

interface Props {
  app: KanbanApp
  isOverlay?: boolean
}

const PRODUCT_CHIP: Record<string, { label: string; bg: string; color: string; border: string }> = {
  cards:     { label: "Tarjetas", bg: "#F0F4FF", color: "#1D4ED8", border: "#dce8ff" },
  terminals: { label: "Terminal", bg: "#fdf1e6", color: "#c9772f", border: "#f5d9b5" },
}

export function KanbanCard({ app, isOverlay }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: app.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  const pct =
    app.docStats.total > 0
      ? Math.round((app.docStats.done / app.docStats.total) * 100)
      : 0

  const accentColor =
    pct === 100 ? "#1f7a4d" : pct >= 60 ? "#c9772f" : "#D1D5DB"

  const pctColor =
    pct === 100 ? "#1f7a4d" : pct >= 60 ? "#c9772f" : "#8A9E94"

  const timeAgo = formatDistanceToNow(new Date(app.updated_at), {
    addSuffix: true,
    locale: es,
  })

  const chip = PRODUCT_CHIP[app.product?.code ?? ""]

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        border: "1px solid #E4ECE7",
        borderRadius: 14,
        background: "#fff",
        boxShadow: "0 1px 3px rgba(15,42,34,.06)",
        overflow: "hidden",
      }}
      {...attributes}
      {...listeners}
      className={`cursor-grab active:cursor-grabbing select-none ${
        isOverlay ? "rotate-1 shadow-xl" : ""
      }`}
    >
      {/* Top accent stripe */}
      <div className="h-[3px]" style={{ background: accentColor }} />

      <Link
        href={`/admin/applications/${app.id}/review`}
        onClick={(e) => e.stopPropagation()}
        className="block p-4"
      >
        {/* Company name */}
        <p
          className="font-bold leading-snug mb-2.5 line-clamp-2"
          style={{ fontSize: 14, color: "#0F2A22" }}
        >
          {app.company?.legal_name ?? "Sin empresa"}
        </p>

        {/* Product chip */}
        {chip ? (
          <span
            className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold mb-3"
            style={{ background: chip.bg, color: chip.color, border: `1px solid ${chip.border}` }}
          >
            {chip.label}
          </span>
        ) : (
          <span
            className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold mb-3"
            style={{ background: "#F3F7F4", color: "#5B7168", border: "1px solid #E4ECE7" }}
          >
            {app.product?.name ?? "Producto"}
          </span>
        )}

        {/* Progress bar */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px]" style={{ color: "#8A9E94" }}>
              {app.docStats.done} de {app.docStats.total} docs
            </span>
            <span className="text-[11px] font-bold" style={{ color: pctColor }}>
              {pct}%
            </span>
          </div>
          <div
            className="h-1.5 rounded-full overflow-hidden"
            style={{ background: "#E4ECE7" }}
          >
            <div
              className="h-full rounded-full"
              style={{
                width: `${pct}%`,
                background: accentColor,
                transition: "width .3s ease",
              }}
            />
          </div>
        </div>

        {/* Timestamp */}
        <p className="text-[11px] mt-3" style={{ color: "#8A9E94" }}>
          {timeAgo}
        </p>
      </Link>
    </div>
  )
}
