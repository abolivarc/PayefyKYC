import * as XLSX from "xlsx"
import JSZip from "jszip"
import type { ComplementaryInfoValues } from "@/lib/validations/complementary-info"

export async function generateComplementaryInfoZip(
  data: ComplementaryInfoValues
): Promise<Blob> {
  const wb = XLSX.utils.book_new()

  // Hoja 1: Datos de la empresa
  const empresaRows = [
    ["DATOS DE LA EMPRESA"],
    [],
    ["Razón social", data.legal_name],
    ["RFC", data.tax_id],
    ["Régimen fiscal", data.tax_regime],
    ["Actividad principal", data.business_activity],
    ["Descripción del negocio", data.business_description],
    [
      "Domicilio",
      `${data.address_street} ${data.address_number}, Col. ${data.address_colonia}`,
    ],
    ["Ciudad / Municipio", data.address_city],
    ["Estado", data.address_state],
    ["Código Postal", data.address_zip],
    ["Teléfono", data.phone],
    ["Correo electrónico", data.email],
    ["Sitio web", data.website || "N/A"],
  ]
  const wsEmpresa = XLSX.utils.aoa_to_sheet(empresaRows)
  wsEmpresa["!cols"] = [{ wch: 30 }, { wch: 50 }]
  XLSX.utils.book_append_sheet(wb, wsEmpresa, "Empresa")

  // Hoja 2: Accionistas
  const accionistasRows = data.shareholders.map((s, i) => [
    i + 1,
    s.full_name,
    s.rfc,
    s.curp,
    s.percentage || "",
    s.is_pep ? "Sí" : "No",
  ])
  const wsAccionistas = XLSX.utils.aoa_to_sheet([
    ["ACCIONISTAS CON 25% O MÁS DE PARTICIPACIÓN"],
    [],
    ["#", "Nombre completo", "RFC", "CURP", "% Participación", "¿Es PEP?"],
    ...accionistasRows,
  ])
  wsAccionistas["!cols"] = [
    { wch: 5 },
    { wch: 35 },
    { wch: 15 },
    { wch: 20 },
    { wch: 15 },
    { wch: 10 },
  ]
  XLSX.utils.book_append_sheet(wb, wsAccionistas, "Accionistas")

  // Hoja 3: Representantes legales
  const repRows = data.legal_representatives.map((r, i) => [
    i + 1,
    r.full_name,
    r.rfc,
    r.curp,
    r.is_pep ? "Sí" : "No",
  ])
  const wsReps = XLSX.utils.aoa_to_sheet([
    ["REPRESENTANTES LEGALES"],
    [],
    ["#", "Nombre completo", "RFC", "CURP", "¿Es PEP?"],
    ...repRows,
  ])
  wsReps["!cols"] = [
    { wch: 5 },
    { wch: 35 },
    { wch: 15 },
    { wch: 20 },
    { wch: 10 },
  ]
  XLSX.utils.book_append_sheet(wb, wsReps, "Representantes Legales")

  // Hoja 4: Administradores
  const adminRows = data.administrators.map((a, i) => [
    i + 1,
    a.full_name,
    a.rfc,
    a.position,
  ])
  const wsAdmins = XLSX.utils.aoa_to_sheet([
    ["ADMINISTRADORES"],
    [],
    ["#", "Nombre completo", "RFC", "Cargo"],
    ...adminRows,
  ])
  wsAdmins["!cols"] = [{ wch: 5 }, { wch: 35 }, { wch: 15 }, { wch: 25 }]
  XLSX.utils.book_append_sheet(wb, wsAdmins, "Administradores")

  // Hoja 5: Clientes y proveedores
  const cpRows: unknown[][] = [
    ["PRINCIPALES CLIENTES"],
    ["Nombre / Razón social", "País", "% de ventas aprox."],
    ...(data.main_clients ?? []).map((c) => [
      c.name,
      c.country,
      c.sales_percentage,
    ]),
    [],
    ["PRINCIPALES PROVEEDORES"],
    ["Nombre / Razón social", "País", "% de compras aprox."],
    ...(data.main_suppliers ?? []).map((s) => [
      s.name,
      s.country,
      s.purchase_percentage,
    ]),
  ]
  const wsCyP = XLSX.utils.aoa_to_sheet(cpRows)
  wsCyP["!cols"] = [{ wch: 35 }, { wch: 20 }, { wch: 20 }]
  XLSX.utils.book_append_sheet(wb, wsCyP, "Clientes y Proveedores")

  // Hoja 6: Declaraciones
  const declRows = [
    ["DECLARACIONES"],
    [],
    [
      "La empresa y sus accionistas/representantes NO están sujetos a sanciones internacionales:",
      data.no_sanctions ? "CONFIRMO" : "PENDIENTE",
    ],
    [
      "La empresa NO tiene relación con actividades de financiamiento al terrorismo:",
      data.no_terrorism ? "CONFIRMO" : "PENDIENTE",
    ],
    [],
    ["Lugar de firma", data.declaration_place],
    ["Fecha de firma", data.declaration_date],
    [],
    ["Nombre del representante legal", ""],
    ["Firma", ""],
  ]
  const wsDecl = XLSX.utils.aoa_to_sheet(declRows)
  wsDecl["!cols"] = [{ wch: 70 }, { wch: 20 }]
  XLSX.utils.book_append_sheet(wb, wsDecl, "Declaraciones")

  const xlsxBuffer = XLSX.write(wb, {
    bookType: "xlsx",
    type: "array",
  }) as Uint8Array

  const zip = new JSZip()
  zip.file("informacion_complementaria.xlsx", xlsxBuffer)
  return zip.generateAsync({ type: "blob" })
}
