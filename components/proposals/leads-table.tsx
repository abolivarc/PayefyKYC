"use client"

import { useMemo, useState, useTransition } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Dialog, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select } from "@/components/ui/select"
import { formatCurrency, PRODUCT_TYPE_LABELS, ProductType } from "@/lib/proposals/types"
import {
  updateLeadStatus,
  linkLeadToCompany,
  deleteLead,
} from "@/app/(admin)/admin/proposals/actions"
import { Link2, Trash2, Search } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"

export interface LeadRow {
  id: string
  created_at: string
  business_name: string
  contact_name: string | null
  contact_email: string | null
  contact_phone: string | null
  sector_name: string | null
  monthly_volume: number | null
  product_type: string | null
  proposal_type: string | null
  proposal_data: Record<string, unknown>
  status: "propuesta" | "negociacion" | "ganado" | "perdido"
  company_id: string | null
  companies: { legal_name: string } | null
}

const STATUS_LABELS: Record<LeadRow["status"], string> = {
  propuesta: "Propuesta enviada",
  negociacion: "En negociación",
  ganado: "Ganado ✓",
  perdido: "Perdido",
}

const STATUS_VARIANT: Record<LeadRow["status"], "success" | "warning" | "destructive" | "pending"> = {
  propuesta: "warning",
  negociacion: "pending",
  ganado: "success",
  perdido: "destructive",
}

export function LeadsTable({
  leads,
  companies,
}: {
  leads: LeadRow[]
  companies: { id: string; legal_name: string }[]
}) {
  const [search, setSearch] = useState("")
  const [linkingLead, setLinkingLead] = useState<LeadRow | null>(null)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return leads
    return leads.filter(
      (l) =>
        l.business_name.toLowerCase().includes(q) ||
        (l.contact_name ?? "").toLowerCase().includes(q) ||
        (l.sector_name ?? "").toLowerCase().includes(q)
    )
  }, [leads, search])

  if (leads.length === 0) {
    return (
      <div style={{ background: "var(--admin-surface, #fff)", border: "1px solid var(--admin-border, #E7ECF1)", borderRadius: 16, padding: 32, textAlign: "center" }}>
        <p style={{ margin: 0, fontSize: 14, color: "var(--admin-text-muted, #5A6B7B)" }}>
          Aún no hay leads. Genera tu primera propuesta con el botón de arriba.
        </p>
      </div>
    )
  }

  return (
    <div>
      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por negocio, contacto o giro…"
          className="pl-10 bg-white"
        />
      </div>

      <div style={{ background: "var(--admin-surface, #fff)", border: "1px solid var(--admin-border, #E7ECF1)", borderRadius: 16, boxShadow: "0 1px 2px rgba(16,30,45,.05)", overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--admin-surface-2, #FBFCFD)", borderBottom: "1px solid var(--admin-border, #E7ECF1)" }}>
                {["Negocio", "Producto", "Volumen", "Tasas ofrecidas", "Estado", "Cliente KYC", "Creado", ""].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "12px 14px", fontSize: 11, fontWeight: 600, letterSpacing: ".05em", textTransform: "uppercase", color: "var(--admin-text-subtle, #8A99A8)", whiteSpace: "nowrap" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((lead) => (
                <LeadTableRow
                  key={lead.id}
                  lead={lead}
                  onLink={() => setLinkingLead(lead)}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {linkingLead && (
        <LinkCompanyDialog
          lead={linkingLead}
          companies={companies}
          onClose={() => setLinkingLead(null)}
        />
      )}
    </div>
  )
}

function LeadTableRow({ lead, onLink }: { lead: LeadRow; onLink: () => void }) {
  const [isPending, startTransition] = useTransition()
  const pd = lead.proposal_data as {
    negotiatedDebitRate?: number
    negotiatedCreditRate?: number
  }

  const handleStatusChange = (status: string) => {
    startTransition(async () => {
      await updateLeadStatus(lead.id, status as LeadRow["status"])
    })
  }

  const handleDelete = () => {
    if (!confirm(`¿Eliminar el lead de "${lead.business_name}"?`)) return
    startTransition(async () => {
      await deleteLead(lead.id)
    })
  }

  return (
    <tr className="table-row-hover" style={{ borderBottom: "1px solid var(--admin-border, #E7ECF1)", opacity: isPending ? 0.5 : 1 }}>
      <td style={{ padding: "13px 14px", verticalAlign: "middle" }}>
        <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: "var(--admin-text, #0F1B2A)" }}>
          {lead.business_name}
        </p>
        <p style={{ margin: 0, fontSize: 12, color: "var(--admin-text-subtle, #8A99A8)" }}>
          {lead.contact_name ?? "—"}
          {lead.sector_name ? ` · ${lead.sector_name.split("—")[0].trim()}` : ""}
        </p>
      </td>
      <td style={{ padding: "13px 14px", verticalAlign: "middle" }}>
        <Badge variant="outline" className="text-xs whitespace-nowrap">
          {PRODUCT_TYPE_LABELS[(lead.product_type ?? "terminales") as ProductType] ?? lead.product_type}
        </Badge>
        <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--admin-text-subtle, #8A99A8)" }}>
          {lead.proposal_type === "comparative" ? "Comparativa" : "General"}
        </p>
      </td>
      <td style={{ padding: "13px 14px", verticalAlign: "middle", fontSize: 13, whiteSpace: "nowrap" }}>
        {lead.monthly_volume ? formatCurrency(lead.monthly_volume) : "—"}
      </td>
      <td style={{ padding: "13px 14px", verticalAlign: "middle", fontSize: 12, whiteSpace: "nowrap", color: "var(--admin-text-muted, #5A6B7B)" }}>
        {pd.negotiatedDebitRate !== undefined
          ? `D ${pd.negotiatedDebitRate}% · C ${pd.negotiatedCreditRate}%`
          : "—"}
      </td>
      <td style={{ padding: "13px 14px", verticalAlign: "middle" }}>
        <div className="flex items-center gap-2">
          <Badge variant={STATUS_VARIANT[lead.status]} className="text-xs whitespace-nowrap">
            {STATUS_LABELS[lead.status]}
          </Badge>
          <Select
            value={lead.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="h-8 text-xs w-[130px]"
          >
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
      </td>
      <td style={{ padding: "13px 14px", verticalAlign: "middle" }}>
        {lead.companies ? (
          <span style={{ fontSize: 12, fontWeight: 600, color: "#0B7A44" }}>
            {lead.companies.legal_name}
          </span>
        ) : (
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onLink}>
            <Link2 className="h-3 w-3 mr-1" />
            Vincular
          </Button>
        )}
      </td>
      <td style={{ padding: "13px 14px", verticalAlign: "middle", fontSize: 12, whiteSpace: "nowrap", color: "var(--admin-text-subtle, #8A99A8)" }}>
        {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true, locale: es })}
      </td>
      <td style={{ padding: "13px 8px", verticalAlign: "middle" }}>
        <button
          type="button"
          onClick={handleDelete}
          className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
          title="Eliminar lead"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </td>
    </tr>
  )
}

