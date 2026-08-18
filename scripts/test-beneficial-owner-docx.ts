#!/usr/bin/env tsx
/**
 * Genera un .docx de prueba de la Constancia de Beneficiario Controlador
 * con has_beneficial_owner=true y datos completos, para validar visualmente:
 *   1. Datos impresos sobre las líneas (subrayados)
 *   2. Negritas en título, encabezados, Sí/No, tipo ID, etiquetas de firma
 *   3. Nota al pie legal en pregunta 1
 *
 * Ejecutar: npx tsx scripts/test-beneficial-owner-docx.ts
 * Salida: /tmp/constancia_bc_test.docx
 */
import fs from "fs"
import path from "path"
import * as dotenv from "dotenv"

dotenv.config({ path: path.join(process.cwd(), ".env.local") })

// Import after env is set so process.cwd() resolves correctly
import { generateBeneficialOwnerDocx } from "../lib/docx/beneficial-owner"

const testData = {
  // Empresa
  company_legal_name:   "ATENCIÓN A LA SALUD PALACE S.A. DE C.V.",
  company_tax_id:       "ASP210819IC2",
  company_address:      "Blvd. Díaz Ordaz 123, Col. Centro, Guadalajara, Jalisco, C.P. 44100",

  // Beneficiario controlador — Sí
  has_beneficial_owner: true,

  // Datos generales
  owner_full_name:      "Carlos Eduardo Ramírez Herrera",
  owner_birth_date:     "1975-03-14",
  owner_birth_country:  "México",
  owner_nationality:    "Mexicana",
  owner_occupation:     "Director General",
  owner_address:        "Av. Insurgentes Sur 1602, Col. Crédito Constructor, CDMX, C.P. 03940",
  owner_phone:          "+52 55 1234 5678",
  owner_email:          "carlos.ramirez@palace.com",
  owner_curp:           "RAHC750314HJCMRR08",
  owner_rfc:            "RAHC750314AB1",

  // Identificación
  id_type:      "credencial" as const,
  id_authority: "INE",
  id_number:    "0123456789012",

  // Firmante
  signer_full_name: "Juana Patricia Sánchez Mora",
  signing_date:     "2026-06-29",
}

async function main() {
  console.log("Generando constancia de prueba (hasBc=true, datos completos)…")
  const buffer = await generateBeneficialOwnerDocx(testData)
  const outPath = "/tmp/constancia_bc_test.docx"
  fs.writeFileSync(outPath, buffer)
  console.log(`✅ Generado: ${outPath}  (${(buffer.length / 1024).toFixed(1)} KB)`)
  console.log("Abre el archivo y verifica:")
  console.log("  1. Campos del beneficiario subrayados (no guiones)")
  console.log("  2. Título y encabezados de tabla en negrita")
  console.log("  3. Sí/No en negrita, texto de pregunta en normal")
  console.log("  4. Tipo de ID ('Credencial para votar') en negrita")
  console.log("  5. 'Nombre:' y 'Fecha:' en negrita en el bloque de firma")
  console.log("  6. Nota aclaratoria en itálica")
  console.log("  7. Número de nota al pie en pregunta 1 → nota legal al fondo")
}

main().catch((e) => { console.error(e); process.exit(1) })
