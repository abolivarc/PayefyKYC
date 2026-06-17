import { z } from "zod"

export const termsOpmSchema = z.object({
  company_legal_name: z.string().min(3, "Razón social requerida"),
  signer_full_name: z.string().min(2, "Nombre del representante requerido"),
  signing_date: z.string().min(1, "Fecha requerida"),
})

export type TermsOpmValues = z.infer<typeof termsOpmSchema>