function LinkCompanyDialog({
  lead,
  companies,
  onClose,
}: {
  lead: LeadRow
  companies: { id: string; legal_name: string }[]
  onClose: () => void
}) {
  const [companyId, setCompanyId] = useState<string>("")
  const [isPending, startTransition] = useTransition()

  const handleLink = () => {
    if (!companyId) return
    startTransition(async () => {
      await linkLeadToCompany(lead.id, companyId)
      onClose()
    })
  }

  return (
    <Dialog open onClose={onClose}>
      <DialogHeader>
        <DialogTitle>Vincular lead con cliente KYC</DialogTitle>
      </DialogHeader>
      <p className="text-sm text-muted-foreground mb-3">
        Selecciona la empresa registrada en la plataforma que corresponde a{" "}
        <strong>{lead.business_name}</strong>. El lead se marcará como{" "}
        <strong>ganado</strong>.
      </p>
      <Select value={companyId} onChange={(e) => setCompanyId(e.target.value)}>
        <option value="" disabled>
          Seleccionar empresa…
        </option>
        {companies.map((c) => (
          <option key={c.id} value={c.id}>
            {c.legal_name}
          </option>
        ))}
      </Select>
      <div className="flex justify-end gap-2 mt-4">
        <Button variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button
          onClick={handleLink}
          disabled={!companyId || isPending}
          style={{ background: "#004238", color: "#AEFF99" }}
        >
          {isPending && <Spinner size={13} />}
          Vincular y marcar ganado
        </Button>
      </div>
    </Dialog>
  )
}
