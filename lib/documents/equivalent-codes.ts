// Documentos que son el MISMO papel aunque cada producto los llame distinto.
//
// El expediente ya se comparte entre solicitudes de la misma empresa cuando el
// código coincide exacto (acta constitutiva, comprobante de domicilio…). Pero
// la Constancia de Situación Fiscal se llama `tax_situation_certificate` en
// terminales y `cif` en tarjetas: es el mismo PDF del SAT y el comercio lo
// tenía que subir dos veces.
//
// Cada grupo es una identidad: todos los códigos de un grupo son el mismo
// documento. Un código que no aparezca aquí es su propia identidad.
const GRUPOS: string[][] = [
  // Constancia / CIF de la empresa — mismo acuse del SAT
  ["tax_situation_certificate", "cif", "pf_tax_situation"],

  // Persona física: mismos documentos con prefijo pf_
  ["company_address_proof", "pf_address_proof"],
  ["contact_email", "pf_contact_email"],
  ["contact_phone", "pf_contact_phone"],
  ["legal_rep_id", "pf_official_id"],
  ["legal_reps_curp", "pf_curp"],
  ["legal_reps_rfc", "pf_rfc"],
  ["bank_statement", "pf_bank_statement"],
  ["business_photos", "pf_business_photos"],
  ["website_url", "pf_website_url"],
  ["operational_info", "pf_operational_info"],
]

// código → representante del grupo (el primero de la lista)
const CANONICO = new Map<string, string>()
for (const grupo of GRUPOS) {
  for (const code of grupo) CANONICO.set(code, grupo[0])
}

/** Identidad del documento. Dos códigos con la misma identidad son el mismo papel. */
export function canonicalCode(code: string): string {
  return CANONICO.get(code) ?? code
}

/** ¿Son el mismo documento, aunque se llamen distinto? */
export function sameDocument(a: string, b: string): boolean {
  return canonicalCode(a) === canonicalCode(b)
}

/**
 * Dado el código de un documento ya subido y los códigos que pide el producto
 * actual, devuelve bajo qué código debe mostrarse aquí — o null si este
 * producto no pide ese documento.
 */
export function codeForProduct(
  docCode: string,
  productCodes: Set<string>
): string | null {
  if (productCodes.has(docCode)) return docCode
  const canon = canonicalCode(docCode)
  for (const code of productCodes) {
    if (canonicalCode(code) === canon) return code
  }
  return null
}
