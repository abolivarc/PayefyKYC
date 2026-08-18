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

// Dos pipelines: terminales revisa OPERACIONES y su adquirente es BROXEL;
// tarjetas revisa COMPLIANCE y su proveedor es TRANSFER.
function kanbanColumns(pipeline: "terminals" | "cards") {
  const esTerm = pipeline === "terminals"
  const revisor = esTerm ? "operaciones" : "compliance"
  const prov = esTerm ? "Broxel" : "Transfer"
  return [
    { id: "draft",                      label: "Borrador",                 status: "draft" },
    { id: "documents_pending",          label: "Docs enviados",            status: "documents_pending" },
    { id: "in_compliance_review",       label: `Revisión ${revisor}`,      status: "in_compliance_review" },
    { id: "changes_requested",          label: "Cambios solicitados",      status: "changes_requested" },
    { id: "approved_compliance",        label: `Aprobado ${revisor}`,      status: "approved_compliance" },
    { id: "in_provider_review",         label: `En ${prov}`,               status: "in_provider_review" },
    { id: "provider_changes_requested", label: `Cambios ${prov}`,          status: "provider_changes_requested" },
    { id: "approved_provider",          label: `Aprobado ${prov}`,         status: "approved_provider" },
    { id: "contracts_pending",          label: "Contratos pend.",          status: "contracts_pending" },
    { id: "contracts_signed",           label: "Contratos firmados",       status: "contracts_signed" },
    { id: "activation_pending",         label: "Activación pend.",         status: "activation_pending" },
    { id: "activated",                  label: "Activado ✓",               status: "activated" },
    { id: "rejected",                   label: "Rechazado",                status: "rejected" },
    { id: "archived",                   label: "Archivado",                status: "archived" },
  ] as const
}
const KANBAN_COLUMNS = kanbanColumns("cards")

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
  const [pipeline, setPipeline] = useState<"terminals" | "cards">("terminals")
  const [, startTransition] = useTransition()

  // Cada solicitud vive en el pipeline de SU producto: una empresa con ambos
  // productos aparece en los dos tableros, una tarjeta en cada uno.
  const visibles = apps.filter((a) => a.product?.code === pipeline)
  const columns = kanbanColumns(pipeline)
  const columnApps = columns.map((col) => ({
    ...col,
    apps: visibles.filter((a) => a.status === col.status),
  }))
  const cuenta = {
    terminals: apps.filter((a) => a.product?.code === "terminals").length,
    cards: apps.filter((a) => a.product?.code === "cards").length,
  }

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
    <div>
      {/* Selector de pipeline: cada producto tiene su tablero */}
      <div className="mb-4 flex items-center gap-2">
        {([
          { key: "terminals" as const, label: "Terminales · Broxel", n: cuenta.terminals,
            active: "bg-product-terminals-tint border-product-terminals/30 text-product-terminals" },
          { key: "cards" as const, label: "Tarjetas · Transfer", n: cuenta.cards,
            active: "bg-product-cards-tint border-product-cards/30 text-product-cards" },
        ]).map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setPipeline(t.key)}
            aria-pressed={pipeline === t.key}
            className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors ${
              pipeline === t.key ? t.active : "bg-card border-border text-muted-foreground hover:bg-secondary"
            }`}
          >
            {t.label}
            <span className="font-mono text-xs opacity-60">{t.n}</span>
          </button>
        ))}
      </div>
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
    </div>
  )
}
