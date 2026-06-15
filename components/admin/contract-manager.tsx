"use client"

import { useState, useTransition, useRef } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { upsertContract, type ContractKind, type ContractStatus } from "@/app/(admin)/admin/tracking/actions"

type ContractState = {
  payefy: string | null
  transfer_increase: string | null
  transfer_contract: string | null
}

interface ContractDef {
  kind: ContractKind
  label: string
  hint: string
  key: keyof ContractState
}

const CONTRACT_DEFS: ContractDef[] = [
  { kind: "payefy_service",           label: "Contrato Payefy",            hint: "DocuSign",  key: "payefy" },
  { kind: "transfer_increase_letter", label: "Carta de aumento Transfer",  hint: "",          key: "transfer_increase" },
  { kind: "transfer_contract",        label: "Contrato Transfer",          hint: "weetrust",  key: "transfer_contract" },
]

function statusLabel(s: string | null) {
  if (!s || s === "pending") return "Pendiente"
  if (s === "sent")          return "Enviado"
  if (s === "signed")        return "Firmado"
  if (s === "not_applicable") return "No aplica"
  return s
}

function statusColor(s: string | null) {
  if (s === "signed")   return "#0f6e56"
  if (s === "sent")     return "#92500b"
  if (s === "not_applicable") return "#b4bcb7"
  return "#b4bcb7"
}

interface RowProps {
  applicationId: string
  def: ContractDef
  currentStatus: string | null
}

function ContractRow({ applicationId, def, currentStatus }: RowProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [link, setLink] = useState("")
  const [showLink, setShowLink] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleStatus(newStatus: ContractStatus) {
    setError(null)
    startTransition(async () => {
      const res = await upsertContract({
        applicationId,
        kind: def.kind,
        status: newStatus,
        externalLink: link || undefined,
      })
      if (res?.error) setError(res.error)
      else { setLink(""); setShowLink(false); router.refresh() }
    })
  }

  async function handleFileUpload(file: File) {
    setError(null)
    setUploading(true)
    try {
      const supabase = createClient()
      const ext = file.name.split(".").pop() ?? "pdf"
      const path = `contracts/${applicationId}/${def.kind}.${ext}`
      const { error: upErr } = await supabase.storage
        .from("kyc-documents")
        .upload(path, file, { upsert: true })
      if (upErr) { setError(upErr.message); return }

      const res = await upsertContract({
        applicationId,
        kind: def.kind,
        status: "signed",
        signedDocPath: path,
        externalLink: link || undefined,
      })
      if (res?.error) setError(res.error)
      else { setLink(""); setShowLink(false); router.refresh() }
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  const isSigned = currentStatus === "signed"
  const isSent   = currentStatus === "sent"

  return (
    <div style={{ borderBottom: "1px solid #e3e8e5", paddingBottom: 10, marginBottom: 10 }}>
      {/* Row header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        {/* Status dot */}
        <span style={{ width: 8, height: 8, borderRadius: "50%",
          background: statusColor(currentStatus), display: "inline-block", flexShrink: 0 }} />

        {/* Label */}
        <span style={{ fontSize: 13, flex: 1, color: "#16201b", minWidth: 160 }}>
          {def.label}
          {def.hint && (
            <span style={{ fontSize: 11, color: "#b4bcb7", marginLeft: 5 }}>({def.hint})</span>
          )}
        </span>

        {/* Status pill */}
        <span style={{ fontSize: 11, fontWeight: 600, color: statusColor(currentStatus) }}>
          {statusLabel(currentStatus)}
        </span>

        {/* Action buttons */}
        {!isSigned && (
          <>
            {!isSent && (
              <button
                disabled={pending}
                onClick={() => handleStatus("sent")}
                style={{ fontSize: 11, padding: "4px 10px", border: "1px solid #d3dbd6",
                  borderRadius: 6, background: "#fff", cursor: "pointer", color: "#92500b",
                  fontWeight: 500, opacity: pending ? 0.5 : 1 }}
              >
                Enviado
              </button>
            )}
            <button
              disabled={pending || uploading}
              onClick={() => setShowLink((v) => !v)}
              style={{ fontSize: 11, padding: "4px 10px", border: "1px solid #004238",
                borderRadius: 6, background: "#e7f0ea", cursor: "pointer",
                color: "#004238", fontWeight: 500, opacity: (pending || uploading) ? 0.5 : 1 }}
            >
              Firmado
            </button>
          </>
        )}

        {/* Upload signed doc */}
        {!isSigned && (
          <label style={{ fontSize: 11, padding: "4px 10px", border: "1px solid #d3dbd6",
            borderRadius: 6, background: "#fff", cursor: "pointer", color: "#5f6b64",
            fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 4,
            opacity: uploading ? 0.5 : 1 }}>
            <svg viewBox="0 0 24 24" width={12} height={12} fill="none"
              stroke="currentColor" strokeWidth={2}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            {uploading ? "Subiendo…" : "Subir escaneo"}
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              style={{ display: "none" }}
              disabled={uploading}
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) handleFileUpload(f)
              }}
            />
          </label>
        )}

        {isSigned && (
          <span style={{ fontSize: 11, color: "#0f6e56", fontWeight: 600 }}>✓ Firmado</span>
        )}
      </div>

      {/* Link + confirm panel */}
      {showLink && !isSigned && (
        <div style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <input
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="Link DocuSign / weetrust (opcional)"
            style={{ flex: 1, minWidth: 200, fontSize: 12, padding: "5px 8px",
              border: "1px solid #e3e8e5", borderRadius: 6, outline: "none", color: "#16201b" }}
          />
          <button
            disabled={pending}
            onClick={() => handleStatus("signed")}
            style={{ fontSize: 12, padding: "5px 12px", background: "#004238",
              color: "#fff", border: "none", borderRadius: 6, cursor: "pointer",
              fontWeight: 600, opacity: pending ? 0.5 : 1 }}
          >
            {pending ? "Guardando…" : "Confirmar firma"}
          </button>
          <button
            onClick={() => setShowLink(false)}
            style={{ fontSize: 12, padding: "5px 8px", background: "#fff",
              color: "#5f6b64", border: "1px solid #d3dbd6", borderRadius: 6, cursor: "pointer" }}
          >
            Cancelar
          </button>
        </div>
      )}

      {error && (
        <p style={{ fontSize: 11, color: "#a32d2d", marginTop: 4 }}>{error}</p>
      )}
    </div>
  )
}

interface Props {
  applicationId: string
  contracts: ContractState
}

export function ContractManager({ applicationId, contracts }: Props) {
  return (
    <div>
      <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".04em",
        color: "#5f6b64", margin: "0 0 10px", fontWeight: 600 }}>
        Contratos y firmas
      </p>
      {CONTRACT_DEFS.map((def) => (
        <ContractRow
          key={def.kind}
          applicationId={applicationId}
          def={def}
          currentStatus={contracts[def.key]}
        />
      ))}
    </div>
  )
}
