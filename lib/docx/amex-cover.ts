// Carátula de afiliación AMEX.
//
// American Express exige que el formato quede idéntico, así que NO se
// reconstruye el documento: se abre la plantilla original y se sustituye
// únicamente el texto dentro de los nodos <w:t> existentes. La estructura
// (tablas, bordes, fuentes, saltos) queda intacta byte a byte.
import JSZip from "jszip"

/** Los 59 campos [*] de la plantilla, en el orden en que aparecen. */
export interface AmexCoverData {
  // Datos generales (1-5)
  razonSocial: string
  nombreComercial: string
  rfc: string
  objetoSocial: string
  giroComercial: string
  // Domicilio fiscal (6-12)
  fiscalCalle: string
  fiscalColonia: string
  fiscalMunicipio: string
  fiscalCp: string
  fiscalEstado: string
  fiscalPais: string
  fiscalCiudad: string
  // Domicilio del establecimiento (13-21)
  estCalle: string
  estColonia: string
  estMunicipio: string
  estCp: string
  estEstado: string
  estPais: string
  estCiudad: string
  estTelefono: string
  estCorreo: string
  // Existencia legal (22-29)
  escrituraNumero: string
  fechaConstitucion: string
  notariaNumero: string
  notariaEstado: string
  folioRppc: string
  fechaRppc: string
  fedatarioNombre: string
  paisNacionalidadEmpresa: string
  // Representante legal (30-45)
  repNombre: string
  repIdTipo: string
  repIdAutoridad: string
  repIdNumero: string
  repFechaNacimiento: string
  repPaisNacimiento: string
  repPaisNacionalidad: string
  repRfc: string
  repCurp: string
  poderEscritura: string
  poderFecha: string
  poderFedatarioNumero: string
  poderLocalidad: string
  poderFedatarioNombre: string
  poderFolioRppc: string
  poderFechaRppc: string
  // Domicilio del representante legal (46-54)
  repCalle: string
  repColonia: string
  repMunicipio: string
  repCp: string
  repEstado: string
  repPais: string
  repCiudad: string
  repTelefono: string
  repCorreo: string
  // Firma (55)
  fechaFirma: string
}

/** Condiciones comerciales — las captura Payefy, no el comercio. */
export interface AmexConditions {
  tasaDescuento?: string | null
  mesesSinIntereses?: string | null
  clabe?: string | null
  terminales?: string | null
  terminalesRenta?: string | null
  /** card_present | ecommerce | both — marca las casillas de modalidad */
  modalidad?: string | null
  sitioWeb?: string | null
  facturacionTicket?: string | null
}

// Bloque de firmas: va a nombre de Payefy (el preámbulo de la plantilla
// menciona a Broxel como agregador, pero quien firma es Payefy).
const AGREGADOR = "PAYEFY"
const AGREGADOR_REP = "ELIZABETH LOPEZ"

