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
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100%" }}>
      <header style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, padding: "24px 32px 16px" }}>
        <div>
          <h1 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 800, letterSpacing: "-.02em", lineHeight: 1.1, color: "var(--admin-text, #0F1B2A)" }}>
            Kanban
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--admin-text-muted, #5A6B7B)" }}>
            Arrastra las tarjetas para cambiar el estado de una solicitud.
          </p>
        </div>
      </header>
      <div style={{ padding: "0 32px 32px", flex: 1 }}>
        <KanbanBoard applications={kanbanApps} />
      </div>
    </div>
  )
}
