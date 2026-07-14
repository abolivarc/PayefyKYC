"use client"

import { useRef, useState, useTransition } from "react"
import { addExtraDocument } from "@/app/(client)/applications/actions"
import { uploadDocumentFile } from "@/lib/documents/upload"
import { Button } from "@/components/ui/button"

type DocStatus =
  | "pending_upload"
  | "pending_review"
  | "approved"
  | "rejected"
  | "changes_requested"

const STATUS_CONFIG: Record<DocStatus, { label: string; bg: string; color: string; border: string; dot: string }> = {
  pending_upload:    { label: "Pendiente",        bg: "#F3F7F4", color: "#5B7168", border: "#E4ECE7", dot: "#D1D5DB"  },
  pending_review:    { label: "En revisión",       bg: "#EFF4FF", color: "#1D4ED8", border: "#dce8ff", dot: "#1D4ED8" },
  approved:          { label: "Aprobado",          bg: "#e7f6ec", color: "#1f7a4d", border: "#b8e8ca", dot: "#1f7a4d" },
  rejected:          { label: "Rechazado",         bg: "#fef2f2", color: "#d1622f", border: "#fecaca", dot: "#d1622f" },
  changes_requested: { label: "Con observaciones", bg: "#fdf1e6", color: "#c9772f", border: "#f5d9b5", dot: "#c9772f" },
}

interface DocItem {
  id: string | null  // null = slot visible pero sin registro en DB aún
  status: DocStatus
  fileName: string | null
}

interface DocPair {
  frente: DocItem
  reverso: DocItem | null
}

interface Props {
  applicationId: string
  templateId: string
  templateName: string
  templateInstructions: string | null
  fileFormat: string
  initialDocs: { id: string; status: DocStatus; fileName: string | null }[]
}

function buildPairs(docs: DocItem[]): DocPair[] {
  const pairs: DocPair[] = []
  for (let i = 0; i < docs.length; i += 2) {
    pairs.push({ frente: docs[i], reverso: docs[i + 1] ?? null })
  }
  return pairs
}

