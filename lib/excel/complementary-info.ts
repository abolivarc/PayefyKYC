import * as XLSX from "xlsx"
import type { ComplementaryInfoValues } from "@/lib/validations/complementary-info"

const ROLE_LABELS: Record<string, string> = {
  accionista: "Accionista (25%+)",
  representante_legal: "Representante legal",
  administrador: "Administrador / Consejero",
  beneficiario_controlador: "Beneficiario controlador",
}

export function generateComplementaryInfoXlsx(
  data: ComplementaryInfoValues,
  companyName?: string
): Blob {
  const wb = XLSX.utils.book_new()

  const rows: (string | number | boolean | null)[][] = []

  // ── Encabezado ──
  rows.push(["INFORMACIÓN COMPLEMENTARIA KYC — Payefy"])
  rows.push(["Empresa:", companyName ?? data.legal_name])
  rows.push(["Fecha:", data.declaration_date])
  rows.push([])

  // ── Sección 1: Datos de la empresa ──
  rows.push(["SECCIÓN 1: DATOS DE LA EMPRESA"])
  rows.push(["Razón social", data.legal_name])
  rows.push(["RFC", data.tax_id])
  rows.push(["Régimen fiscal", data.tax_regime])
  rows.push(["Actividad principal", data.business_activity])
  rows.push(["Descripción del negocio", data.business_description])
  rows.push([
    "Domicilio",
    `${data.address_street} ${data.address_number}, Col. ${data.address_colonia}`,
  ])
  rows.push(["Ciudad / Municipio", data.address_city])
  rows.push(["Estado", data.address_state])
  rows.push(["Código Postal", data.address_zip])
  rows.push(["Teléfono", data.phone])
  rows.push(["Correo electrónico", data.email])
  rows.push(["Sitio web", data.website || "—"])
  rows.push([])

  // ── Sección 2: Partes relacionadas ──
  rows.push(["SECCIÓN 2: PARTES RELACIONADAS"])
  rows.push([
    "#",
    "Nombre completo",
    "Rol",
    "RFC",
    "CURP",
    "% Participación",
    "¿Es PEP?",
    "Detalle PEP",
  ])
  data.parties.forEach((p, i) => {
    rows.push([
      i + 1,
      p.full_name,
      ROLE_LABELS[p.role] ?? p.role,
      p.rfc,
      p.curp,
      p.percentage ?? "—",
      p.is_pep ? "Sí" : "No",
      p.pep_details ?? "—",
    ])
  })
  rows.push([])

  // ── Sección 3: Declaraciones ──
  rows.push(["SECCIÓN 3: DECLARACIONES"])
  rows.push([
    "Sin sanciones internacionales (OFAC/ONU/UE):",
    data.no_sanctions ? "CONFIRMO" : "PENDIENTE",
  ])
  rows.push([
    "Sin relación con financiamiento al terrorismo:",
    data.no_terrorism ? "CONFIRMO" : "PENDIENTE",
  ])
  rows.push(["Lugar de firma", data.declaration_place])
  rows.push(["Fecha de firma", data.declaration_date])
  rows.push([])
  rows.push(["Nombre del representante legal", ""])
  rows.push(["Firma", ""])

  const ws = XLSX.utils.aoa_to_sheet(rows)
  ws["!cols"] = [{ wch: 50 }, { wch: 55 }, { wch: 30 }, { wch: 18 }, { wch: 20 }, { wch: 18 }, { wch: 10 }, { wch: 30 }]
  XLSX.utils.book_append_sheet(wb, ws, "Información Complementaria")

  const buf = XLSX.write(wb, { bookType: "xlsx", type: "base64" }) as string
  const binary = atob(buf)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes.buffer as ArrayBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  })
}