const XML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&apos;",
}
const esc = (v: string) => v.replace(/[&<>"']/g, (c) => XML_ESCAPES[c])

/** Valores en el orden exacto de los 59 marcadores de la plantilla. */
function orderedValues(d: AmexCoverData): string[] {
  return [
    d.razonSocial, d.nombreComercial, d.rfc, d.objetoSocial, d.giroComercial,
    d.fiscalCalle, d.fiscalColonia, d.fiscalMunicipio, d.fiscalCp, d.fiscalEstado, d.fiscalPais, d.fiscalCiudad,
    d.estCalle, d.estColonia, d.estMunicipio, d.estCp, d.estEstado, d.estPais, d.estCiudad,
    d.estTelefono, d.estCorreo,
    d.escrituraNumero, d.fechaConstitucion, d.notariaNumero, d.notariaEstado,
    d.folioRppc, d.fechaRppc, d.fedatarioNombre, d.paisNacionalidadEmpresa,
    d.repNombre, d.repIdTipo, d.repIdAutoridad, d.repIdNumero,
    d.repFechaNacimiento, d.repPaisNacimiento, d.repPaisNacionalidad,
    d.repRfc, d.repCurp,
    d.poderEscritura, d.poderFecha, d.poderFedatarioNumero, d.poderLocalidad,
    d.poderFedatarioNombre, d.poderFolioRppc, d.poderFechaRppc,
    d.repCalle, d.repColonia, d.repMunicipio, d.repCp, d.repEstado, d.repPais, d.repCiudad,
    d.repTelefono, d.repCorreo,
    d.fechaFirma,
    // Bloque de firmas: agregador fijo, comercio derivado de los datos
    AGREGADOR, AGREGADOR_REP, d.razonSocial, d.repNombre,
  ]
}

export const AMEX_FIELD_COUNT = 59

/**
 * Rellena la plantilla. Devuelve el .docx listo para descargar.
 * @param templateBuffer contenido de public/templates/caratula_amex.docx
 */
export async function generateAmexCoverDocx(
  templateBuffer: Buffer | ArrayBuffer,
  data: AmexCoverData,
  conditions: AmexConditions = {}
): Promise<Uint8Array> {
  const zip = await JSZip.loadAsync(templateBuffer)
  const docFile = zip.file("word/document.xml")
  if (!docFile) throw new Error("Plantilla AMEX inválida: falta word/document.xml")

  let xml = await docFile.async("string")
  const values = orderedValues(data)

  // 1) Sustituir los [*] en orden, solo dentro de nodos de texto
  let i = 0
  xml = xml.replace(/(<w:t\b[^>]*>)([\s\S]*?)(<\/w:t>)/g, (_m, open, inner, close) => {
    const filled = inner.replace(/\[\*\]/g, () => {
      const v = values[i] ?? ""
      i += 1
      return esc(v.trim())
    })
    return open + filled + close
  })

  if (i !== AMEX_FIELD_COUNT) {
    throw new Error(
      `La plantilla AMEX cambió: se esperaban ${AMEX_FIELD_COUNT} campos y se encontraron ${i}`
    )
  }

  // 2) Condiciones comerciales (no usan [*], son casillas de la plantilla)
  xml = fillConditions(xml, conditions)

  // createFolders:false evita que JSZip agregue una entrada "word/" que la
  // plantilla original no tiene: el .docx queda con las mismas 12 entradas.
  zip.file("word/document.xml", xml, { createFolders: false })
  return zip.generateAsync({ type: "uint8array" })
}

/** Rellena las casillas de "Condiciones de pago y cuenta" sin tocar el resto. */
function fillConditions(xml: string, c: AmexConditions): string {
  const inText = (fn: (t: string) => string) =>
    (x: string) =>
      x.replace(/(<w:t\b[^>]*>)([\s\S]*?)(<\/w:t>)/g, (_m, open, inner, close) =>
        open + fn(inner) + close
      )

  let out = xml

  // Tasa de descuento: el "%" va precedido del valor
  if (c.tasaDescuento) {
    const tasa = esc(String(c.tasaDescuento).trim())
    out = inText((t) => t.replace(/(^|\s)%/, `$1${tasa} %`))(out)
  }

  // Meses sin intereses y número de terminales: casillas |____|
  const boxes: (string | null | undefined)[] = [
    c.mesesSinIntereses,
    c.terminales,
    c.terminalesRenta,
  ]
  let boxIdx = 0
  out = inText((t) =>
    t.replace(/\|_{3,}\|/g, (m) => {
      const v = boxes[boxIdx]
      boxIdx += 1
      return v ? `| ${esc(String(v).trim())} |` : m
    })
  )(out)

  // Modalidad: las tres casillas [_] son, en orden,
  // Presencial-No, Presencial-Sí y E-commerce-No.
  // Word puede partir una casilla entre dos runs ("[_" y "]"), así que el
  // patrón tolera etiquetas intermedias y solo cambia el guion bajo por X:
  // las etiquetas se conservan tal cual.
  if (c.modalidad) {
    const presencial = c.modalidad === "card_present" || c.modalidad === "both"
    const ecommerce =
      c.modalidad === "ecommerce" ||
      c.modalidad === "link_de_pago" ||
      c.modalidad === "both"
    const marks = [!presencial, presencial, !ecommerce]
    let m = 0
    out = out.replace(/\[_((?:<[^>]*>)*)\]/g, (orig, tags: string) => {
      const mark = marks[m]
      m += 1
      return mark ? `[X${tags}]` : orig
    })
  }

  // Sitio web y facturación: campos [____] largos, en ese orden
  const longFields = [c.facturacionTicket, c.sitioWeb]
  let lf = 0
  out = inText((t) =>
    t.replace(/\[_{6,}\]/g, (orig) => {
      const v = longFields[lf]
      lf += 1
      return v ? `[ ${esc(String(v).trim())} ]` : orig
    })
  )(out)

  // CLABE: 18 recuadros |__| consecutivos, un dígito cada uno
  if (c.clabe) {
    const digits = String(c.clabe).replace(/\D/g, "")
    if (digits.length === 18) {
      let d = 0
      out = inText((t) =>
        t.replace(/\|__\|/g, (m) => (d < 18 ? `|${digits[d++]}|` : m))
      )(out)
    }
  }

  return out
}
