/**
 * Comercios de giro médico: la tasa preferencial depende de que el SAT
 * reconozca la actividad médica de la persona. Si la Constancia de Situación
 * Fiscal declara otra actividad (el establecimiento en lugar del profesional),
 * el giro no califica — por eso el aviso aparece justo donde sube la CSF.
 */

/** Constancias de situación fiscal en terminales (PM, PF y representante legal) */
export const CSF_CODES = [
  "tax_situation_certificate",
  "pf_tax_situation",
  "legal_rep_tax_situation",
]

export const HEALTHCARE_CSF_NOTICE =
  "Para darte la tasa preferencial, tu actividad económica ante el SAT debe ser la del profesional de la salud (por ejemplo «Consultorios de medicina general»), no la de un establecimiento. Si tu constancia dice otra cosa, actualízala en el SAT antes de subirla."

/** ¿Este casillero debe mostrar el aviso de actividad económica? */
export function showsHealthcareNotice(
  templateCode: string,
  isHealthcare: boolean | null | undefined
): boolean {
  return !!isHealthcare && CSF_CODES.includes(templateCode)
}
