import { z } from "zod"

export const ROW_MAP = {
  organigrama: 2,
  director_nombre: 3,
  director_nacimiento: 4,
  director_cargo: 5,
  colaborador_nombre: 6,
  colaborador_puesto: 7,
  colaborador_nacimiento: 8,
  pep_relacion: 11,
  pep_residencia: 12,
  pep_dependencia: 13,
  pep_cargo: 14,
  pep_sueldo: 15,
  pep_inicio: 16,
  pep_fin: 17,
  pep_vigente: 18,
  anos_actividad: 21,
  ingresos_mensuales: 22,
  declaracion_anual: 23,
  ingresos_adicionales: 24,
  ingresos_adicionales_cuales: 25,
  clientes_extranjero: 27,
  productos_servicios: 28,
  num_empleados: 30,
  ingresos_empresa: 31,
  tiene_sucursales: 32,
  num_sucursales: 33,
  estados_sucursales: 34,
  principales_clientes: 35,
  principales_proveedores: 36,
  tiene_participacion: 37,
  participacion_razon: 38,
  parte_grupo: 39,
  grupo_detalle: 40,
} as const

export const TEMPLATE_LABELS: Record<number, string> = {
  1: "Información complementaria",
  2: "Organigrama empresarial",
  3: "Nombre de Director general",
  4: "Fecha de nacimiento de director general",
  5: "Cargo en la empresa",
  6: "Colaborador que reporte directamente",
  7: "Puesto del colaborador que reporta directamente",
  8: "Fecha de nacimiento del colaborador que reporte directamente",
  10: "Datos del PEP",
  11: "Relación con PEP",
  12: "Lugar de residencia del PEP",
  13: "Nombre de la dependencia",
  14: "Cargo en la dependencia",
  15: "Sueldo estimado",
  16: "Fecha de inicio de cargo",
  17: "Fecha de fin de cargo",
  18: "¿Es vigente el cargo?",
  20: "Datos de la empresa",
  21: "Años desempeñando la actividad",
  22: "Ingresos mensuales aproximados",
  23: "Adjuntar última declaración anual",
  24: "Tienes ingresos adicionales",
  25: "Si, ¿cuales?",
  26: "Información Clientes-Proveedores",
  27: "Tienes clientes y/o proveedores en el extranjero ¿en donde?",
  28: "Productos o servicios que comercializa la empresa",
  30: "Número de empleados",
  31: "Ingresos mensuales aproximados de la empresa",
  32: "¿Tienes sucursales o puntos de venta?",
  33: "Número de sucursales",
  34: "Estados donde se ubican",
  35: "Principales clientes",
  36: "Principales proveedores",
  37: "¿Tienes participación accionaria en otras empresas?",
  38: "Si, ¿razón social? ¿giro?",
  39: "¿Tu empresa es parte de un grupo empresarial?",
  40: "Si (Denominación, fecha de constitución, objeto social, porcentaje de participación, domicilio)",
}

// Always required (non-adjunto, non-conditional, non-PEP)
export const REQUIRED_ROWS = new Set([3, 4, 5, 6, 7, 8, 21, 22, 24, 27, 28, 30, 31, 32, 35, 36, 37, 39])

// Conditional: row N required when dependsOn row = whenValue
export const CONDITIONAL_ROWS: Record<number, { dependsOn: number; whenValue: string }> = {
  25: { dependsOn: 24, whenValue: "Sí" },
  33: { dependsOn: 32, whenValue: "Sí" },
  34: { dependsOn: 32, whenValue: "Sí" },
  38: { dependsOn: 37, whenValue: "Sí" },
  40: { dependsOn: 39, whenValue: "Sí" },
}

const yesNo = z.enum(["Sí", "No"])

export const complementaryInfoSchemaV2 = z.object({
  director_nombre: z.string().min(2, "Nombre requerido"),
  director_nacimiento: z.string().min(1, "Fecha requerida"),
  director_cargo: z.string().min(2, "Cargo requerido"),
  colaborador_nombre: z.string().min(2, "Nombre requerido"),
  colaborador_puesto: z.string().min(2, "Puesto requerido"),
  colaborador_nacimiento: z.string().min(1, "Fecha requerida"),
  pep_relacion: z.string().optional(),
  pep_residencia: z.string().optional(),
  pep_dependencia: z.string().optional(),
  pep_cargo: z.string().optional(),
  pep_sueldo: z.string().optional(),
  pep_inicio: z.string().optional(),
  pep_fin: z.string().optional(),
  pep_vigente: z.enum(["Sí", "No", ""]).optional(),
  anos_actividad: z.string().min(1, "Requerido"),
  ingresos_mensuales: z.string().min(1, "Requerido"),
  ingresos_adicionales: yesNo,
  ingresos_adicionales_cuales: z.string().optional(),
  clientes_extranjero: z.string().min(1, "Requerido"),
  productos_servicios: z.string().min(1, "Requerido"),
  num_empleados: z.string().min(1, "Requerido"),
  ingresos_empresa: z.string().min(1, "Requerido"),
  tiene_sucursales: yesNo,
  num_sucursales: z.string().optional(),
  estados_sucursales: z.string().optional(),
  principales_clientes: z.string().min(1, "Requerido"),
  principales_proveedores: z.string().min(1, "Requerido"),
  tiene_participacion: yesNo,
  participacion_razon: z.string().optional(),
  parte_grupo: yesNo,
  grupo_detalle: z.string().optional(),
}).superRefine((d, ctx) => {
  if (d.ingresos_adicionales === "Sí" && !d.ingresos_adicionales_cuales?.trim())
    ctx.addIssue({ code: "custom", path: ["ingresos_adicionales_cuales"], message: "Especifica cuáles ingresos adicionales" })
  if (d.tiene_sucursales === "Sí" && !d.num_sucursales?.trim())
    ctx.addIssue({ code: "custom", path: ["num_sucursales"], message: "Número de sucursales requerido" })
  if (d.tiene_sucursales === "Sí" && !d.estados_sucursales?.trim())
    ctx.addIssue({ code: "custom", path: ["estados_sucursales"], message: "Estados requeridos" })
  if (d.tiene_participacion === "Sí" && !d.participacion_razon?.trim())
    ctx.addIssue({ code: "custom", path: ["participacion_razon"], message: "Especifica razón social y giro" })
  if (d.parte_grupo === "Sí" && !d.grupo_detalle?.trim())
    ctx.addIssue({ code: "custom", path: ["grupo_detalle"], message: "Especifica los detalles del grupo" })
})

export type ComplementaryInfoV2Values = z.infer<typeof complementaryInfoSchemaV2>
