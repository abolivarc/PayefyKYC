"use client"

import { useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  uploadCommercialProposal,
  deleteCommercialProposal,
  type ApplicationProposal,
} from "@/lib/proposals/attachment-actions"

// Propuestas comerciales adjuntas al expediente. Vive junto a "Contratos y
// firmas" en el panel de revisión: es un artefacto interno, no un documento
// que el cliente deba ver o reemplazar.

function formatSize(bytes: number | null) {
  if (!bytes) return ""
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" })
}

const UploadIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
)

export function ProposalAttachments({
  applicationId,
  proposals,
}: {
  applicationId: string
  proposals: ApplicationProposal[]
}) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [notes, setNotes] = useState("")

  async function handleUpload(file: File) {
    setError(null)
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append("applicationId", applicationId)
      fd.append("file", file)
      if (notes.trim()) fd.append("notes", notes.trim())
      const res = await uploadCommercialProposal(fd)
      if (res?.error) setError(res.error)
      else {
        setNotes("")
        router.refresh()
      }
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  function handleDelete(id: string) {
    if (!confirm("¿Quitar esta propuesta del expediente?")) return
    startTransition(async () => {
      const res = await deleteCommercialProposal(id, applicationId)
      if (res?.error) setError(res.error)
      else router.refresh()
    })
  }

  const latest = proposals[0]
  const previous = proposals.slice(1)

  return (
    <div style={{ marginTop: 18 }}>
      <p style={{
        fontSize: 11, textTransform: "uppercase", letterSpacing: ".06em",
        color: "var(--admin-text-subtle, #64748B)", margin: "0 0 10px", fontWeight: 700,
      }}>
        Propuesta comercial
      </p>

      {latest ? (
        <div style={{ background: "#F3F7F4", border: "1px solid #E4ECE7", borderRadius: 10, padding: "10px 12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#0f6e56", background: "#e7f6ec", borderRadius: 99, padding: "2px 8px", flexShrink: 0 }}>
              Vigente
            </span>
            <a
              href={`/api/proposals/${latest.id}/view`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: 12.5, fontWeight: 600, color: "#0F1B2A", textDecoration: "none", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
              title={latest.file_name}
            >
              {latest.file_name} ↗
            </a>
            <button
              onClick={() => handleDelete(latest.id)}
              disabled={pending}
              title="Quitar"
              style={{ fontSize: 11, color: "#5B7168", background: "transparent", border: "none", cursor: "pointer", padding: 0, flexShrink: 0 }}
            >
              Quitar
            </button>
          </div>
          <p style={{ margin: "4px 0 0", fontSize: 11, color: "#5B7168" }}>
            {formatDate(latest.created_at)}
            {latest.uploader_name ? ` · ${latest.uploader_name}` : ""}
            {latest.file_size ? ` · ${formatSize(latest.file_size)}` : ""}
          </p>
          {latest.notes && (
            <p style={{ margin: "6px 0 0", fontSize: 11.5, color: "#3E5049", lineHeight: 1.4 }}>{latest.notes}</p>
          )}
        </div>
      ) : (
        <p style={{ margin: "0 0 8px", fontSize: 12, color: "#5B7168" }}>
          Aún no hay propuesta adjunta. Sube el PDF que se le envió al cliente para tenerlo en el expediente.
        </p>
      )}

      {previous.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <p style={{ margin: "0 0 4px", fontSize: 10.5, fontWeight: 700, color: "#8A9E94", textTransform: "uppercase", letterSpacing: ".06em" }}>
            Versiones anteriores
          </p>
          {previous.map((p) => (
            <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0", borderTop: "1px solid #EEF2EF" }}>
              <a
                href={`/api/proposals/${p.id}/view`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: 11.5, color: "#3E5049", textDecoration: "none", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                title={p.file_name}
              >
                {p.file_name}
              </a>
              <span style={{ fontSize: 10.5, color: "#8A9E94", flexShrink: 0 }}>{formatDate(p.created_at)}</span>
              <button
                onClick={() => handleDelete(p.id)}
                disabled={pending}
                style={{ fontSize: 10.5, color: "#8A9E94", background: "transparent", border: "none", cursor: "pointer", padding: 0, flexShrink: 0 }}
              >
                Quitar
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Subir nueva / reemplazar */}
      <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Nota opcional (ej. versión final aceptada, tasas negociadas…)"
          disabled={uploading}
          style={{ fontSize: 12, padding: "7px 10px", border: "1px solid #D1D5DB", borderRadius: 8, outline: "none" }}
        />
        <label style={{
          fontSize: 12, fontWeight: 700, padding: "7px 14px", alignSelf: "flex-start",
          background: latest ? "#fff" : "#004238", color: latest ? "#004238" : "#A8F898",
          border: latest ? "1px solid #004238" : "1px solid #004238", borderRadius: 8,
          cursor: uploading ? "not-allowed" : "pointer", opacity: uploading ? 0.6 : 1,
          display: "inline-flex", alignItems: "center", gap: 5,
        }}>
          <UploadIcon />
          {uploading ? "Subiendo…" : latest ? "Subir nueva versión" : "Subir propuesta"}
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.heic,.heif"
            style={{ display: "none" }}
            disabled={uploading}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f) }}
          />
        </label>
      </div>

      {error && <p style={{ fontSize: 11, color: "#a32d2d", margin: "6px 0 0" }}>{error}</p>}
    </div>
  )
}
