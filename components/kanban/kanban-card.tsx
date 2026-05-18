"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"
import { Badge } from "@/components/ui/badge"

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

const PRODUCT_VARIANT: Record<
  string,
  "default" | "outline" | "success" | "warning"
> = {
  cards: "default",
  terminals: "warning",
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

  const progressColor =
    pct === 100
      ? "text-emerald-700"
      : pct >= 50
      ? "text-amber-700"
      : "text-muted-foreground"

  const timeAgo = formatDistanceToNow(new Date(app.updated_at), {
    addSuffix: true,
    locale: es,
  })

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`rounded-lg border bg-card p-3 shadow-sm cursor-grab active:cursor-grabbing select-none ${
        isOverlay ? "rotate-2 shadow-xl" : ""
      }`}
    >
      <Link
        href={`/admin/applications/${app.id}/review`}
        onClick={(e) => e.stopPropagation()}
        className="block"
      >
        <p className="font-medium text-sm leading-snug mb-2">
          {app.company?.legal_name ?? "Sin empresa"}
        </p>
        <div className="flex items-center justify-between gap-1">
          <Badge
            variant={PRODUCT_VARIANT[app.product?.code ?? ""] ?? "outline"}
            className="text-xs"
          >
            {app.product?.name ?? "Producto"}
          </Badge>
          <span className={`text-xs font-medium ${progressColor}`}>
            {app.docStats.done}/{app.docStats.total} docs
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-1.5">{timeAgo}</p>
      </Link>
    </div>
  )
}
