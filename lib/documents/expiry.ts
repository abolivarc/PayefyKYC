const SIXTY_DAYS_MS = 60 * 24 * 60 * 60 * 1000
const WARN_THRESHOLD_MS = 53 * 24 * 60 * 60 * 1000

export function isDocumentExpired(uploadedAt: string | null | undefined): boolean {
  if (!uploadedAt) return false
  return Date.now() - new Date(uploadedAt).getTime() > SIXTY_DAYS_MS
}

export function isDocumentExpiringSoon(uploadedAt: string | null | undefined): boolean {
  if (!uploadedAt) return false
  const elapsed = Date.now() - new Date(uploadedAt).getTime()
  return elapsed >= WARN_THRESHOLD_MS && elapsed <= SIXTY_DAYS_MS
}

export function daysUntilExpiry(uploadedAt: string | null | undefined): number | null {
  if (!uploadedAt) return null
  const remaining = SIXTY_DAYS_MS - (Date.now() - new Date(uploadedAt).getTime())
  return Math.ceil(remaining / (24 * 60 * 60 * 1000))
}
