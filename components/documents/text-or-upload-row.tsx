"use client"

import { useId, useRef, useState, useTransition } from "react"
import { saveDataCheckValue } from "@/app/(client)/applications/actions"
import { uploadDocumentFile } from "@/lib/documents/upload"
import { Spinner } from "@/components/ui/spinner"

type DocStatus =
  | "pending_upload"
  | "pending_review"
  | "approved"
  | "rejected"
  | "changes_requested"

const STATUS: Record<string, { label: string; color: string; bg: string; stripe: string }> = {
  pending_upload:    { label: "Pendiente",     color: "#5B7168", bg: "#F3F7F4", stripe: "#D1D5DB" },
  pending_review:    { label: "En revisión",   color: "#1D4ED8", bg: "#EFF4FF", stripe: "#1D4ED8" },
  approved:          { label: "Aprobado",      color: "#1f7a4d", bg: "#e7f6ec", stripe: "#1f7a4d" },
  rejected:          { label: "Rechazado",     color: "#d1622f", bg: "#fef2f2", stripe: "#d1622f" },
  changes_requested: { label: "Observaciones", color: "#c9772f", bg: "#fdf1e6", stripe: "#c9772f" },
}

/** Acepta "www.ejemplo.com", "ejemplo.com/pagar" o con https://; normaliza al protocolo. */
export function normalizeUrl(raw: string): string | null {
  const v = raw.trim()
  if (!v) return null
  const withProto = /^https?:\/\//i.test(v) ? v : `https://${v}`
  try {
    const u = new URL(withProto)
    // Un dominio real tiene al menos un punto y sin espacios
    if (!u.hostname.includes(".") || /\s/.test(v)) return null
    return u.toString().replace(/\/$/, "")
  } catch {
    return null
  }
}

interface Props {
  documentId: string
  applicationId: string
  templateName: string
  templateInstructions: string | null
  currentStatus: DocStatus
  /** Texto (URL) cuando no hay archivo; nombre del archivo cuando sí lo hay */
  fileName: string | null
  hasFile: boolean
  isRequired?: boolean
  reviewerNotes?: string | null
}

/**
 * Casillero que se cumple de dos formas: escribiendo la URL o subiendo un
 * archivo. El texto se guarda en documents.file_name sin storage_path
 * (como data_check); el archivo, como cualquier upload.
 */
