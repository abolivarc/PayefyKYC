// Casar propuestas viejas con comercios que se están registrando.
//
// El generador de propuestas y el KYC son dos mundos separados: la propuesta
// se hace con el nombre comercial que el vendedor conoce ("Entregado MX") y el
// alta llega con la razón social del SAT ("Vermittler Analytics"). Este módulo
// decide cuándo dos registros son el mismo negocio, sin inventar coincidencias:
// solo señales duras (correo, nombre normalizado, teléfono) y una blanda
// (dominio corporativo). Nada de coincidencias por pedazos de texto — probado
// contra los datos reales, "Vicio" casaba con "Mendieta Ingeniería y Servicios".

/** Correos de buzón personal: compartir dominio aquí no dice nada. */
const GENERIC_DOMAINS = new Set([
  "gmail.com", "hotmail.com", "outlook.com", "outlook.es", "yahoo.com",
  "yahoo.com.mx", "icloud.com", "live.com", "live.com.mx", "me.com",
  "msn.com", "prodigy.net.mx", "aol.com", "protonmail.com",
  // Los nuestros: un correo de Payefy en el lead es el vendedor, no el cliente
  "payefy.me", "payefy.com.mx", "payefy.com",
])

/** Sufijos societarios: "Agape Travel" y "Agape Travel SA de CV" son lo mismo. */
const CORPORATE_SUFFIXES = [
  "sapi de cv", "s de rl de cv", "sa de cv", "sa de c v", "sapi", "s de rl",
  "srl de cv", "srl", "sofom enr", "sofom", "sa", "sc", "ac", "spr de rl",
]

export function normalizeEmail(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase()
}

export function emailDomain(value: string | null | undefined): string {
  const email = normalizeEmail(value)
  const at = email.lastIndexOf("@")
  return at === -1 ? "" : email.slice(at + 1)
}

export function isCorporateDomain(domain: string): boolean {
  return !!domain && domain.includes(".") && !GENERIC_DOMAINS.has(domain)
}

/** Últimos 10 dígitos: ignora lada de país, espacios, guiones y paréntesis. */
export function normalizePhone(value: string | null | undefined): string {
  const digits = (value ?? "").replace(/\D/g, "")
  return digits.length >= 10 ? digits.slice(-10) : ""
}

/**
 * Nombre comparable: sin acentos, sin figura societaria, sin puntuación.
 * "Entregado.mx" y "ENTREGADO MX" → "entregadomx".
 */
export function normalizeName(value: string | null | undefined): string {
  let s = (value ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[.,]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
  for (const suffix of CORPORATE_SUFFIXES) {
    if (s.endsWith(` ${suffix}`)) {
      s = s.slice(0, -(suffix.length + 1)).trim()
      break
    }
  }
  return s.replace(/[^a-z0-9]/g, "")
}

/** Lo que necesitamos de una propuesta para compararla. */
export interface LeadIdentity {
  business_name: string | null
  contact_email: string | null
  contact_phone: string | null
}

/** Lo que necesitamos de un comercio del KYC para compararlo. */
export interface CompanyIdentity {
  legal_name: string | null
  internal_alias?: string | null
  contact_email?: string | null
  operator_email?: string | null
  phone?: string | null
}

export interface LeadMatch {
  /** 100 = mismo correo; por debajo de 60 no se considera coincidencia */
  score: number
  /** Por qué casaron, en palabras, para que el revisor pueda juzgarlo */
  reason: string
}

/**
 * ¿Esta propuesta es de este comercio? `null` cuando no hay evidencia.
 * Devuelve la razón más fuerte encontrada, no todas.
 */
export function matchLeadToCompany(
  lead: LeadIdentity,
  company: CompanyIdentity
): LeadMatch | null {
  const leadEmail = normalizeEmail(lead.contact_email)
  const companyEmails = [company.contact_email, company.operator_email]
    .map(normalizeEmail)
    .filter(Boolean)

  if (leadEmail && companyEmails.includes(leadEmail)) {
    return { score: 100, reason: "mismo correo de contacto" }
  }

  const leadName = normalizeName(lead.business_name)
  const companyNames = [company.legal_name, company.internal_alias]
    .map(normalizeName)
    .filter((n) => n.length > 2)

  if (leadName.length > 2 && companyNames.includes(leadName)) {
    return { score: 90, reason: "mismo nombre de negocio" }
  }

  const leadPhone = normalizePhone(lead.contact_phone)
  if (leadPhone && leadPhone === normalizePhone(company.phone)) {
    return { score: 80, reason: "mismo teléfono" }
  }

  const leadDomain = emailDomain(lead.contact_email)
  if (isCorporateDomain(leadDomain)) {
    const companyDomains = companyEmails.map(emailDomain)
    if (companyDomains.includes(leadDomain)) {
      return { score: 60, reason: `mismo dominio de correo (@${leadDomain})` }
    }
  }

  return null
}

/** Las propuestas que podrían ser de este comercio, de la más probable a la menos. */
export function rankLeadsForCompany<T extends LeadIdentity>(
  leads: T[],
  company: CompanyIdentity
): { lead: T; match: LeadMatch }[] {
  return leads
    .map((lead) => {
      const match = matchLeadToCompany(lead, company)
      return match ? { lead, match } : null
    })
    .filter((x): x is { lead: T; match: LeadMatch } => x !== null)
    .sort((a, b) => b.match.score - a.match.score)
}

/** Los comercios que podrían ser esta propuesta (mismo criterio, al revés). */
export function rankCompaniesForLead<T extends CompanyIdentity & { id: string }>(
  companies: T[],
  lead: LeadIdentity
): { company: T; match: LeadMatch }[] {
  return companies
    .map((company) => {
      const match = matchLeadToCompany(lead, company)
      return match ? { company, match } : null
    })
    .filter((x): x is { company: T; match: LeadMatch } => x !== null)
    .sort((a, b) => b.match.score - a.match.score)
}
