"use client"

import { useRef, useState, useTransition } from "react"
import { addExtraDocument } from "@/app/(client)/applications/actions"
import { uploadDocumentFile } from "@/lib/documents/upload"

type DocStatus =
  | "pending_upload"
  | "pending_review"
  | "approved"
  | "rejected"
  | "changes_requested"

const STATUS: Record<DocStatus, { label: string; color: string; bg: string }> = {
  pending_upload:    { label: "Pendiente",        color: "#5B7168", bg: "#F3F7F4" },
  pending_review:    { label: "En revisión",       color: "#1D4ED8", bg: "#EFF4FF" },
  approved:          { label: "Aprobado",          color: "#1f7a4d", bg: "#e7f6ec" },
  rejected:          { label: "Rechazado",         color: "#d1622f", bg: "#fef2f2" },
  changes_requested: { label: "Observaciones",     color: "#c9772f", bg: "#fdf1e6" },
}

// Etiquetas de los 4 campos base; los extras son "Adicional N"
const BASE_LABELS = ["Exterior 1", "Exterior 2", "Interior 1", "Interior 2"]

interface Slot {
  id: string | null // null = campo visible sin registro en DB todavía
  status: DocStatus
  fileName: string | null
}

interface Props {
  applicationId: string
  templateId: string
  templateName: string
  templateInstructions: string | null
  initialDocs: { id: string; status: DocStatus; fileName: string | null }[]
}

export function PhotosUploadRow({
  applicationId,
  templateId,
  templateName,
  templateInstructions,
  initialDocs,
}: Props) {
  const [slots, setSlots] = useState<Slot[]>(() => {
    const docs: Slot[] = initialDocs.map((d) => ({
      id: d.id,
      status: d.status,
      fileName: d.fileName,
    }))
    // Siempre mostrar mínimo los 4 campos base
    while (docs.length < 4) docs.push({ id: null, status: "pending_upload", fileName: null })
    return docs
  })
  const [activeIdx, setActiveIdx] = useState<number | null>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function openPicker(idx: number) {
    setActiveIdx(idx)
    inputRef.current?.click()
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || activeIdx === null) return
    const idx = activeIdx
    setError(null)
    e.target.value = ""
    startTransition(async () => {
      let docId: string | null = slots[idx]?.id ?? null
      // Campo sin registro: crearlo primero (mismo patrón que multi-upload)
      if (!docId) {
        const created = await addExtraDocument(applicationId, templateId)
        if (created?.error || !created?.documentId) {
          setError(created?.error ?? "No se pudo crear el campo")
          return
        }
        docId = created.documentId
      }
      const finalId = docId as string
      setSlots((prev) =>
        prev.map((s, i) => (i === idx ? { ...s, id: finalId } : s))
      )
      const result = await uploadDocumentFile(finalId, file)
      if (!result.success) {
        setError(result.error ?? "Error al subir la foto")
      } else {
        setSlots((prev) =>
          prev.map((s, i) =>
            i === idx
              ? { id: finalId, status: "pending_review" as DocStatus, fileName: file.name }
              : s
          )
        )
      }
    })
  }

  function handleAddSlot() {
    setSlots((prev) => [...prev, { id: null, status: "pending_upload", fileName: null }])
  }

  const uploaded = slots.filter((s) => s.status !== "pending_upload").length

  return (
    <div style={{ background: "#fff", border: "1px solid #E4ECE7", borderRadius: 10, padding: "12px 14px" }}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <p className="font-bold leading-snug" style={{ fontSize: 14, color: "#0F2A22", marginBottom: 4 }}>
            {templateName}
          </p>
          {templateInstructions && (
            <p className="text-xs leading-relaxed" style={{ color: "#8A9E94" }}>
              {templateInstructions}
            </p>
          )}
        </div>
        <span
          className="shrink-0 text-[11px] font-semibold rounded-full"
          style={{ background: "#F3F7F4", color: "#5B7168", border: "1px solid #E4ECE7", padding: "3px 10px", whiteSpace: "nowrap" }}
        >
          {uploaded}/{slots.length} subidas
        </span>
      </div>

      {/* Campos de foto */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
          gap: 8,
          marginBottom: 10,
        }}
      >
        {slots.map((slot, idx) => {
          const cfg = STATUS[slot.status]
          const label = BASE_LABELS[idx] ?? `Adicional ${idx - BASE_LABELS.length + 1}`
          const hasFile = slot.status !== "pending_upload"
          return (
            <div
              key={idx}
              style={{
                background: "#F8FAF9",
                border: "1px solid #E4ECE7",
                borderRadius: 10,
                padding: "8px 10px",
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold" style={{ color: "#5B7168" }}>
                  {label}
                </span>
                <span
                  className="text-[10px] font-bold rounded-full"
                  style={{ background: cfg.bg, color: cfg.color, padding: "2px 7px", whiteSpace: "nowrap" }}
                >
                  {cfg.label}
                </span>
              </div>
              {slot.fileName && (
                <p className="text-[10px] truncate" style={{ color: "#8A9E94", margin: 0 }}>
                  {slot.fileName}
                </p>
              )}
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => openPicker(idx)}
                  className="text-[11px] font-bold"
                  style={{ color: "#004238", background: "none", border: "none", padding: 0, cursor: "pointer" }}
                >
                  {hasFile ? "Cambiar" : "Subir foto"}
                </button>
                {hasFile && slot.id && (
                  <a
                    href={`/api/documents/${slot.id}/view`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] font-bold"
                    style={{ color: "#1f7a4d", textDecoration: "none" }}
                  >
                    Ver
                  </a>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Agregar más */}
      <button
        type="button"
        disabled={isPending}
        onClick={handleAddSlot}
        className="text-xs font-bold"
        style={{
          color: "#004238",
          background: "#F0FAF3",
          border: "1px dashed #004238",
          borderRadius: 8,
          padding: "6px 12px",
          cursor: "pointer",
        }}
      >
        + Agregar otra foto
      </button>

      {error && (
        <p className="text-xs mt-2" style={{ color: "#d1622f" }}>
          {error}
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*,.pdf"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  )
}
