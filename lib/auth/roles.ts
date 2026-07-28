// Roles del panel interno. Sin dependencias de servidor: lo usan también
// los componentes de cliente.

export type StaffRole =
  | "sales_agent"
  | "sales_director"
  | "compliance"
  | "onboarding"
  | "accounting"
  | "super_admin"

export const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  sales_director: "Director comercial",
  compliance: "Compliance",
  sales_agent: "Agente comercial",
  onboarding: "Onboarding",
  accounting: "Contabilidad",
}

// Roles asignables desde el panel de usuarios
export const ASSIGNABLE_ROLES: StaffRole[] = [
  "sales_agent",
  "sales_director",
  "compliance",
  "onboarding",
  "accounting",
  "super_admin",
]

export function isAgent(role: string | null | undefined): boolean {
  return role === "sales_agent"
}

export function isSuperAdmin(role: string | null | undefined): boolean {
  return role === "super_admin"
}
