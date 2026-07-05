"use client"

import { useState, useTransition, useRef } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { upsertContract, type ContractKind, type ContractStatus } from "@/app/(admin)/admin/tracking/actions"

export type ContractState = {
  payefy: string | null
  transfer_increase: string | null
  transfer_contract: string | null
  payefy_doc_path?: string | null
}

// ── Payefy contract row: upload-focused ─────────────────────────────────────

function PayefyRow({
  applicationId,
  currentStatus,
  signedDocPath,
}: {
  applicationId: string
  currentStatus: string | null
  signedDocPath?: string | null
}) {
  const router = useRouter()
  const [uploading, setUploading] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const isSigned = currentStatus === "signed"

  async function handleUpload(file: File) {
    setError(null)
    setUploading(true)
    try {
      const supabase = createClient()
      const ext = file.name.split(".").pop() ?? "pdf"
      const path = `contracts/${applicationId}/payefy_service.${ext}`
      const { error: upErr } = await supabase.storage
        .from("kyc-documents")
        .upload(path, file, { upsert: true })
      if (upErr) { setError(upErr.message); return }
      const res = await upsertContract({ applicationId, kind: "payefy_service", status: "signed", signedDocPath: path })
      if (res?.error) setError(res.error)
      else router.refresh()
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  function handleMarkSigned() {
    startTransition(async () => {
      const res = await upsertContract({ applicationId, kind: "payefy_service", status: "signed" })
      if (res?.error) setError(res.error)
      else router.refresh()
    })
  }

  function handleReset() {
    startTransition(async () => {
      const res = await upsertContract({ applicationId, kind: "payefy_service", status: "pending" })
      if (res?.error) setError(res.error)
      else router.refresh()
    })
  }

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <div style={{
          width: 20, height: 20, borderRadius: 4, border: `2px solid ${isSigned ? "#0f6e56" : "#D1D5DB"}`,
          background: isSigned ? "#0f6e56" : "#fff", flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {isSigned && (
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
              <path d="M2 5.5l2.5 2.5 4.5-4.5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </div>
        <div style={{ flex: 1 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#0F1B2A" }}>
            Contrato Payefy
          </span>
          <span style={{ fontSize: 11, color: "#8A9E94", marginLeft: 6 }}>(DocuSign)</span>
        </div>
        {isSigned && (
          <span style={{ fontSize: 11, fontWeight: 700, color: "#0f6e56", background: "#e7f6ec", borderRadius: 99, padding: "2px 8px" }}>
            Firmado
          </span>
        )}
      </div>

      {!isSigned ? (
        <div style={{
          border: "2px dashed #D1D5DB", borderRadius: 10,
          padding: "14px 16px", display: "flex", flexDirection: "column",
          alignItems: "center", gap: 10, background: "#FAFAFA",
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#8A9E94" strokeWidth="1.5">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="12" y1="18" x2="12" y2="12"/>
            <line x1="9" y1="15" x2="15" y2="15"/>
          </svg>
          <p style={{ margin: 0, fontSize: 12, color: "#5B7168", textAlign: "center" }}>
            Sube el contrato firmado (PDF o imagen)
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
            <label style={{
              fontSize: 12, fontWeight: 700, padding: "7px 16px",
              background: "#004238", color: "#A8F898", borderRadius: 8,
              cursor: uploading ? "not-allowed" : "pointer", opacity: uploading ? 0.6 : 1,
              display: "inline-flex", alignItems: "center", gap: 5,
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              {uploading ? "Subiendo…" : "Subir contrato"}
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                style={{ display: "none" }}
                disabled={uploading}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f) }}
              />
            </label>
            <button
              disabled={pending || uploading}
              onClick={handleMarkSigned}
              style={{
                fontSize: 12, fontWeight: 600, padding: "7px 14px",
                background: "#fff", border: "1px solid #D1D5DB", color: "#5B7168",
                borderRadius: 8, cursor: "pointer", opacity: (pending || uploading) ? 0.5 : 1,
              }}
            >
              {pending ? "…" : "Marcar firmado (sin archivo)"}
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#e7f6ec", borderRadius: 8, padding: "8px 12px" }}>
          {signedDocPath && (
            <a
              href={`/api/contracts/${applicationId}/payefy_service/view`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: 12, fontWeight: 600, color: "#0f6e56", textDecoration: "none" }}
            >
              Ver contrato ↗
            </a>
          )}
          <label style={{
            fontSize: 12, fontWeight: 600, color: "#5B7168", cursor: "pointer",
            display: "inline-flex", alignItems: "center", gap: 4, marginLeft: "auto",
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            Cambiar archivo
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              style={{ display: "none" }}
              disabled={uploading}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f) }}
            />
          </label>
          <button
            onClick={handleReset}
            disabled={pending}
            style={{ fontSize: 11, color: "#8A9E94", background: "transparent", border: "none", cursor: "pointer", padding: 0 }}
          >
            Deshacer
          </button>
        </div>
      )}
      {error && <p style={{ fontSize: 11, color: "#a32d2d", margin: "4px 0 0" }}>{error}</p>}
    </div>
  )
}

// ── Transfer contract row: checkbox-focused ──────────────────────────────────

function TransferCheckRow({
  applicationId,
  kind,
  label,
  currentStatus,
}: {
  applicationId: string
  kind: ContractKind
  label: string
  currentStatus: string | null
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const isSigned = currentStatus === "signed"

  function toggle() {
    const next: ContractStatus = isSigned ? "pending" : "signed"
    startTransition(async () => {
      const res = await upsertContract({ applicationId, kind, status: next })
      if (res?.error) setError(res.error)
      else router.refresh()
    })
  }

  return (
    <div style={{ marginBottom: 10 }}>
      <button
        onClick={toggle}
        disabled={pending}
        style={{
          display: "flex", alignItems: "center", gap: 10,
          background: "none", border: "none", cursor: pending ? "not-allowed" : "pointer",
          padding: 0, opacity: pending ? 0.6 : 1, width: "100%", textAlign: "left",
        }}
      >
        <div style={{
          width: 20, height: 20, borderRadius: 4, flexShrink: 0,
          border: `2px solid ${isSigned ? "#0f6e56" : "#D1D5DB"}`,
          background: isSigned ? "#0f6e56" : "#fff",
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "background .15s, border-color .15s",
        }}>
          {isSigned && (
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
              <path d="M2 5.5l2.5 2.5 4.5-4.5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </div>
        <span style={{ fontSize: 13, color: isSigned ? "#0F1B2A" : "#5B7168", fontWeight: isSigned ? 600 : 400, flex: 1 }}>
          {label}
        </span>
        {isSigned && (
          <span style={{ fontSize: 11, fontWeight: 700, color: "#0f6e56", background: "#e7f6ec", borderRadius: 99, padding: "2px 8px", flexShrink: 0 }}>
            Confirmado
          </span>
        )}
      </button>
      {error && <p style={{ fontSize: 11, color: "#a32d2d", margin: "4px 0 0" }}>{error}</p>}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  applicationId: string
  contracts: ContractState
}

export function ContractManager({ applicationId, contracts }: Props) {
  return (
    <div>
      <p style={{
        fontSize: 11, textTransform: "uppercase", letterSpacing: ".06em",
        color: "var(--admin-text-subtle, #8A99A8)", margin: "0 0 14px", fontWeight: 700,
      }}>
        Contratos y firmas
      </p>

      <PayefyRow
        applicationId={applicationId}
        currentStatus={contracts.payefy}
        signedDocPath={contracts.payefy_doc_path}
      />

      <div style={{ borderTop: "1px solid var(--admin-border, #E7ECF1)", paddingTop: 12, marginTop: 4, display: "flex", flexDirection: "column", gap: 2 }}>
        <TransferCheckRow
          applicationId={applicationId}
          kind="transfer_contract"
          label="Contrato Transfer firmado por proveedor"
          currentStatus={contracts.transfer_contract}
        />
        <TransferCheckRow
          applicationId={applicationId}
          kind="transfer_increase_letter"
          label="Carta de aumento Transfer confirmada"
          currentStatus={contracts.transfer_increase}
        />
      </div>
    </div>
  )
}
