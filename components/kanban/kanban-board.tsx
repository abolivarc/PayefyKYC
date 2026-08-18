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
  { id: "draft",                      label: "Borrador",               status: "draft" },
  { id: "documents_pending",          label: "Docs enviados",          status: "documents_pending" },
  { id: "in_compliance_review",       label: "En revisión",            status: "in_compliance_review" },
  { id: "changes_requested",          label: "Cambios solicitados",    status: "changes_requested" },
  { id: "approved_compliance",        label: "Aprobado interno",    status: "approved_compliance" },
  { id: "in_provider_review",         label: "En Transfer",            status: "in_provider_review" },
  { id: "provider_changes_requested", label: "Cambios Transfer",       status: "provider_changes_requested" },
  { id: "approved_provider",          label: "Aprobado Transfer",      status: "approved_provider" },
  { id: "contracts_pending",          label: "Contratos pend.",        status: "contracts_pending" },
  { id: "contracts_signed",           label: "Contratos firmados",     status: "contracts_signed" },
  { id: "activation_pending",         label: "Activación pend.",       status: "activation_pending" },
  { id: "activated",                  label: "Activado ✓",             status: "activated" },
  { id: "rejected",                   label: "Rechazado",              status: "rejected" },
  { id: "archived",                   label: "Archivado",              status: "archived" },
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
    apps: apps.filter((a) => a.status === col.status),
  }))

  function findColumnByStatus(status: string) {
    return KANBAN_COLUMNS.find((c) => c.status === status)
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

    const newStatus = targetCol.status
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
