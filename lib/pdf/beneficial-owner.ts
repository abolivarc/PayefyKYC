import { PDFDocument, rgb, StandardFonts } from "pdf-lib"
import type { BeneficialOwnerValues } from "@/lib/validations/beneficial-owner"

export async function generateBeneficialOwnerPdf(
  data: BeneficialOwnerValues
): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const page = doc.addPage([595, 842]) // A4
  const { width, height } = page.getSize()

  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold)
  const fontRegular = await doc.embedFont(StandardFonts.Helvetica)
  const primaryColor = rgb(0.063, 0.584, 0.322)
  const black = rgb(0, 0, 0)
  const gray = rgb(0.5, 0.5, 0.5)

  let y = height - 60

  const writeLine = (
    text: string,
    opts: {
      font?: typeof fontBold
      size?: number
      color?: ReturnType<typeof rgb>
      indent?: number
    } = {}
  ) => {
    const font = opts.font ?? fontRegular
    const size = opts.size ?? 10
    const color = opts.color ?? black
    const indent = opts.indent ?? 50
    page.drawText(text, {
      x: indent,
      y,
      font,
      size,
      color,
      maxWidth: width - indent * 2,
    })
    y -= size + 6
  }

  const writeSection = (title: string) => {
    y -= 8
    page.drawRectangle({
      x: 50,
      y: y - 2,
      width: width - 100,
      height: 18,
      color: rgb(0.93, 0.97, 0.94),
    })
    writeLine(title, { font: fontBold, size: 11, color: primaryColor })
    y -= 4
  }

  const writeField = (label: string, value: string) => {
    writeLine(`${label}:`, { font: fontBold, size: 9, color: gray })
    y += 4
    writeLine(`   ${value || "—"}`, { font: fontRegular, size: 10 })
    y -= 2
  }

  // Encabezado
  writeLine("CONSTANCIA DE BENEFICIARIO CONTROLADOR", {
    font: fontBold,
    size: 14,
    color: primaryColor,
  })
  writeLine(
    "Declaración en términos del Art. 32-B Ter del CFF",
    { font: fontRegular, size: 9, color: gray }
  )
  y -= 10
  page.drawLine({
    start: { x: 50, y },
    end: { x: width - 50, y },
    thickness: 1,
    color: primaryColor,
  })
  y -= 16

  writeSection("I. DATOS DE LA PERSONA MORAL")
  writeField("Denominación social", data.company_legal_name)
  writeField("RFC", data.company_tax_id)
  writeField("Domicilio fiscal", data.company_address)

  writeSection("II. BENEFICIARIO CONTROLADOR")
  if (data.has_beneficial_owner) {
    writeField("Nombre completo", data.owner_full_name ?? "")
    writeField("RFC", data.owner_rfc ?? "")
    writeField("CURP", data.owner_curp ?? "")
    writeField("País de residencia", data.owner_country ?? "")
    writeField(
      "Porcentaje de control",
      `${data.owner_control_percentage ?? ""}%`
    )
    writeField(
      "Tipo de control",
      data.owner_control_type === "direct" ? "Directo" : "Indirecto"
    )
  } else {
    writeLine(
      "La empresa DECLARA que NO cuenta con beneficiario controlador identificable,",
      { font: fontRegular, size: 10 }
    )
    writeLine(
      "de conformidad con el artículo 32-B Ter del Código Fiscal de la Federación.",
      { font: fontRegular, size: 10 }
    )
  }

  writeSection("III. DECLARACIÓN DEL REPRESENTANTE LEGAL")
  y -= 4
  const declarationText =
    `Bajo protesta de decir verdad, el suscrito en mi carácter de representante legal ` +
    `de ${data.company_legal_name}, manifiesto que la información contenida en este ` +
    `documento es verídica y me hago responsable de cualquier omisión o falsedad en ` +
    `la misma, en términos de las disposiciones legales aplicables.`
  page.drawText(declarationText, {
    x: 50,
    y,
    font: fontRegular,
    size: 9,
    color: black,
    maxWidth: width - 100,
    lineHeight: 14,
  })
  y -= 56

  y -= 20
  writeField("Nombre del representante legal", data.signer_full_name)
  writeField("Cargo", data.signer_position ?? "")
  writeField("Lugar", data.signing_place ?? "")
  writeField("Fecha", data.signing_date)

  y -= 20
  page.drawLine({
    start: { x: 50, y },
    end: { x: 250, y },
    thickness: 0.5,
    color: black,
  })
  y -= 12
  writeLine("Firma del representante legal", {
    font: fontRegular,
    size: 8,
    color: gray,
  })

  page.drawText(
    "Este documento debe ser impreso, firmado a mano y adjuntado como PDF escaneado.",
    { x: 50, y: 30, font: fontRegular, size: 7, color: gray }
  )

  return doc.save()
}
