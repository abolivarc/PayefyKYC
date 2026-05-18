import { createClient } from "@/lib/supabase/server"
import { KanbanBoard, type KanbanApp } from "@/components/kanban/kanban-board"

export default async function KanbanPage() {
  const supabase = await createClient()

  const { data: applications } = await supabase
    .from("applications")
    .select(
      `id, status, created_at, updated_at,
       companies(legal_name),
       products(name, code),
       documents(id, status)`
    )
    .order("updated_at", { ascending: false })

  const kanbanApps: KanbanApp[] = (applications ?? []).map((app) => {
    const docs = ((app.documents as unknown) as { id: string; status: string }[]) ?? []
    const done = docs.filter((d) =>
      ["approved", "pending_review"].includes(d.status)
    ).length
    return {
      id: app.id,
      status: app.status,
      updated_at: app.updated_at,
      company:
        ((app.companies as unknown) as { legal_name: string } | null),
      product:
        ((app.products as unknown) as { name: string; code: string } | null),
      docStats: { total: docs.length, done },
    }
  })

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Kanban de solicitudes</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Arrastra las tarjetas para cambiar el estado de una solicitud.
        </p>
      </div>
      <KanbanBoard applications={kanbanApps} />
    </div>
  )
}
