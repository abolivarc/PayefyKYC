// Rutas del panel permitidas al agente comercial.
// Archivo sin dependencias de servidor: lo usa también el middleware (edge).

/**
 * El agente comercial solo ve su propio trabajo: propuestas que él generó,
 * leads que él dio de alta y el expediente de esos clientes en modo lectura.
 */
export const AGENT_ALLOWED_PREFIXES = [
  "/admin/proposals",
  "/admin/leads",
  "/admin/clients",
  "/admin/applications",
  "/admin/perfil",
  "/admin/cambiar-contrasena",
]

/** Ruta de inicio del agente (no tiene dashboard general). */
export const AGENT_HOME = "/admin/proposals"

export function agentCanAccess(pathname: string): boolean {
  return AGENT_ALLOWED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  )
}
