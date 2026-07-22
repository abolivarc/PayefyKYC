// Tipos del Generador de Propuestas Comerciales
import { AMEX_FLOOR_RATE, INTERNATIONAL_FLOOR_RATE } from "./mcc-catalog"

export { AMEX_FLOOR_RATE, INTERNATIONAL_FLOOR_RATE }

export type EntityType = "fisica" | "fisica_actividad_empresarial" | "moral"
export type ProposalType = "comparative" | "general"
export type ProductType = "terminales" | "venta_en_linea" | "link_de_pago"

export interface ProposalData {
  // Paso 1: Información del negocio
  productType: ProductType
  businessName: string
  entityType: EntityType
  mccCode: string
  sectorName: string
  sectorFamilia: string
  sectorDebitFloor: number
  sectorCreditFloor: number
  monthlyVolume: number
  averageTicket?: number

  // Contacto
  contactName: string
  contactEmail: string
  contactPhone: string

  // Paso 2: Tipo de propuesta
  proposalType: ProposalType

  // Paso 3: Tasas negociadas (deben ser >= piso)
  negotiatedDebitRate: number
  negotiatedCreditRate: number
  negotiatedAmexRate: number
  negotiatedInternationalRate: number

  // Distribución del volumen por tipo de tarjeta (%; suman 100)
  debitDistribution: number
  creditDistribution: number
  amexDistribution: number
  internationalDistribution: number

  // Solo comparativa
  competitorName?: string
  competitorDebitRate?: number
  competitorCreditRate?: number
  competitorAmexRate?: number
  competitorInternationalRate?: number

  // Servicio de dispersión con tarjetas
  hasDispersionCards?: boolean
  dispersionFeeBase?: number // % depósito estándar
  instantFeeRate?: number // % disponibilidad inmediata
}

export interface ProposalCalculations {
  debitVolume: number
  creditVolume: number
  amexVolume: number
  internationalVolume: number

  // Costos con IVA
  competitorMonthlyCost: number
  competitorAnnualCost: number
  payefyMonthlyCost: number
  payefyAnnualCost: number

  monthlySavings: number
  annualSavings: number
  savingsPercentage: number
}

export interface StepProps {
  data: Partial<ProposalData>
  updateData: (data: Partial<ProposalData>) => void
}

export const IVA_RATE = 1.16

export const COMPETITORS = [
  "Mercado Pago",
  "Clip",
  "Fiserv",
  "Banco",
  "iZettle",
  "SrPago",
  "Otro",
] as const

export const ENTITY_TYPE_LABELS: Record<EntityType, string> = {
  fisica: "Persona Física",
  fisica_actividad_empresarial: "Persona Física con Actividad Empresarial",
  moral: "Persona Moral",
}

export const PRODUCT_TYPE_LABELS: Record<ProductType, string> = {
  terminales: "Terminales",
  venta_en_linea: "Venta en Línea",
  link_de_pago: "Link de Pago",
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * Calcula costos mensuales/anuales (con IVA) y ahorro vs competidor.
 * La comparación pondera cada tipo de tarjeta por su % de distribución.
 * Si el competidor no tiene tasa capturada para AMEX/Internacional, ese tipo
 * se compara neutro (misma tasa que Payefy) para no inflar el ahorro.
 */
export function calculateProposal(data: Partial<ProposalData>): ProposalCalculations {
  const monthlyVolume = data.monthlyVolume || 0
  const dist = {
    debit: (data.debitDistribution ?? 50) / 100,
    credit: (data.creditDistribution ?? 50) / 100,
    amex: (data.amexDistribution ?? 0) / 100,
    intl: (data.internationalDistribution ?? 0) / 100,
  }

  const debitVolume = monthlyVolume * dist.debit
  const creditVolume = monthlyVolume * dist.credit
  const amexVolume = monthlyVolume * dist.amex
  const internationalVolume = monthlyVolume * dist.intl

  const payefy = {
    debit: data.negotiatedDebitRate || 0,
    credit: data.negotiatedCreditRate || 0,
    amex: data.negotiatedAmexRate ?? AMEX_FLOOR_RATE,
    intl: data.negotiatedInternationalRate ?? INTERNATIONAL_FLOOR_RATE,
  }

  const competitor = {
    debit: data.competitorDebitRate || 0,
    credit: data.competitorCreditRate || 0,
    amex: data.competitorAmexRate ?? payefy.amex,
    intl: data.competitorInternationalRate ?? payefy.intl,
  }

  const payefyMonthlyCost =
    (debitVolume * (payefy.debit / 100) +
      creditVolume * (payefy.credit / 100) +
      amexVolume * (payefy.amex / 100) +
      internationalVolume * (payefy.intl / 100)) *
    IVA_RATE

  const competitorMonthlyCost =
    (debitVolume * (competitor.debit / 100) +
      creditVolume * (competitor.credit / 100) +
      amexVolume * (competitor.amex / 100) +
      internationalVolume * (competitor.intl / 100)) *
    IVA_RATE

  const payefyAnnualCost = payefyMonthlyCost * 12
  const competitorAnnualCost = competitorMonthlyCost * 12
  const monthlySavings = competitorMonthlyCost - payefyMonthlyCost
  const annualSavings = competitorAnnualCost - payefyAnnualCost
  const savingsPercentage =
    competitorAnnualCost > 0 ? (annualSavings / competitorAnnualCost) * 100 : 0

  return {
    debitVolume,
    creditVolume,
    amexVolume,
    internationalVolume,
    competitorMonthlyCost,
    competitorAnnualCost,
    payefyMonthlyCost,
    payefyAnnualCost,
    monthlySavings,
    annualSavings,
    savingsPercentage,
  }
}
