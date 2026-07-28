import { PDFDocument, rgb, StandardFonts } from "pdf-lib"

export type DataField = {
  label: string
  value: string | null
  status: string
}

export type DataPdfInput = {
  companyName: string
  taxId: string | null
  personType: string | null
  productName: string | null
  terminalType?: string | null // card_present | ecommerce | both
  applicationId: string
  exportDate: string
  fields: DataField[]
}

export const TERMINAL_TYPE_LABELS: Record<string, string> = {
  card_present: "Tarjeta Presente (POS fisica)",
  ecommerce: "E-commerce / Link de pago",
  both: "Tarjeta Presente + E-commerce",
}

const GREEN_DARK = rgb(0, 0.259, 0.22)   // #004238
const GREEN_MID  = rgb(0.122, 0.475, 0.302) // #1f7a4d
const GREEN_LIGHT = rgb(0.659, 0.973, 0.596) // #A8F898
const GREY_TEXT  = rgb(0.357, 0.443, 0.408)  // #5B7168
const DARK_TEXT  = rgb(0.059, 0.165, 0.133)  // #0F2A22
const WHITE      = rgb(1, 1, 1)

function clampToWinAnsi(text: string): string {
  return text
    .replace(/—/g, "-")  // em dash
    .replace(/–/g, "-")  // en dash
    .replace(/“|”/g, '"')
    .replace(/‘|’/g, "'")
    .replace(/[^\x00-\xFF]/g, "?")
}

export async function generateDataPdf(input: DataPdfInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const fontRegular = await doc.embedFont(StandardFonts.Helvetica)
  const fontBold    = await doc.embedFont(StandardFonts.HelveticaBold)

  const pageWidth  = 595.28  // A4
  const pageHeight = 841.89
  const marginX    = 48
  const contentW   = pageWidth - marginX * 2

  let page = doc.addPage([pageWidth, pageHeight])
  let y = pageHeight - 40

  // ── Header band ──────────────────────────────────────────────────────────
  page.drawRectangle({ x: 0, y: pageHeight - 72, width: pageWidth, height: 72, color: GREEN_DARK })

  // Payefy wordmark
  page.drawText("Payefy", {
    x: marginX,
    y: pageHeight - 44,
    size: 22,
    font: fontBold,
    color: GREEN_LIGHT,
  })

  page.drawText("Datos solicitados · Expediente KYC", {
    x: marginX,
    y: pageHeight - 62,
    size: 9,
    font: fontRegular,
    color: rgb(0.8, 0.95, 0.85),
  })

  y = pageHeight - 72 - 24

  // ── Company info block ───────────────────────────────────────────────────
  const companyName = clampToWinAnsi(input.companyName)
  page.drawText(companyName, { x: marginX, y, size: 16, font: fontBold, color: DARK_TEXT })
  y -= 18

  const subtitleParts: string[] = []
  if (input.taxId)       subtitleParts.push(input.taxId)
  if (input.personType)  subtitleParts.push(input.personType === "persona_fisica" ? "Persona Fisica" : "Persona Moral")
  if (input.productName) subtitleParts.push(clampToWinAnsi(input.productName))

  if (subtitleParts.length > 0) {
    page.drawText(subtitleParts.join("  ·  "), { x: marginX, y, size: 10, font: fontRegular, color: GREY_TEXT })
    y -= 14
  }

  // Modalidad de la terminal — dato clave para el alta (POS / e-commerce / link)
  if (input.terminalType) {
    const label = TERMINAL_TYPE_LABELS[input.terminalType] ?? input.terminalType
    page.drawText(`Modalidad: ${clampToWinAnsi(label)}`, {
      x: marginX, y, size: 10, font: fontBold, color: GREEN_MID,
    })
    y -= 15
  }

  page.drawText(`ID: ${input.applicationId}  ·  Exportado: ${input.exportDate}`, {
    x: marginX, y, size: 8, font: fontRegular, color: GREY_TEXT,
  })
  y -= 20

  // Divider
  page.drawLine({ start: { x: marginX, y }, end: { x: pageWidth - marginX, y }, thickness: 1, color: rgb(0.89, 0.925, 0.906) })
  y -= 20

  // ── Fields ───────────────────────────────────────────────────────────────
  const rowHeight = 54
  const colW = (contentW - 16) / 2
  let col = 0
  let rowY = y

  for (const field of input.fields) {
    const x = marginX + col * (colW + 16)

    // Card background
    page.drawRectangle({
      x: x - 6, y: rowY - rowHeight + 8,
      width: colW + 12, height: rowHeight,
      color: rgb(0.953, 0.969, 0.957),
      borderColor: rgb(0.894, 0.925, 0.906),
      borderWidth: 1,
    })

    // Status stripe (left side)
    const stripeColor = field.status === "approved" ? GREEN_MID
      : field.status === "pending_review" ? rgb(0.114, 0.306, 0.847)
      : GREY_TEXT
    page.drawRectangle({ x: x - 6, y: rowY - rowHeight + 8, width: 3, height: rowHeight, color: stripeColor })

    // Status badge text
    const statusLabel = field.status === "approved"   ? "Validado"
      : field.status === "pending_review" ? "En revision"
      : "Pendiente"
    const statusColor = field.status === "approved"   ? GREEN_MID
      : field.status === "pending_review" ? rgb(0.114, 0.306, 0.847)
      : GREY_TEXT

    page.drawText(statusLabel, { x: x + 4, y: rowY - 12, size: 7, font: fontBold, color: statusColor })

    // Label
    const labelText = clampToWinAnsi(field.label)
    page.drawText(labelText, { x: x + 4, y: rowY - 25, size: 9, font: fontBold, color: DARK_TEXT })

    // Value
    const rawValue = field.value ?? "—"
    const valueText = clampToWinAnsi(rawValue)
    const maxChars = Math.floor((colW - 10) / 5.5)
    const truncated = valueText.length > maxChars ? valueText.slice(0, maxChars - 1) + "…" : valueText
    page.drawText(truncated, { x: x + 4, y: rowY - 38, size: 10, font: fontRegular, color: DARK_TEXT })

    col++
    if (col === 2) {
      col = 0
      rowY -= rowHeight + 8
    }

    // New page if running out of space
    if (rowY - rowHeight < 60 && input.fields.indexOf(field) < input.fields.length - 1) {
      page = doc.addPage([pageWidth, pageHeight])
      // Continuation header
      page.drawRectangle({ x: 0, y: pageHeight - 36, width: pageWidth, height: 36, color: GREEN_DARK })
      page.drawText("Payefy · Datos solicitados (cont.)", {
        x: marginX, y: pageHeight - 24, size: 9, font: fontBold, color: GREEN_LIGHT,
      })
      rowY = pageHeight - 60
      col = 0
    }
  }

  // ── Footer ───────────────────────────────────────────────────────────────
  const lastPage = doc.getPages()[doc.getPageCount() - 1]
  lastPage.drawLine({
    start: { x: marginX, y: 36 },
    end: { x: pageWidth - marginX, y: 36 },
    thickness: 0.5,
    color: rgb(0.894, 0.925, 0.906),
  })
  lastPage.drawText("Documento generado automaticamente por Payefy KYC. Uso interno.", {
    x: marginX, y: 22, size: 7, font: fontRegular, color: GREY_TEXT,
  })

  return doc.save()
}
