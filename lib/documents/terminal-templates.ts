/**
 * Qué casilleros se le crean a una solicitud de terminales. Depende del tipo
 * de persona (plantillas pf_), la modalidad (fotos del local vs URL del
 * sitio) y de lo que el comercio contestó en el alta (AMEX, giro médico).
 *
 * Vive fuera de las server actions para poder probarse de forma aislada:
 * un casillero de más bloquea el envío del expediente y uno de menos deja
 * pasar un comercio sin el documento que lo respalda.
 */

/**
 * Plantillas iguales para ambos tipos de persona, sin variante pf_. Sin esta
 * excepción una persona física que las pide se queda sin el casillero,
 * porque el filtro pf_ las descarta.
 */
export const SHARED_CODES = ["amex_cover", "professional_license"]

const PHOTO_CODES = ["business_photos", "pf_business_photos"]
const URL_CODES = ["website_url", "pf_website_url"]

export function filterTerminalTemplates<T extends { code: string }>(
  templates: T[],
  personType: string | null,
  terminalType: string | null,
  wantsAmex?: boolean | null,
  isHealthcare?: boolean | null
): T[] {
  let result =
    personType === "persona_fisica"
      ? templates.filter((t) => t.code.startsWith("pf_") || SHARED_CODES.includes(t.code))
      : templates.filter((t) => !t.code.startsWith("pf_"))

  if (terminalType === "card_present") {
    result = result.filter((t) => !URL_CODES.includes(t.code))
  } else if (terminalType === "ecommerce" || terminalType === "link_de_pago") {
    result = result.filter((t) => !PHOTO_CODES.includes(t.code))
  }

  // La carátula AMEX solo aplica si el comercio va a aceptar American Express
  if (!wantsAmex) result = result.filter((t) => t.code !== "amex_cover")

  // La cédula solo se pide a quien declaró ser profesional de la salud
  if (!isHealthcare) result = result.filter((t) => t.code !== "professional_license")

  return result
}
