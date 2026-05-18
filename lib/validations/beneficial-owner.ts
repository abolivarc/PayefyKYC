import { z } from "zod"

export const beneficialOwnerSchema = z.object({
  // Empresa
  company_legal_name: z.string().min(3),
  company_tax_id: z.string().min(12).max(13),
  company_address: z.string().min(5),

  // ¿Existe beneficiario controlador?
  has_beneficial_owner: z.boolean(),

  // Beneficiario (requerido si has_beneficial_owner = true)
  owner_full_name: z.string().optional(),
  owner_rfc: z.string().optional(),
  owner_curp: z.string().optional(),
  owner_country: z.string().optional(),
  owner_control_percentage: z.string().optional(),
  owner_control_type: z.enum(["direct", "indirect"]).optional(),

  // Rep legal firmante
  signer_full_name: z.string().min(2, "Nombre del firmante requerido"),
  signer_position: z.string().min(2, "Cargo requerido"),
  signing_date: z.string().min(1, "Fecha requerida"),
  signing_place: z.string().min(2, "Lugar requerido"),
})

export type BeneficialOwnerValues = z.infer<typeof beneficialOwnerSchema>
