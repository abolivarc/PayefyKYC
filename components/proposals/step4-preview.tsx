"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { Download, Save, ChevronLeft } from "lucide-react"
import { ProposalData } from "@/lib/proposals/types"
import { ProposalDocument } from "./pdf/proposal-document"
import { saveLead } from "@/app/(admin)/admin/proposals/actions"

export function Step4Preview({
  data,
  onBack,
}: {
  data: Partial<ProposalData>
  onBack: () => void
}) {
  const router = useRouter()
  const [generatingPdf, setGeneratingPdf] = useState(false)
  const [saving, setSaving] = useState(false)
  const [leadId, setLeadId] = useState<string | undefined>()
  const [feedback, setFeedback] = useState<{ type: "ok" | "err"; msg: string } | null>(null)

  // Guarda el lead (crea la primera vez, actualiza después)
  const persistLead = async (): Promise<boolean> => {
    const res = await saveLead(data, leadId)
    if (res.error) {
      setFeedback({ type: "err", msg: `No se pudo guardar el lead: ${res.error}` })
      return false
    }
    setLeadId(res.leadId)
    return true
  }

  const handleGeneratePDF = async () => {
    setGeneratingPdf(true)
    setFeedback(null)
    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import("html2canvas-pro"),
        import("jspdf"),
      ])

      const pages = document.querySelectorAll<HTMLElement>(".proposal-pdf-page")
      if (pages.length === 0) throw new Error("Documento no encontrado")

      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
      const a4Width = 210
      const a4Height = 297

      for (let i = 0; i < pages.length; i++) {
        const canvas = await html2canvas(pages[i], {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: "#ffffff",
        })
        if (i > 0) pdf.addPage()
        const imgHeight = (canvas.height * a4Width) / canvas.width
        // JPEG comprimido: misma calidad visual, ~10x menos peso que PNG
        pdf.addImage(
          canvas.toDataURL("image/jpeg", 0.88),
          "JPEG",
          0,
          0,
          a4Width,
          Math.min(imgHeight, a4Height)
        )
      }

      const fileName = `Propuesta_${(data.businessName || "cliente").replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`
      pdf.save(fileName)

      // El lead se guarda automáticamente al generar el PDF
      const saved = await persistLead()
      setFeedback({
        type: "ok",
        msg: saved
          ? "PDF descargado y lead guardado en el pipeline."
          : "PDF descargado (pero el lead no se pudo guardar).",
      })
    } catch (error) {
      console.error("Error generando PDF:", error)
      setFeedback({ type: "err", msg: "Error al generar el PDF" })
    } finally {
      setGeneratingPdf(false)
    }
  }

  const handleSaveLead = async () => {
    setSaving(true)
    setFeedback(null)
    const ok = await persistLead()
    if (ok) {
      setFeedback({ type: "ok", msg: "Lead guardado. Lo encuentras en Propuestas." })
      router.refresh()
    }
    setSaving(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-semibold">Vista Previa</h2>
          <p className="text-muted-foreground text-sm">
            Revisa la propuesta antes de descargar. Al descargar, el lead se guarda
            automáticamente.
          </p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <Button variant="outline" onClick={onBack}>
            <ChevronLeft className="mr-1 h-4 w-4" />
            Editar
          </Button>
          <Button variant="outline" onClick={handleSaveLead} disabled={saving}>
            {saving ? <Spinner size={14} /> : <Save className="mr-1 h-4 w-4" />}
            {leadId ? "Actualizar lead" : "Guardar lead"}
          </Button>
          <Button
            onClick={handleGeneratePDF}
            disabled={generatingPdf}
            style={{ background: "#004238", color: "#AEFF99" }}
          >
            {generatingPdf ? (
              <Spinner size={14} />
            ) : (
              <Download className="mr-1 h-4 w-4" />
            )}
            {generatingPdf ? "Generando…" : "Descargar PDF"}
          </Button>
        </div>
      </div>

      {feedback && (
        <p
          className={`text-sm ${feedback.type === "ok" ? "text-emerald-700" : "text-destructive"}`}
          role="alert"
        >
          {feedback.type === "ok" ? "✓ " : ""}
          {feedback.msg}
        </p>
      )}

      {/* Vista previa del documento */}
      <div className="border rounded-lg overflow-hidden bg-gray-100">
        <div className="max-h-[70vh] overflow-auto p-4">
          <div className="space-y-4 [&_.proposal-pdf-page]:shadow-md">
            <ProposalDocument data={data} />
          </div>
        </div>
      </div>
    </div>
  )
}
