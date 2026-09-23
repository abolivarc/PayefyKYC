// Validación de pisos comerciales — fuente única de verdad.
//
// La usan el paso 3 (errores por campo), el wizard (bloquear "Siguiente"),
// el paso 4 (bloquear el PDF) y saveLead (rechazar en el servidor). Si se
// valida en un solo lado, basta con retroceder un paso o manipular el estado
// para dejar salir una cotización por debajo del piso.
import {
  AMEX_FLOOR_RATE,
  INTERNATIONAL_FLOOR_RATE,
  pisosPorMcc,
  type RateTier,
} from "./mcc-catalog"
import type { ProposalData } from "./types"

export type RateKey =
  | "negotiatedDebitRate"
  | "negotiatedCreditRate"
  | "negotiatedAmexRate"
  | "negotiatedInternationalRate"

export type RateErrors = Partial<Record<RateKey, string>>

/**
 * Piso de cada tasa, según el tarifario de quien cotiza.
 *
 * Los pisos se resuelven desde el catálogo con el MCC elegido, no desde lo que
 * traiga `data`: así un agente no puede colar los pisos internos manipulando el
 * estado del wizard. Solo se cae a los valores de `data` cuando el giro no está
 * en el catálogo (leads viejos con un MCC retirado).
 *
 * Devuelve `null` cuando el piso aún no se conoce: eso es "no puedo validar",
 * no "el piso es cero". Con `?? 0`, un giro sin piso dejaba pasar cualquier
 * tasa, incluso 0 %.
 */
export function floorFor(
  key: RateKey,
  data: Partial<ProposalData>,
  tier: RateTier = "interno"
): number | null {
  const pisos = pisosPorMcc(data.mccCode, tier)
  switch (key) {
    case "negotiatedDebitRate":
      if (pisos) return pisos.debito
      return typeof data.sectorDebitFloor === "number" ? data.sectorDebitFloor : null
    case "negotiatedCreditRate":
      if (pisos) return pisos.credito
      return typeof data.sectorCreditFloor === "number" ? data.sectorCreditFloor : null
    case "negotiatedAmexRate":
      return pisos ? pisos.amex : AMEX_FLOOR_RATE
    case "negotiatedInternationalRate":
      return pisos ? pisos.internacional : INTERNATIONAL_FLOOR_RATE
  }
}

const LABELS: Record<RateKey, string> = {
  negotiatedDebitRate: "débito",
  negotiatedCreditRate: "crédito",
  negotiatedAmexRate: "AMEX",
  negotiatedInternationalRate: "internacional",
}

// AMEX e internacional tienen piso fijo: si se dejan vacíos se cotizan al piso.
// Débito y crédito sí son obligatorios de capturar.
const REQUIRED: RateKey[] = ["negotiatedDebitRate", "negotiatedCreditRate"]

/** Errores por campo. Objeto vacío = la cotización respeta todos los pisos. */
export function validateRates(
  data: Partial<ProposalData>,
  tier: RateTier = "interno"
): RateErrors {
  const errors: RateErrors = {}

  for (const key of Object.keys(LABELS) as RateKey[]) {
    const rate = data[key]
    const floor = floorFor(key, data, tier)

    if (rate === undefined || rate === null) {
      if (REQUIRED.includes(key)) {
        errors[key] = `Captura la tasa de ${LABELS[key]}`
      }
      continue
    }

    if (!Number.isFinite(rate)) {
      errors[key] = `La tasa de ${LABELS[key]} no es un número válido`
      continue
    }

    if (floor === null) {
      errors[key] = "Selecciona primero el giro para conocer el piso"
      continue
    }

    // Tolerancia de 1e-9: 3.1 capturado a mano no debe perder contra el
    // 3.0999999999999996 que produce la suma en coma flotante.
    if (rate < floor - 1e-9) {
      errors[key] = `La tasa de ${LABELS[key]} no puede ser menor al piso (${floor}%)`
    }
  }

  return errors
}

export function ratesAreValid(
  data: Partial<ProposalData>,
  tier: RateTier = "interno"
): boolean {
  return Object.keys(validateRates(data, tier)).length === 0
}

/** Mensaje de una línea para el servidor y los avisos de bloqueo. */
export function firstRateError(
  data: Partial<ProposalData>,
  tier: RateTier = "interno"
): string | null {
  const errors = validateRates(data, tier)
  const keys = Object.keys(errors) as RateKey[]
  return keys.length ? errors[keys[0]]! : null
}
