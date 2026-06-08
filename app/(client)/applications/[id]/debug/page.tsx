import { createClient } from "@/lib/supabase/server"

export default async function DebugPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: appId } = await params
  const lines: string[] = []
  const log = (label: string, value: unknown) =>
    lines.push(
      `${label}: ${typeof value === "string" ? value : JSON.stringify(value)}`
    )

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  log("appId (de la URL)", appId)
  log("user.id", user?.id ?? "NO HAY SESIÓN")
  log("user.email", user?.email ?? "—")

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  log("SUPABASE_URL existe", !!url)
  log("SERVICE_ROLE_KEY existe", !!key)
  log("SERVICE_ROLE_KEY longitud", key?.length ?? 0)

  try {
    if (key) {
      const part = key.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")
      const payload = JSON.parse(Buffer.from(part, "base64").toString())
      log("ROL EMBEBIDO EN LA KEY (debe decir service_role)", payload.role)
    }
  } catch {
    log("no pude decodificar la KEY", "—")
  }

  const { createClient: createAdmin } = await import("@supabase/supabase-js")
  const admin = createAdmin(url!, key!)

  const { data: app, error: appErr } = await admin
    .from("applications")
    .select("id, status, company_id")
    .eq("id", appId)
    .single()
  log("applications -> encontrada", !!app)
  log("applications -> error", appErr?.message ?? "ninguno")
  log("applications -> company_id", app?.company_id ?? "—")

  let membership: unknown = null
  let memErr: { message: string } | null = null
  if (app && user) {
    const r = await admin
      .from("company_users")
      .select("id")
      .eq("company_id", app.company_id)
      .eq("user_id", user.id)
      .single()
    membership = r.data
    memErr = r.error
  }
  log("company_users -> membresía encontrada", !!membership)
  log("company_users -> error", memErr?.message ?? "ninguno")

  let docsCount: number | null = null
  let docsErr: { message: string } | null = null
  if (app) {
    const r = await admin
      .from("documents")
      .select("id")
      .eq("application_id", appId)
    docsCount = r.data?.length ?? null
    docsErr = r.error
  }
  log("documents -> cantidad", docsCount ?? "—")
  log("documents -> error", docsErr?.message ?? "ninguno")

  return (
    <div
      style={{
        padding: 24,
        fontFamily: "monospace",
        fontSize: 14,
        whiteSpace: "pre-wrap",
        lineHeight: 1.7,
      }}
    >
      <h1 style={{ fontWeight: 700, marginBottom: 12, fontSize: 18 }}>
        Diagnóstico /documents
      </h1>
      {lines.map((l, i) => (
        <div key={i}>{l}</div>
      ))}
    </div>
  )
}
