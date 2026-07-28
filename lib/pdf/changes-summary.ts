// PDF con el historial de cambios solicitados de un expediente.
import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFFont } from "pdf-lib"

export interface ChangeItem {
  documentName: string
  isGeneral: boolean
  notes: string
  status: string | null
  author: string
  createdAt: string
}

export interface ChangesPdfInput {
  companyName: string
  productName: string
  items: ChangeItem[]
  exportDate: string
}

const DEEP = rgb(0, 0.259, 0.22)
const MINT = rgb(0.659, 0.973, 0.596)
const INK = rgb(0.043, 0.169, 0.133)
const GRAY = rgb(0.42, 0.5, 0.47)
const LINE = rgb(0.894, 0.925, 0.906)
const AMBER = rgb(0.573, 0.255, 0.055)
const BLUE = rgb(0.114, 0.306, 0.847)
const OK = rgb(0.016, 0.471, 0.341)

const STATUS_LABEL: Record<string, string> = {
  changes_requested: "Pendiente de corregir",
  rejected: "Rechazado",
  pending_review: "Corregido, en revision",
  approved: "Resuelto",
  pending_upload: "Esperando al cliente",
}

// pdf-lib usa WinAnsi: se reemplazan los caracteres fuera de ese rango
function clamp(text: string): string {
  return text
    .replace(/—/g, "-")
    .replace(/–/g, "-")
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'")
    .replace(/…/g, "...")
    .replace(/[^\x00-\xFF]/g, "?")
}

function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const out: string[] = []
  for (const rawLine of clamp(text).split("\n")) {
    if (!rawLine.trim()) {
      out.push("")
      continue
    }
    let line = ""
    for (const word of rawLine.split(/\s+/)) {
      const candidate = line ? `${line} ${word}` : word
      if (font.widthOfTextAtSize(candidate, size) > maxWidth && line) {
        out.push(line)
        line = word
      } else {
        line = candidate
      }
    }
    if (line) out.push(line)
  }
  return out
}

export async function generateChangesPdf(input: ChangesPdfInput): Promise<Uint8Array> {
  const pdf = await PDFDocument.create()
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)

  const W = 595.28
  const H = 841.89
  const M = 48
  const contentW = W - M * 2

  let page: PDFPage = pdf.addPage([W, H])
  let y = H

  const header = (first: boolean) => {
    page.drawRectangle({ x: 0, y: H - 64, width: W, height: 64, color: DEEP })
    page.drawText("Payefy", { x: M, y: H - 36, size: 18, font: bold, color: MINT })
    page.drawText("Cambios solicitados - Expediente KYC", {
      x: M, y: H - 52, size: 9, font, color: rgb(0.8, 0.95, 0.85),
    })
    y = H - 64 - (first ? 28 : 24)
  }

  const newPage = () => {
    page = pdf.addPage([W, H])
    header(false)
  }

  const need = (space: number) => {
    if (y - space < 56) newPage()
  }

  header(true)

  // Encabezado del expediente
  page.drawText(clamp(input.companyName), { x: M, y, size: 15, font: bold, color: INK })
  y -= 16
  const sub = [input.productName, `Exportado: ${input.exportDate}`].filter(Boolean).join("  -  ")
  page.drawText(clamp(sub), { x: M, y, size: 9.5, font, color: GRAY })
  y -= 12

  const pendientes = input.items.filter(
    (i) => i.status === "changes_requested" || i.status === "rejected"
  ).length
  page.drawText(
    clamp(
      `${input.items.length} observacion(es) en total` +
        (pendientes ? `  -  ${pendientes} sin corregir` : "")
    ),
    { x: M, y, size: 9.5, font: bold, color: pendientes ? AMBER : OK }
  )
  y -= 18

  page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 1, color: LINE })
  y -= 22

  // Observaciones
  for (const item of input.items) {
    const noteLines = wrap(item.notes, font, 10, contentW - 24)
    const blockHeight = 40 + noteLines.length * 13 + 16
    need(blockHeight)

    const stripe = item.isGeneral ? BLUE : item.status === "rejected" ? rgb(0.72, 0.11, 0.11) : AMBER

    page.drawRectangle({
      x: M, y: y - blockHeight + 14, width: contentW, height: blockHeight,
      color: rgb(0.988, 0.992, 0.99), borderColor: LINE, borderWidth: 1,
    })
    page.drawRectangle({
      x: M, y: y - blockHeight + 14, width: 3.5, height: blockHeight, color: stripe,
    })

    let ty = y
    page.drawText(clamp(item.documentName), {
      x: M + 14, y: ty, size: 11.5, font: bold, color: INK,
    })

    const badge = item.isGeneral
      ? "Comentario general"
      : (STATUS_LABEL[item.status ?? ""] ?? "Pendiente")
    const badgeW = font.widthOfTextAtSize(clamp(badge), 8.5)
    page.drawText(clamp(badge), {
      x: W - M - 14 - badgeW, y: ty, size: 8.5, font: bold, color: stripe,
    })
    ty -= 15

    for (const line of noteLines) {
      page.drawText(line, { x: M + 14, y: ty, size: 10, font, color: rgb(0.24, 0.31, 0.29) })
      ty -= 13
    }

    ty -= 4
    const when = new Date(item.createdAt).toLocaleDateString("es-MX", {
      day: "numeric", month: "long", year: "numeric",
    })
    page.drawText(clamp(`${item.author}  -  ${when}`), {
      x: M + 14, y: ty, size: 8.5, font, color: GRAY,
    })

    y -= blockHeight + 10
  }

  // Pie en todas las páginas
  const pages = pdf.getPages()
  pages.forEach((p, i) => {
    p.drawText(clamp(`Documento generado por Payefy KYC - Uso interno`), {
      x: M, y: 32, size: 8, font, color: GRAY,
    })
    const label = `${i + 1} / ${pages.length}`
    p.drawText(label, {
      x: W - M - font.widthOfTextAtSize(label, 8), y: 32, size: 8, font, color: GRAY,
    })
  })

  return pdf.save()
}
