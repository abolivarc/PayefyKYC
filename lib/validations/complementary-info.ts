import { z } from "zod"

// RFC: 12 chars (persona moral) or 13 chars (persona física)
const RFC_REGEX = /^[A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{2}[0-9A]$/i
// CURP: exactly 18 chars
const CURP_REGEX = /^[A-Z]{4}[0-9]{6}[HM][A-Z]{2}[A-Z]{3}[A-Z0-9][0-9]$/i

export const PARTY_ROLES = [
  { value: "accionista", label: "Accionista (25%+)" },
  { value: "representante_legal", label: "Representante legal" },
  { value: "administrador", label: "Administrador / Consejero" },
  { value: "beneficiario_controlador", label: "Beneficiario controlador" },
] as const

export type PartyRole = typeof PARTY_ROLES[number]["value"]

const partySchema = z
  .object({
    full_name: z.string().min(2, "Nombre requerido"),
    role: z.enum([
      "accionista",
      "representante_legal",
      "administrador",
      "beneficiario_controlador",
    ]),
    rfc: z
      .string()
      .min(1, "RFC requerido")
      .regex(RFC_REGEX, "RFC inválido (ej. ABCD800101ABC)"),
    curp: z
      .string()
      .min(1, "CURP requerida")
      .regex(CURP_REGEX, "CURP inválida (18 caracteres)"),
    percentage: z.string().optional(),
    is_pep: z.boolean(),
    pep_details: z.string().optional(),
  })
  .refine(
    (v) =>
      v.role !== "accionista" ||
      (v.percentage !== undefined && v.percentage.trim() !== ""),
    { message: "Porcentaje requerido para accionistas", path: ["percentage"] }
  )
  .refine((v) => !v.is_pep || (v.pep_details?.trim() ?? "") !== "", {
    message: "Describe el cargo PEP",
    path: ["pep_details"],
  })

export const complementaryInfoSchema = z.object({
  // ── Sección 1: Empresa ────────────────────────────────
  legal_name: z.string().min(3, "Razón social requerida"),
  tax_id: z
    .string()
    .min(1, "RFC requerido")
    .regex(RFC_REGEX, "RFC inválido"),
  tax_regime: z.string().min(2, "Régimen fiscal requerido"),
  business_activity: z.string().min(5, "Actividad principal requerida"),
  business_description: z.string().min(10, "Descripción requerida"),
  address_street: z.string().min(3, "Calle requerida"),
  address_number: z.string().min(1, "Número requerido"),
  address_colonia: z.string().min(3, "Colonia requerida"),
  address_city: z.string().min(2, "Ciudad requerida"),
  address_state: z.string().min(2, "Estado requerido"),
  address_zip: z.string().length(5, "CP debe tener 5 dígitos"),
  phone: z.string().min(10, "Teléfono requerido"),
  email: z.string().email("Correo inválido"),
  website: z.string().url("URL inválida").optional().or(z.literal("")),

  // ── Sección 2: Partes relacionadas ───────────────────
  parties: z
    .array(partySchema)
    .min(1, "Al menos una parte requerida"),

  // ── Sección 3: Declaraciones ─────────────────────────
  no_sanctions: z
    .boolean()
    .refine((v) => v === true, { message: "Debes confirmar" }),
  no_terrorism: z
    .boolean()
    .refine((v) => v === true, { message: "Debes confirmar" }),
  declaration_place: z.string().min(2, "Lugar requerido"),
  declaration_date: z.string().min(1, "Fecha requerida"),
})

export type ComplementaryInfoValues = z.infer<typeof complementaryInfoSchema>
