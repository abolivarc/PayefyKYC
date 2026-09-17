// Destinatarios internos de los avisos operativos (comercio nuevo, subidas,
// cambios solicitados, pedidos, alertas del cron). Antes la dirección de
// Alejandro estaba escrita a mano en cada sitio; ahora los administradores
// reciben lo mismo y agregar uno nuevo es una línea aquí.
export const ADMIN_EMAILS = ["a.santibanez@payefy.me", "d.perezarce@payefy.me"]

/** Remitente / identidad principal de los correos salientes. */
export const PRIMARY_ADMIN_EMAIL = ADMIN_EMAILS[0]

export function isAdminEmail(email: string | null | undefined): boolean {
  return !!email && ADMIN_EMAILS.includes(email.trim().toLowerCase())
}

/**
 * Administradores a avisar cuando actúa `actorEmail`: uno no se auto-notifica
 * de lo que él mismo hizo, pero los demás sí se enteran.
 */
export function adminRecipientsExcept(actorEmail: string | null | undefined): string[] {
  const actor = actorEmail?.trim().toLowerCase()
  return ADMIN_EMAILS.filter((e) => e !== actor)
}
