"use client"

import { useState } from "react"
import { exportExpediente } from "@/app/(admin)/admin/tracking/export-action"
import { downloadExpedienteZip } from "@/lib/documents/download-expediente-zip"

interface Props {
  applicationId: string
}

export function ExportExpedienteButton({ applicationId }: Props) {
  const [loading, setLoading] = useState(false)
  const [progreso, setProgreso] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleExport() {
    setLoading(true)
    setError(null)
    setProgreso(null)
    try {
      const result = await exportExpediente(applicationId)
      if (result.error || !result.manifest) {
        setError(result.error ?? "Error al exportar")
        return
      }
      await downloadExpedienteZip(result.manifest, (hecho, total) =>
        setProgreso(`${hecho}/${total}`)
      )
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
      setProgreso(null)
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
      <button
        onClick={handleExport}
        disabled={loading}
        className="hover:bg-[#003530] transition-colors"
        style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "8px 14px", fontSize: 13, fontWeight: 600, borderRadius: 9,
          background: "#004238", color: "#A8F898", border: "none",
          cursor: loading ? "not-allowed" : "pointer",
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading ? (
          <>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: "spin 1s linear infinite" }}>
              <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
            </svg>
            {progreso ? `Descargando ${progreso}…` : "Preparando…"}
          </>
        ) : (
          <>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Descargar .zip
          </>
        )}
      </button>
      {error && (
        <span style={{ fontSize: 11, color: "#d1622f" }}>{error}</span>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