export function MultiUploadRow({
  applicationId,
  templateId,
  templateName,
  templateInstructions,
  initialDocs,
}: Props) {
  const [pairs, setPairs] = useState<DocPair[]>(() =>
    initialDocs.length > 0 ? buildPairs(initialDocs) : []
  )
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [activeDocId, setActiveDocId] = useState<string | null>(null)

  function openPicker(docId: string | null, pairIdx?: number) {
    // If docId is null this is a reverso placeholder — use sentinel "new-reverso:N"
    setActiveDocId(docId ?? `new-reverso:${pairIdx ?? 0}`)
    inputRef.current?.click()
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !activeDocId) return
    setError(null)
    e.target.value = ""
    const docId = activeDocId
    startTransition(async () => {
      // If docId is the sentinel "new-reverso:N", create the DB record first
      if (docId.startsWith("new-reverso:")) {
        const pairIdx = parseInt(docId.split(":")[1], 10)
        const created = await addExtraDocument(applicationId, templateId)
        if (created?.error || !created?.documentId) {
          setError(created?.error ?? "No se pudo crear el slot")
          return
        }
        // Replace the placeholder id with the real one before uploading
        const realId = created.documentId
        setPairs((prev) =>
          prev.map((p, i) =>
            i === pairIdx && p.reverso
              ? { ...p, reverso: { ...p.reverso, id: realId } }
              : p
          )
        )
        const result = await uploadDocumentFile(realId, file)
        if (!result.success) {
          setError(result.error ?? "Error al subir el archivo")
        } else {
          setPairs((prev) =>
            prev.map((p, i) =>
              i === pairIdx && p.reverso
                ? { ...p, reverso: { ...p.reverso, id: realId, status: "pending_review", fileName: file.name } }
                : p
            )
          )
        }
        return
      }

      const result = await uploadDocumentFile(docId, file)
      if (!result.success) {
        setError(result.error ?? "Error al subir el archivo")
      } else {
        setPairs((prev) =>
          prev.map((p) => {
            if (p.frente.id === docId)
              return { ...p, frente: { ...p.frente, status: "pending_review", fileName: file.name } }
            if (p.reverso?.id === docId)
              return { ...p, reverso: { ...p.reverso, status: "pending_review", fileName: file.name } }
            return p
          })
        )
      }
    })
  }

  function handleAddReverso(pairIdx: number) {
    // Add a UI placeholder; DB record created only on actual file pick
    setPairs((prev) =>
      prev.map((p, i) =>
        i === pairIdx ? { ...p, reverso: { id: null, status: "pending_upload", fileName: null } } : p
      )
    )
  }

  async function handleAddPerson() {
    startTransition(async () => {
      const result = await addExtraDocument(applicationId, templateId)
      if (result?.error) {
        setError(result.error)
      } else if (result?.documentId) {
        const newDoc: DocItem = { id: result.documentId, status: "pending_upload", fileName: null }
        setPairs((prev) => [...prev, { frente: newDoc, reverso: null }])
      }
    })
  }

  // Exclude null-id reverso placeholders (not yet in DB) from the counter
  const allDocs = pairs.flatMap((p) => {
    const docs = [p.frente]
    if (p.reverso?.id) docs.push(p.reverso)
    return docs
  })
  const uploadedCount = allDocs.filter((d) => d.status !== "pending_upload").length
  const showPersonLabel = pairs.length > 1

  return (
    <div style={{ background: "#fff", border: "1px solid #E4ECE7", borderRadius: 10, padding: "12px 14px" }}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
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
          {uploadedCount}/{allDocs.length} subidos
        </span>
      </div>

      {/* Person pairs */}
      <div className="space-y-3 mb-3">
        {pairs.map((pair, pairIdx) => (
          <div
            key={pair.frente.id}
            style={{ background: "#F8FAF9", border: "1px solid #E4ECE7", borderRadius: 10, padding: "8px 12px" }}
          >
            {showPersonLabel && (
              <p className="text-[11px] font-bold mb-2" style={{ color: "#5B7168" }}>
                Persona {pairIdx + 1}
              </p>
            )}

            {/* Frente slot */}
            <SlotRow
              doc={pair.frente}
              label={pair.reverso !== null ? "Frente" : "Frente / Único"}
              isPending={isPending}
              onUpload={(id) => openPicker(id, pairIdx)}
            />

            {/* Reverso slot or add button */}
            {pair.reverso ? (
              <div style={{ marginTop: 6 }}>
                <SlotRow
                  doc={pair.reverso}
                  label="Reverso"
                  isPending={isPending}
                  onUpload={(id) => openPicker(id, pairIdx)}
                />
              </div>
            ) : (
              <button
                type="button"
                disabled={isPending}
                onClick={() => handleAddReverso(pairIdx)}
                style={{ marginTop: 8, fontSize: 11, fontWeight: 600, color: "#1f7a4d", background: "none", border: "none", padding: 0, cursor: "pointer" }}
              >
                + Agregar reverso (INE)
              </button>
            )}
          </div>
        ))}
      </div>

      {error && <p className="text-xs text-destructive mb-3">{error}</p>}

      <button
        type="button"
        disabled={isPending}
        onClick={handleAddPerson}
        className="text-xs font-medium transition-colors"
        style={{ color: "#1f7a4d" }}
      >
        + Agregar otra persona
      </button>

      <input ref={inputRef} type="file" accept="*" className="hidden" onChange={handleFileChange} />
    </div>
  )
}

function SlotRow({
  doc,
  label,
  isPending,
  onUpload,
}: {
  doc: DocItem
  label: string
  isPending: boolean
  onUpload: (id: string | null) => void
}) {
  const cfg = STATUS_CONFIG[doc.status] ?? STATUS_CONFIG.pending_upload
  return (
    <div className="flex items-center gap-2">
      <span
        className="text-[10px] font-semibold shrink-0"
        style={{ color: "#8A9E94", minWidth: 72 }}
      >
        {label}
      </span>
      <span
        className="inline-flex items-center gap-1 rounded-full text-[11px] font-semibold shrink-0"
        style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, padding: "2px 8px" }}
      >
        <span className="w-1 h-1 rounded-full" style={{ background: cfg.dot }} />
        {cfg.label}
      </span>
      {doc.fileName && (
        <span className="text-xs truncate flex-1" style={{ color: "#5B7168" }}>
          {doc.fileName}
        </span>
      )}
      <Button
        size="sm"
        variant={doc.status === "pending_upload" ? "default" : "outline"}
        disabled={isPending}
        className="shrink-0"
        onClick={() => onUpload(doc.id)}
      >
        {doc.status === "pending_upload" ? "Subir" : "Reemplazar"}
      </Button>
    </div>
  )
}
