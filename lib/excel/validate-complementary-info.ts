import * as XLSX from "xlsx"
import { TEMPLATE_LABELS, REQUIRED_ROWS, CONDITIONAL_ROWS } from "@/lib/validations/complementary-info-v2"

export interface ValidationResult {
  valid: boolean
  structureErrors: string[]
  fieldErrors: string[]
}

export function validateComplementaryInfoXlsx(buffer: Buffer): ValidationResult {
  let wb: XLSX.WorkBook
  try {
    wb = XLSX.read(buffer, { type: "buffer" })
  } catch {
    return { valid: false, structureErrors: ["El archivo no es un .xlsx válido."], fieldErrors: [] }
  }

  const ws = wb.Sheets[wb.SheetNames[0]]
  if (!ws) {
    return { valid: false, structureErrors: ["El archivo no contiene hojas."], fieldErrors: [] }
  }

  // Validate column A labels
  const structureErrors: string[] = []
  for (const [rowStr, expected] of Object.entries(TEMPLATE_LABELS)) {
    const row = Number(rowStr)
    const addr = XLSX.utils.encode_cell({ r: row - 1, c: 0 })
    const actual = ws[addr]?.v?.toString().trim() ?? ""
    if (actual !== expected.trim()) {
      structureErrors.push(`Fila ${row}: esperado "${expected}", encontrado "${actual || "(vacío)"}"`)
    }
  }

  if (structureErrors.length > 0) {
    return {
      valid: false,
      structureErrors: [
        "El archivo no coincide con la plantilla oficial. Descarga la plantilla y vuelve a intentarlo.",
        ...structureErrors.slice(0, 5),
      ],
      fieldErrors: [],
    }
  }

  // Read column B values
  const colB: Record<number, string> = {}
  for (let r = 1; r <= 45; r++) {
    const addr = XLSX.utils.encode_cell({ r: r - 1, c: 1 })
    colB[r] = wb.Sheets[wb.SheetNames[0]][addr]?.v?.toString().trim() ?? ""
  }

  // Check required fields
  const fieldErrors: string[] = []
  for (const row of REQUIRED_ROWS) {
    if (!colB[row]) fieldErrors.push(`"${TEMPLATE_LABELS[row]}" (fila ${row}) está vacío`)
  }

  // Check conditionals
  for (const [rowStr, { dependsOn, whenValue }] of Object.entries(CONDITIONAL_ROWS)) {
    const row = Number(rowStr)
    if (colB[dependsOn] === whenValue && !colB[row]) {
      fieldErrors.push(`"${TEMPLATE_LABELS[row]}" (fila ${row}) es requerido cuando la respuesta es "Sí"`)
    }
  }

  return { valid: fieldErrors.length === 0, structureErrors: [], fieldErrors }
}
