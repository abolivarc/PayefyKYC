// Genera el PDF "Datos operativos del comercio" que viaja en el ZIP del alta.
import { PDFDocument, StandardFonts, rgb } from "pdf-lib"

export interface OperationalInfoData {
  averageTicket: string
  monthlyTransactions: string
  maxTicket: string
  avgSalesAmount: string
  lastMonthSalesAmount: string
  lastMonthSalesOperations: string
  lastMonthChargebacks: string
  pctNational: string
  pctInternational: string
  operativa: string // "ecommerce" | "card_present" | "both"
  terminalsRequired: string
  contactEmail: string
  contactPhone: string
}

const OPERATIVA_LABELS: Record<string, string> = {
  ecommerce: "E-commerce",
  card_present: "Tarjeta Presente",
  both: "Ambas (Tarjeta Presente + E-commerce)",
}

const money = (v: string) => {
  const n = parseFloat(v)
  if (isNaN(n)) return v || "—"
  return "$" + n.toLocaleString("es-MX", { maximumFractionDigits: 2 })
}

export async function generateOperationalInfoPdf(
  legalName: string,
  data: OperationalInfoData
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create()
  const page = pdf.addPage([595, 842]) // A4 en puntos
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)

  const green = rgb(0, 0.26, 0.22) // #004238
  const gray = rgb(0.35, 0.42, 0.46)
  const line = rgb(0.89, 0.93, 0.91)

  // Encabezado
  page.drawRectangle({ x: 0, y: 792, width: 595, height: 50, color: green })
  page.drawText("PAYEFY — DATOS OPERATIVOS DEL COMERCIO", {
    x: 40, y: 812, size: 13, font: bold, color: rgb(0.68, 1, 0.6),
  })

  let y = 752
  page.drawText(legalName, { x: 40, y, size: 15, font: bold, color: green })
  y -= 16
  page.drawText(
    "Alta de Terminales (TPV) · Generado el " +
      new Date().toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" }),
    { x: 40, y, size: 9, font, color: gray }
  )
  y -= 30

  const rows: [string, string][] = [
    ["Ticket promedio", money(data.averageTicket)],
    ["Transacciones al mes", (data.monthlyTransactions || "—") + (data.monthlyTransactions ? " cobros" : "")],
    ["Venta mensual estimada", money(data.avgSalesAmount)],
    ["Ticket maximo a procesar", money(data.maxTicket)],
    ["Ventas del mes pasado", money(data.lastMonthSalesAmount)],
    ["Operaciones del mes pasado", (data.lastMonthSalesOperations || "—") + (data.lastMonthSalesOperations ? " cobros" : "")],
    ["Contracargos del mes pasado", money(data.lastMonthChargebacks)],
    ["% Nacional", (data.pctNational || "—") + (data.pctNational ? "%" : "")],
    ["% Internacional", (data.pctInternational || "—") + (data.pctInternational ? "%" : "")],
    ["Operativa", OPERATIVA_LABELS[data.operativa] ?? data.operativa ?? "—"],
    ...(data.operativa !== "ecommerce"
      ? ([["Terminales requeridas", data.terminalsRequired || "—"]] as [string, string][])
      : []),
    ["Correo de contacto", data.contactEmail || "—"],
    ["Teléfono de contacto", data.contactPhone || "—"],
  ]

  for (const [label, value] of rows) {
    page.drawLine({ start: { x: 40, y: y - 8 }, end: { x: 555, y: y - 8 }, thickness: 0.7, color: line })
    page.drawText(label, { x: 40, y, size: 10, font, color: gray })
    page.drawText(String(value), { x: 330, y, size: 10.5, font: bold, color: rgb(0.06, 0.11, 0.13) })
    y -= 30
  }

  y -= 10
  page.drawText(
    "Información declarada por el comercio en la plataforma PayefyKYC para el proceso de alta.",
    { x: 40, y, size: 8, font, color: gray }
  )

  return pdf.save()
}
