/**
 * Produces a Supabase Storage-safe filename segment.
 *
 * Supabase Storage rejects keys containing accented characters, spaces, or
 * most special characters (returns 400 InvalidKey). This function:
 *   1. Decomposes diacritics via NFD  (É → E + U+0301, ñ → n + U+0303 …)
 *   2. Strips combining marks (U+0300–U+036F), leaving only ASCII base letters
 *   3. Replaces anything outside [A-Za-z0-9._-] (including spaces) with "-"
 *   4. Collapses consecutive dashes and trims leading/trailing ones
 *   5. Caps at 200 chars to stay well within object-key limits
 *
 * Apply only to the filename segment — NOT to path separators or UUIDs,
 * which are already safe and must be preserved verbatim.
 *
 * Save the original human-readable name in documents.file_name separately,
 * before calling this function.
 */
export function sanitizeStorageKey(name: string): string {
  return (
    name
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")    // strip combining diacritical marks
      .normalize("NFC")
      .replace(/[^A-Za-z0-9._-]+/g, "-") // spaces + unsafe chars → "-"
      .replace(/-+/g, "-")               // collapse repeated dashes
      .replace(/^-+|-+$/g, "")           // trim leading/trailing dashes
      .slice(0, 200)
    || "documento"
  )
}