export function TextOrUploadRow({
  documentId,
  applicationId,
  templateName,
  templateInstructions,
  currentStatus,
  fileName,
  hasFile,
  isRequired = true,
  reviewerNotes,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<DocStatus>(currentStatus)
  const [modo, setModo] = useState<"texto" | "archivo">(hasFile ? "archivo" : "texto")
  const [url, setUrl] = useState(hasFile ? "" : (fileName ?? ""))
  const [savedUrl, setSavedUrl] = useState<string | null>(hasFile ? null : fileName)
  const [uploadedName, setUploadedName] = useState<string | null>(hasFile ? fileName : null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const inputId = useId()

  const isApproved = status === "approved"
  const cfg = STATUS[status] ?? STATUS.pending_upload
  const dirty = url.trim() !== (savedUrl ?? "")

  function handleSaveUrl() {
    const normalizada = normalizeUrl(url)
    if (!normalizada) {
      setError("Escribe una dirección válida, por ejemplo www.tunegocio.com")
      return
    }
    setError(null)
    startTransition(async () => {
      const result = await saveDataCheckValue(documentId, applicationId, normalizada)
      if (result?.error) {
        setError(result.error)
      } else {
        setUrl(normalizada)
        setSavedUrl(normalizada)
        setUploadedName(null)
        setStatus("pending_review")
      }
    })
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    e.target.value = ""
    startTransition(async () => {
      const result = await uploadDocumentFile(documentId, file)
      if (!result.success) {
        setError(result.error ?? "Error al subir")
      } else {
        setStatus("pending_review")
        setUploadedName(file.name)
        setSavedUrl(null)
        setUrl("")
      }
    })
  }

  const tabStyle = (activo: boolean): React.CSSProperties => ({
    fontSize: 11,
    fontWeight: 600,
    padding: "4px 10px",
    borderRadius: 99,
    border: "1px solid",
    borderColor: activo ? "#004238" : "#E4ECE7",
    background: activo ? "#004238" : "#fff",
    color: activo ? "#AEFF99" : "#5B7168",
    cursor: "pointer",
  })

  return (
    <div
      style={{
        position: "relative",
        background: status !== "pending_upload" ? "#FAFFFE" : "#fff",
        border: "1px solid #E4ECE7",
        borderRadius: 10,
        padding: "9px 10px 9px 14px",
        display: "flex",
        flexDirection: "column",
        gap: 6,
        overflow: "hidden",
        minHeight: 96,
      }}
    >
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: cfg.stripe }} />

      {/* Estado + modo */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 4, flexWrap: "wrap" }}>
        <span style={{ fontSize: 10, fontWeight: 700, background: cfg.bg, color: cfg.color, borderRadius: 99, padding: "2px 7px", flexShrink: 0 }}>
          {cfg.label}
          {!isRequired && <span style={{ fontWeight: 500, opacity: 0.7 }}> · opc</span>}
        </span>
        {!isApproved && (
          <div role="tablist" aria-label="Cómo entregar" style={{ display: "flex", gap: 4 }}>
            <button type="button" role="tab" aria-selected={modo === "texto"} onClick={() => setModo("texto")} style={tabStyle(modo === "texto")}>
              Escribir URL
            </button>
            <button type="button" role="tab" aria-selected={modo === "archivo"} onClick={() => setModo("archivo")} style={tabStyle(modo === "archivo")}>
              Subir archivo
            </button>
          </div>
        )}
      </div>

      <div>
        <p style={{ margin: 0, fontSize: 12.5, fontWeight: 600, color: "#0F2A22", lineHeight: 1.3 }}>{templateName}</p>
        {templateInstructions && (
          <p style={{ margin: "2px 0 0", fontSize: 10.5, color: "#5B7168", lineHeight: 1.4 }}>{templateInstructions}</p>
        )}
      </div>

      {/* Lo entregado hasta ahora */}
      {savedUrl && !dirty && (
        <a href={savedUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11.5, color: "#1f7a4d", fontWeight: 600, wordBreak: "break-all" }}>
          {savedUrl.replace(/^https?:\/\//, "")} ↗
        </a>
      )}
      {uploadedName && (
        <a href={`/api/documents/${documentId}/view`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11.5, color: "#1f7a4d", fontWeight: 600 }}>
          Ver archivo: {uploadedName}
        </a>
      )}

      {reviewerNotes && status === "changes_requested" && (
        <p style={{ margin: 0, fontSize: 11, color: "#c9772f", background: "#fdf1e6", borderRadius: 6, padding: "6px 8px" }}>
          {reviewerNotes}
        </p>
      )}

      {/* Entrada */}
      {!isApproved && modo === "texto" && (
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <input
            id={inputId}
            type="text"
            inputMode="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSaveUrl() }}
            placeholder="www.tunegocio.com"
            aria-label={`${templateName} (dirección)`}
            disabled={isPending}
            style={{ flex: 1, minWidth: 0, fontSize: 12.5, padding: "7px 10px", border: "1px solid #E4ECE7", borderRadius: 8, outline: "none" }}
          />
          <button
            type="button"
            onClick={handleSaveUrl}
            disabled={isPending || !dirty || !url.trim()}
            style={{
              fontSize: 12, fontWeight: 700, padding: "7px 12px", borderRadius: 8, border: "none",
              background: dirty && url.trim() ? "#004238" : "#E4ECE7", color: dirty && url.trim() ? "#AEFF99" : "#9BAFA7",
              cursor: dirty && url.trim() ? "pointer" : "not-allowed", display: "inline-flex", alignItems: "center", gap: 6,
            }}
          >
            {isPending ? <Spinner size={12} /> : null}
            Guardar
          </button>
        </div>
      )}
      {!isApproved && modo === "archivo" && (
        <div>
          <input ref={inputRef} type="file" accept="*" onChange={handleFileChange} style={{ display: "none" }} aria-label={`Subir ${templateName}`} />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={isPending}
            style={{ fontSize: 12, fontWeight: 700, padding: "7px 12px", borderRadius: 8, border: "1px solid #004238", background: "#fff", color: "#004238", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            {isPending ? <Spinner size={12} /> : null}
            {uploadedName ? "Reemplazar archivo" : "Elegir archivo"}
          </button>
        </div>
      )}

      {error && <p role="alert" style={{ margin: 0, fontSize: 11, color: "#d1622f" }}>{error}</p>}
    </div>
  )
}
