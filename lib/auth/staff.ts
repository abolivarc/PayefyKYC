// Contexto del usuario del panel interno (solo servidor).
import { createClient } from "@/lib/supabase/server"
import { AGENT_ALLOWED_PREFIXES, AGENT_HOME, agentCanAccess } from "./agent-paths"
import {
  ROLE_LABELS,
  ASSIGNABLE_ROLES,
  isAgent,
  isSuperAdmin,
  type StaffRole,
} from "./roles"

export {
  AGENT_ALLOWED_PREFIXES,
  AGENT_HOME,
  agentCanAccess,
  ROLE_LABELS,
  ASSIGNABLE_ROLES,
  isAgent,
  isSuperAdmin,
}
export type { StaffRole }

export interface StaffContext {
  userId: string
  role: string | null
  isAgent: boolean
  isSuperAdmin: boolean
}

/** Contexto del usuario del panel (null si no hay sesión). */
export async function getStaffContext(): Promise<StaffContext | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  const role = (profile?.role as string | null) ?? null
  return {
    userId: user.id,
    role,
    isAgent: isAgent(role),
    isSuperAdmin: isSuperAdmin(role),
  }
}
