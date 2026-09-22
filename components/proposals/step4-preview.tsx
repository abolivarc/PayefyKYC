"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { Download, Save, ChevronLeft, Send } from "lucide-react"
import { ProposalData } from "@/lib/proposals/types"
import { ProposalDocument } from "./pdf/proposal-document"
import { saveLead } from "@/app/(admin)/admin/proposals/actions"
import { firstRateError } from "@/lib/proposals/rate-floors"
import { saveQuote, sendQuote } from "@/lib/proposals/quote-actions"

export function Step4Preview({
  data,
  onBack,
  applicationId,
  companyName,
  fromLeadId,
}: {
  data: Partial<ProposalData>
  onBack: () => void
  /** Cotización desde un expediente: cambia guardar-lead por guardar-en-KYC */
  applicationId?: string
  companyName?: string
  /** Propuesta del generador que se retomó: se marca ganada al guardar */
  fromLeadId?: string
}) {
  const router = useRouter()
  const [generatingPdf, setGeneratingPdf] = useState(false)
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)
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

  /**
   * El documento de la propuesta es JSX; no hay render server-side, así que
   * el PDF se rasteriza aquí y (si estamos cotizando un expediente) se sube.
   */
  const buildPdf = async () => {
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
      pdf.addImage(canvas.toDataURL("image/jpeg", 0.88), "JPEG", 0, 0, a4Width, Math.min(imgHeight, a4Height))
    }
    const fileName = `Propuesta_${(companyName || data.businessName || "cliente").replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`
    return { pdf, fileName }
  }

  // ── Cotización dentro del expediente ──────────────────────────────
  const guardarCotizacion = async (): Promise<boolean> => {
    if (!applicationId) return false
    const { pdf, fileName } = await buildPdf()
    const base64 = pdf.output("datauristring").split(",")[1]
    const res = await saveQuote({ applicationId, data, pdfBase64: base64, pdfFileName: fileName, fromLeadId })
    if (res.error) {
      setFeedback({ type: "err", msg: res.error })
      return false
    }
    return true
  }

  const handleSaveQuote = async () => {
    setSaving(true)
    setFeedback(null)
    try {
      if (await guardarCotizacion()) {
        setFeedback({ type: "ok", msg: "Cotización guardada en el expediente. Ya puedes enviarla al cliente." })
        router.refresh()
      }
    } catch (e) {
      setFeedback({ type: "err", msg: (e as Error).message })
    } finally {
      setSaving(false)
    }
  }

  const handleSendQuote = async () => {
    if (!applicationId) return
    if (!confirm("Se enviará la propuesta al correo del comercio, con el PDF adjunto. ¿Continuar?")) return
    setSending(true)
    setFeedback(null)
    try {
      // Siempre se guarda primero: así el PDF enviado es el que está en pantalla
      if (!(await guardarCotizacion())) return
      const res = await sendQuote(applicationId)
      if (res.error) setFeedback({ type: "err", msg: res.error })
      else {
        setFeedback({ type: "ok", msg: `Propuesta enviada a ${res.sentTo}.` })
        router.refresh()
      }
    } catch (e) {
      setFeedback({ type: "err", msg: (e as Error).message })
    } finally {
      setSending(false)
    }
  }

  const handleGeneratePDF = async () => {
    // Último candado del lado del cliente: aunque se haya llegado hasta aquí,
    // el documento no se emite si alguna tasa quedó por debajo del piso.
    const blocking = firstRateError(data)
    if (blocking) {
      setFeedback({ type: "err", msg: `${blocking}. Corrígela en el paso 3.` })
      return
    }
    setGeneratingPdf(true)
    setFeedback(null)
    try {
      const { pdf, fileName } = await buildPdf()
      pdf.save(fileName)

      if (applicationId) {
        setFeedback({ type: "ok", msg: "PDF descargado." })
      } else {
        // Fuera del KYC, el prospecto se guarda en el pipeline de leads
        const saved = await persistLead()
        setFeedback({
          type: "ok",
          msg: saved
            ? "PDF descargado y lead guardado en el pipeline."
            : "PDF descargado (pero el lead no se pudo guardar).",
        })
      }
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
            {applicationId
              ? "Revisa la propuesta, guárdala en el expediente y envíasela al comercio."
              : "Revisa la propuesta antes de descargar. Al descargar, el lead se guarda automáticamente."}
          </p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <Button variant="outline" onClick={onBack}>
            <ChevronLeft className="mr-1 h-4 w-4" />
            Editar
          </Button>
          {applicationId ? (
            <>
              <Button variant="outline" onClick={handleSaveQuote} disabled={saving || sending}>
                {saving ? <Spinner size={14} /> : <Save className="mr-1 h-4 w-4" />}
                Guardar en el expediente
              </Button>
              <Button
                onClick={handleSendQuote}
                disabled={saving || sending}
                style={{ background: "#004238", color: "#AEFF99" }}
              >
                {sending ? <Spinner size={14} /> : <Send className="mr-1 h-4 w-4" />}
                {sending ? "Enviando…" : "Enviar propuesta al cliente"}
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={handleSaveLead} disabled={saving}>
              {saving ? <Spinner size={14} /> : <Save className="mr-1 h-4 w-4" />}
              {leadId ? "Actualizar lead" : "Guardar lead"}
            </Button>
          )}
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
