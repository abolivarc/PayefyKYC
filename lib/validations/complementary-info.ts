import { z } from "zod"

const personSchema = z.object({
  full_name: z.string().min(2, "Nombre requerido"),
  rfc: z.string().min(12).max(13),
  curp: z.string().length(18, "CURP debe tener 18 caracteres"),
  percentage: z.string().optional(),
  is_pep: z.boolean(),
})

export const complementaryInfoSchema = z.object({
  // Sección 1: Empresa
  legal_name: z.string().min(3),
  tax_id: z.string().min(12).max(13),
  tax_regime: z.string().min(2, "Régimen fiscal requerido"),
  business_activity: z.string().min(5, "Describe la actividad principal"),
  business_description: z.string().min(10, "Descripción requerida"),
  address_street: z.string().min(3),
  address_number: z.string().min(1),
  address_colonia: z.string().min(3),
  address_city: z.string().min(2),
  address_state: z.string().min(2),
  address_zip: z.string().length(5, "CP debe tener 5 dígitos"),
  phone: z.string().min(10),
  email: z.string().email(),
  website: z.string().url().optional().or(z.literal("")),

  // Sección 2: Accionistas
  shareholders: z
    .array(personSchema)
    .min(1, "Al menos un accionista requerido"),

  // Sección 3: Representantes legales
  legal_representatives: z
    .array(personSchema)
    .min(1, "Al menos un representante legal requerido"),

  // Sección 4: Administradores
  administrators: z
    .array(
      z.object({
        full_name: z.string().min(2),
        rfc: z.string().min(12).max(13),
        position: z.string().min(2, "Cargo requerido"),
      })
    )
    .min(1),

  // Sección 5: Principales clientes (opcional, array vacío si no aplica)
  main_clients: z.array(
    z.object({
      name: z.string().min(2),
      country: z.string().min(2),
      sales_percentage: z.string(),
    })
  ),

  // Sección 6: Principales proveedores (opcional, array vacío si no aplica)
  main_suppliers: z.array(
    z.object({
      name: z.string().min(2),
      country: z.string().min(2),
      purchase_percentage: z.string(),
    })
  ),

  // Sección 7: Declaraciones
  no_sanctions: z
    .boolean()
    .refine((v) => v === true, { message: "Debes confirmar" }),
  no_terrorism: z
    .boolean()
    .refine((v) => v === true, { message: "Debes confirmar" }),
  declaration_date: z.string().min(1, "Fecha requerida"),
  declaration_place: z.string().min(2, "Lugar requerido"),
})

export type ComplementaryInfoValues = z.infer<typeof complementaryInfoSchema>
