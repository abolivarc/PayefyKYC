import * as XLSX from "xlsx"
import type { ComplementaryInfoV2Values } from "@/lib/validations/complementary-info-v2"
import { ROW_MAP } from "@/lib/validations/complementary-info-v2"

export function generateComplementaryInfoXlsx(
  templateBuffer: Buffer,
  data: ComplementaryInfoV2Values,
  legalName: string,
  orgFileName?: string,
): Buffer {
  const wb = XLSX.read(templateBuffer, { type: "buffer" })
  const originalName = wb.SheetNames[0]
  const ws = wb.Sheets[originalName]

  function setB(row: number, value: string) {
    const addr = XLSX.utils.encode_cell({ r: row - 1, c: 1 })
    ws[addr] = { t: "s", v: value }
  }

  if (orgFileName) setB(ROW_MAP.organigrama, `Adjuntado: ${orgFileName}`)
  setB(ROW_MAP.director_nombre, data.director_nombre)
  setB(ROW_MAP.director_nacimiento, data.director_nacimiento)
  setB(ROW_MAP.director_cargo, data.director_cargo)
  setB(ROW_MAP.colaborador_nombre, data.colaborador_nombre)
  setB(ROW_MAP.colaborador_puesto, data.colaborador_puesto)
  setB(ROW_MAP.colaborador_nacimiento, data.colaborador_nacimiento)
  if (data.pep_relacion) setB(ROW_MAP.pep_relacion, data.pep_relacion)
  if (data.pep_residencia) setB(ROW_MAP.pep_residencia, data.pep_residencia)
  if (data.pep_dependencia) setB(ROW_MAP.pep_dependencia, data.pep_dependencia)
  if (data.pep_cargo) setB(ROW_MAP.pep_cargo, data.pep_cargo)
  if (data.pep_sueldo) setB(ROW_MAP.pep_sueldo, data.pep_sueldo)
  if (data.pep_inicio) setB(ROW_MAP.pep_inicio, data.pep_inicio)
  if (data.pep_fin) setB(ROW_MAP.pep_fin, data.pep_fin)
  if (data.pep_vigente) setB(ROW_MAP.pep_vigente, data.pep_vigente)
  setB(ROW_MAP.anos_actividad, data.anos_actividad)
  setB(ROW_MAP.ingresos_mensuales, data.ingresos_mensuales)
setB(ROW_MAP.ingresos_adicionales, data.ingresos_adicionales)
  if (data.ingresos_adicionales === "Sí" && data.ingresos_adicionales_cuales)
    setB(ROW_MAP.ingresos_adicionales_cuales, data.ingresos_adicionales_cuales)
  setB(ROW_MAP.clientes_extranjero, data.clientes_extranjero)
  setB(ROW_MAP.productos_servicios, data.productos_servicios)
  setB(ROW_MAP.num_empleados, data.num_empleados)
  setB(ROW_MAP.ingresos_empresa, data.ingresos_empresa)
  setB(ROW_MAP.tiene_sucursales, data.tiene_sucursales)
  if (data.tiene_sucursales === "Sí") {
    if (data.num_sucursales) setB(ROW_MAP.num_sucursales, data.num_sucursales)
    if (data.estados_sucursales) setB(ROW_MAP.estados_sucursales, data.estados_sucursales)
  }
  setB(ROW_MAP.principales_clientes, data.principales_clientes)
  setB(ROW_MAP.principales_proveedores, data.principales_proveedores)
  setB(ROW_MAP.tiene_participacion, data.tiene_participacion)
  if (data.tiene_participacion === "Sí" && data.participacion_razon)
    setB(ROW_MAP.participacion_razon, data.participacion_razon)
  setB(ROW_MAP.parte_grupo, data.parte_grupo)
  if (data.parte_grupo === "Sí" && data.grupo_detalle)
    setB(ROW_MAP.grupo_detalle, data.grupo_detalle)

  // Rename sheet to company name
  const safeName = legalName.slice(0, 31) // Excel sheet name max 31 chars
  wb.Sheets[safeName] = ws
  delete wb.Sheets[originalName]
  wb.SheetNames[0] = safeName

  return Buffer.from(XLSX.write(wb, { bookType: "xlsx", type: "buffer" }) as ArrayBuffer)
}
