import { z } from "zod"

export const newApplicationSchema = z.object({
  products: z
    .array(z.enum(["cards", "terminals"]))
    .min(1, "Selecciona al menos un producto"),
  legal_name: z.string().min(3, "Razón social requerida"),
  tax_id: z
    .string()
    .min(12, "RFC debe tener al menos 12 caracteres")
    .max(13),
  phone: z.string().min(10, "Teléfono debe tener 10 dígitos"),
  terminal_type: z
    .enum(["card_present", "ecommerce", "link_de_pago", "both"])
    .optional(),
})

export type NewApplicationValues = z.infer<typeof newApplicationSchema>
