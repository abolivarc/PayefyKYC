import { notFound } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"
import { Badge } from "@/components/ui/badge"

const ACTION_LABELS: Record<string, string> = {
  application_submitted: "Expediente enviado para revisión",
  status_changed: "Status cambiado",
  document_approved: "Documento aprobado",
  document_changes_requested: "Cambios solicitados en documento",
  document_rejected: "Documento rechazado",
}

const STATUS_LABELS: Record<string, string> = {
  draft: "Borrador",
  documents_pending: "Pendiente de documentos",
  in_compliance_review: "En revisión compliance",
  changes_requested: "Cambios solicitados",
  approved_compliance: "Aprobado compliance",
  in_provider_review: "En revisión proveedor",
  provider_changes_requested: "Cambios solicitados proveedor",
  approved_provider: "Aprobado proveedor",
  contracts_pending: "Contratos pendientes",
  contracts_signed: "Contratos firmados",
  activation_pending: "Activación pendiente",
  activated: "Activo",
  rejected: "Rechazado",
  archived: "Archivado",
}

export default async function AuditPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: appId } = await params
  const supabase = await createClient()

  const { data: app } = await supabase
    .from("applications")
    .select("id, companies(legal_name)")
    .eq("id", appId)
    .single()

  if (!app) return notFound()

  const { data: logs } = await supabase
    .from("audit_logs")
    .select("id, action, created_at, changes, metadata, profiles(full_name)")
    .eq("entity_id", appId)
    .order("created_at", { ascending: false })

  const company = (app.companies as unknown) as { legal_name: string } | null

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6">
        <Link
          href={`/admin/applications/${appId}/review`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Volver a revisión
        </Link>
        <h1 className="text-xl font-bold mt-2">
          Historial de auditoría
        </h1>
        {company && (
          <p className="text-sm text-muted-foreground">
            {company.legal_name}
          </p>
        )}
      </div>

      {!logs?.length ? (
        <p className="text-muted-foreground text-sm">
          Sin registros de auditoría.
        </p>
      ) : (
        <div className="relative pl-6 space-y-0">
          {logs.map((log, i) => {
            const actor = (log.profiles as unknown) as {
              full_name: string
            } | null
            const changes = log.changes as {
              from?: string
              to?: string
            } | null
            const timeAgo = formatDistanceToNow(new Date(log.created_at), {
              addSuffix: true,
              locale: es,
            })
            const label =
              ACTION_LABELS[log.action] ??
              log.action.replace(/_/g, " ")

            return (
              <div key={log.id} className="relative flex gap-4 pb-6 last:pb-0">
                {i < (logs?.length ?? 0) - 1 && (
                  <div
                    className="absolute left-0 top-5 bottom-0 w-px bg-border"
                    style={{ left: "-1.25rem" }}
                  />
                )}
                <div
                  className="absolute -left-[1.375rem] flex h-5 w-5 items-center justify-center rounded-full border-2 bg-background border-border"
                  aria-hidden
                >
                  <div className="h-2 w-2 rounded-full bg-primary" />
                </div>
                <div className="ml-2 space-y-1">
                  <p className="text-sm font-medium">{label}</p>
                  {changes?.from && changes?.to && (
                    <div className="flex items-center gap-1.5">
                      <Badge variant="pending" className="text-xs">
                        {STATUS_LABELS[changes.from] ?? changes.from}
                      </Badge>
                      <span className="text-xs text-muted-foreground">→</span>
                      <Badge variant="default" className="text-xs">
                        {STATUS_LABELS[changes.to] ?? changes.to}
                      </Badge>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {actor?.full_name ?? "Sistema"} · {timeAgo}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
