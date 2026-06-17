import { z } from "zod"

export const beneficialOwnerSchema = z.object({
  // Empresa
  company_legal_name: z.string().min(3),
  company_tax_id: z.string().min(12).max(13),
  company_address: z.string().min(5),

  // ¿Existe beneficiario controlador?
  has_beneficial_owner: z.boolean(),

  // Datos generales del beneficiario (campos de la constancia oficial)
  owner_full_name: z.string().optional(),
  owner_birth_date: z.string().optional(),
  owner_birth_country: z.string().optional(),
  owner_nationality: z.string().optional(),
  owner_occupation: z.string().optional(),
  owner_address: z.string().optional(),
  owner_phone: z.string().optional(),
  owner_email: z.string().optional(),
  owner_curp: z.string().optional(),
  owner_rfc: z.string().optional(),

  // Datos de la identificación
  id_type: z.enum(["credencial", "pasaporte", "migratorio"]).optional(),
  id_authority: z.string().optional(),
  id_number: z.string().optional(),

  // Campos legacy (se mantienen para compatibilidad con submissions anteriores)
  owner_country: z.string().optional(),
  owner_control_percentage: z.string().optional(),
  owner_control_type: z.enum(["direct", "indirect"]).optional(),

  // Rep legal firmante
  signer_full_name: z.string().min(2, "Nombre del firmante requerido"),
  signing_date: z.string().min(1, "Fecha requerida"),
  // Legacy fields kept for backward compat
  signer_position: z.string().optional(),
  signing_place: z.string().optional(),
})

export type BeneficialOwnerValues = z.infer<typeof beneficialOwnerSchema>
