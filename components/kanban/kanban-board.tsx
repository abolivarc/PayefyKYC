"use client"

import { useState, useTransition } from "react"
import {
  DndContext,
  DragOverlay,
  closestCorners,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { useDroppable } from "@dnd-kit/core"
import { KanbanCard, type KanbanApp } from "./kanban-card"
export type { KanbanApp }
import { updateApplicationStatus } from "@/app/(admin)/applications/actions"

const KANBAN_COLUMNS = [
  {
    id: "new",
    label: "Nuevas",
    statuses: ["draft", "documents_pending"],
  },
  {
    id: "review",
    label: "En revisión",
    statuses: ["in_compliance_review", "in_provider_review"],
  },
  {
    id: "changes",
    label: "Cambios solicitados",
    statuses: ["changes_requested", "provider_changes_requested"],
  },
  {
    id: "approved",
    label: "Aprobadas",
    statuses: ["approved_compliance", "approved_provider"],
  },
  {
    id: "contracts",
    label: "Contratos",
    statuses: ["contracts_pending", "contracts_signed"],
  },
  {
    id: "activation",
    label: "Activación",
    statuses: ["activation_pending", "activated"],
  },
  {
    id: "closed",
    label: "Cerradas",
    statuses: ["rejected", "archived"],
  },
] as const

type ColumnId = (typeof KANBAN_COLUMNS)[number]["id"]

function DroppableColumn({
  id,
  label,
  apps,
}: {
  id: ColumnId
  label: string
  apps: KanbanApp[]
}) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <div className="flex-shrink-0 w-64">
      <div className="flex items-center justify-between mb-2 px-1">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </h3>
        <span className="text-xs text-muted-foreground bg-muted rounded-full px-1.5 py-0.5">
          {apps.length}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className={`min-h-24 rounded-lg p-2 space-y-2 transition-colors ${
          isOver ? "bg-primary/5 ring-1 ring-primary/20" : "bg-muted/30"
        }`}
      >
        <SortableContext
          items={apps.map((a) => a.id)}
          strategy={verticalListSortingStrategy}
        >
          {apps.map((app) => (
            <KanbanCard key={app.id} app={app} />
          ))}
        </SortableContext>
        {apps.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">
            Sin solicitudes
          </p>
        )}
      </div>
    </div>
  )
}

interface Props {
  applications: KanbanApp[]
}

export function KanbanBoard({ applications }: Props) {
  const [apps, setApps] = useState<KanbanApp[]>(applications)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const columnApps = KANBAN_COLUMNS.map((col) => ({
    ...col,
    apps: apps.filter((a) => (col.statuses as readonly string[]).includes(a.status)),
  }))

  function findColumnByStatus(status: string) {
    return KANBAN_COLUMNS.find((c) =>
      (c.statuses as readonly string[]).includes(status)
    )
  }

  function findColumnById(colId: string) {
    return KANBAN_COLUMNS.find((c) => c.id === colId)
  }

  function handleDragStart({ active }: DragStartEvent) {
    setActiveId(active.id as string)
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null)
    if (!over) return

    const activeApp = apps.find((a) => a.id === active.id)
    if (!activeApp) return

    // Determine target column: over could be a column id or a card id
    let targetCol = findColumnById(over.id as string)
    if (!targetCol) {
      const overApp = apps.find((a) => a.id === over.id)
      if (overApp) targetCol = findColumnByStatus(overApp.status)
    }
    if (!targetCol) return

    const newStatus = targetCol.statuses[0]
    if (newStatus === activeApp.status) return

    // Optimistic update
    setApps((prev) =>
      prev.map((a) =>
        a.id === activeApp.id ? { ...a, status: newStatus } : a
      )
    )

    startTransition(async () => {
      await updateApplicationStatus(activeApp.id, newStatus)
    })
  }

  const activeApp = activeId ? apps.find((a) => a.id === activeId) : null

  return (
    <DndContext
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {columnApps.map((col) => (
          <DroppableColumn
            key={col.id}
            id={col.id}
            label={col.label}
            apps={col.apps}
          />
        ))}
      </div>
      <DragOverlay>
        {activeApp ? <KanbanCard app={activeApp} isOverlay /> : null}
      </DragOverlay>
    </DndContext>
  )
}
