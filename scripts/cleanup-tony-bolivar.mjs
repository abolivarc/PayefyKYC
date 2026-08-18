/**
 * ONE-OFF: limpieza total de la cuenta de prueba de Antonio "Tony" Bolívar
 * Ejecutar con DRY_RUN=false solo cuando el usuario lo autorice explícitamente.
 *
 *   node scripts/cleanup-tony-bolivar.mjs            # dry-run (no borra nada)
 *   DRY_RUN=false node scripts/cleanup-tony-bolivar.mjs  # borrado real
 */

import { readFileSync } from "fs"
import { createClient } from "@supabase/supabase-js"

// ── 0. Config ─────────────────────────────────────────────────────────────────

const DRY = process.env.DRY_RUN !== "false"

const USER_ID   = "891488e2-2b49-4376-a8ce-e49047324f3b"
const EMAIL     = "antonio.bolivar@payefy.me"
const COMPANY   = "96eaa591-bcc7-4687-a987-18a292e1a75b"
const APP_IDS   = [
  "a1c4c56f-8de4-4dcb-977c-121c7563fc60",
  "595ce0eb-dbf9-4b22-9558-f09d0a650fcc",
]
const BUCKETS   = ["kyc-documents", "generated-pdfs"]

// ── 1. Load env ───────────────────────────────────────────────────────────────

let SUPABASE_URL, SERVICE_KEY
try {
  const env = readFileSync(".env.local", "utf8")
  for (const line of env.split("\n")) {
    const [k, ...rest] = line.split("=")
    const v = rest.join("=").trim()
    if (k?.trim() === "NEXT_PUBLIC_SUPABASE_URL") SUPABASE_URL = v
    if (k?.trim() === "SUPABASE_SERVICE_ROLE_KEY") SERVICE_KEY = v
  }
} catch {
  console.error("No se pudo leer .env.local. Ejecuta desde la raíz del proyecto.")
  process.exit(1)
}

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY no encontrados en .env.local")
  process.exit(1)
}

// ── 2. Verificar que la key es service_role ───────────────────────────────────

function verifyServiceRoleKey(key) {
  // Formato nuevo Supabase: sb_secret_... = service_role, sb_publishable_... = anon
  if (key.startsWith("sb_secret_")) {
    console.log("✓ Key en formato nuevo Supabase (sb_secret_*) — confirmado service_role")
    return true
  }
  if (key.startsWith("sb_publishable_")) {
    console.error("✗ ABORT: La key es sb_publishable_ (anon key). Usa SUPABASE_SERVICE_ROLE_KEY.")
    return false
  }
  // Formato legacy: JWT eyJ...
  if (key.startsWith("eyJ")) {
    try {
      const payload = JSON.parse(Buffer.from(key.split(".")[1], "base64url").toString("utf8"))
      if (payload.role !== "service_role") {
        console.error(`✗ ABORT: JWT claim role="${payload.role}" !== "service_role"`)
        return false
      }
      console.log(`✓ JWT verificado — role="${payload.role}"`)
      return true
    } catch (e) {
      console.error("✗ ABORT: No se pudo decodificar el JWT:", e.message)
      return false
    }
  }
  console.error("✗ ABORT: Formato de key desconocido. No se puede verificar el rol.")
  return false
}

if (!verifyServiceRoleKey(SERVICE_KEY)) process.exit(1)

// ── 3. Crear cliente admin ────────────────────────────────────────────────────

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ── Helper para log dry/real ──────────────────────────────────────────────────

function log(msg) { console.log(msg) }
function section(title) { console.log(`\n${"─".repeat(60)}\n${title}\n${"─".repeat(60)}`) }

async function safeDelete(table, filterKey, filterValues, label) {
  const count = filterValues.length
  if (count === 0) { log(`  ${label}: 0 filas (nada que borrar)`); return 0 }
  if (DRY) {
    log(`  [DRY] ${label}: borraría ${count} registro(s) con ${filterKey} ∈ [${filterValues.join(", ")}]`)
    return count
  }
  const { error, count: deleted } = await admin.from(table).delete({ count: "exact" }).in(filterKey, filterValues)
  if (error) { log(`  ✗ ERROR borrando ${label}: ${error.message}`); return -1 }
  log(`  ✓ ${label}: ${deleted ?? "?"} fila(s) eliminadas`)
  return deleted ?? 0
}

async function safeDeleteEq(table, filterKey, filterValue, label) {
  if (DRY) {
    log(`  [DRY] ${label}: borraría filas donde ${filterKey} = ${filterValue}`)
    return
  }
  const { error } = await admin.from(table).delete().eq(filterKey, filterValue)
  if (error) log(`  ✗ ERROR borrando ${label}: ${error.message}`)
  else log(`  ✓ ${label}: eliminado`)
}

// ── 4. Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n${"═".repeat(60)}`)
  console.log(`  cleanup-tony-bolivar — ${DRY ? "DRY RUN (solo lectura)" : "⚠️  BORRADO REAL"}`)
  console.log(`${"═".repeat(60)}`)

  // ── 4a. PROTECCIÓN ANTI-COLATERAL ────────────────────────────────────────

  section("PROTECCIÓN ANTI-COLATERAL")

  const { data: company } = await admin
    .from("companies")
    .select("id, legal_name, created_by")
    .eq("id", COMPANY)
    .single()

  if (!company) {
    log("  ⚠️  Empresa no encontrada — puede que ya haya sido eliminada.")
  } else {
    log(`  Empresa: ${company.legal_name} (id=${company.id})`)
    if (company.created_by !== USER_ID) {
      console.error(`  ✗ ABORT: companies.created_by="${company.created_by}" ≠ USER_ID="${USER_ID}"`)
      console.error("  No se toca nada. Revisa los IDs.")
      process.exit(1)
    }
    log(`  ✓ created_by === USER_ID`)
  }

  const { data: coUsers } = await admin
    .from("company_users")
    .select("user_id")
    .eq("company_id", COMPANY)

  const otherUsers = (coUsers ?? []).filter((cu) => cu.user_id !== USER_ID)
  if (otherUsers.length > 0) {
    console.error(`  ✗ ABORT: La empresa tiene otros usuarios vinculados:`)
    for (const cu of otherUsers) console.error(`    user_id=${cu.user_id}`)
    console.error("  No se toca nada.")
    process.exit(1)
  }
  log(`  ✓ Sin otros usuarios en company_users`)

  // ── 4b. RECOPILAR RUTAS DE STORAGE ───────────────────────────────────────

  section("STORAGE — recopilando rutas")

  const storagePaths = { "kyc-documents": new Set(), "generated-pdfs": new Set() }

  // documents.storage_path
  const { data: docs } = await admin
    .from("documents")
    .select("storage_path")
    .in("application_id", APP_IDS)
    .not("storage_path", "is", null)

  for (const d of docs ?? []) {
    if (d.storage_path) storagePaths["kyc-documents"].add(d.storage_path)
  }
  log(`  documents.storage_path: ${docs?.length ?? 0} archivos`)

  // form_submissions
  const { data: forms } = await admin
    .from("form_submissions")
    .select("generated_pdf_path, signed_pdf_path")
    .in("application_id", APP_IDS)

  for (const f of forms ?? []) {
    if (f.generated_pdf_path) storagePaths["generated-pdfs"].add(f.generated_pdf_path)
    if (f.signed_pdf_path) storagePaths["kyc-documents"].add(f.signed_pdf_path)
  }
  log(`  form_submissions paths: ${forms?.length ?? 0} registros`)

  // application_contracts
  const { data: contracts } = await admin
    .from("application_contracts")
    .select("signed_doc_path")
    .in("application_id", APP_IDS)
    .not("signed_doc_path", "is", null)

  for (const c of contracts ?? []) {
    if (c.signed_doc_path) storagePaths["kyc-documents"].add(c.signed_doc_path)
  }
  log(`  application_contracts.signed_doc_path: ${contracts?.length ?? 0}`)

  // product_orders
  const { data: orders } = await admin
    .from("product_orders")
    .select("invoice_path")
    .eq("company_id", COMPANY)
    .not("invoice_path", "is", null)

  for (const o of orders ?? []) {
    if (o.invoice_path) storagePaths["kyc-documents"].add(o.invoice_path)
  }
  log(`  product_orders.invoice_path: ${orders?.length ?? 0}`)

  // Listar prefijos de carpeta (barrer huérfanos)
  const prefixes = [
    ...APP_IDS.map((id) => `${id}/`),
    `${COMPANY}/`,
    ...APP_IDS.flatMap((id) => [`contracts/${id}/`]),
  ]

  for (const bucket of BUCKETS) {
    for (const prefix of prefixes) {
      const { data: listed } = await admin.storage.from(bucket).list(prefix.replace(/\/$/, ""), {
        limit: 500, offset: 0,
      })
      for (const f of listed ?? []) {
        if (f.name && !f.id?.endsWith("/")) {
          storagePaths[bucket].add(`${prefix}${f.name}`)
        }
      }
    }
  }

  log(`\n  Archivos a borrar en storage:`)
  for (const bucket of BUCKETS) {
    const paths = [...storagePaths[bucket]]
    log(`\n  [${bucket}] (${paths.length} archivos)`)
    if (paths.length === 0) {
      log("    (ninguno)")
    } else {
      for (const p of paths) log(`    • ${p}`)
    }
  }

  // ── 4c. RESUMEN DB ────────────────────────────────────────────────────────

  section("BASE DE DATOS — conteo de filas a eliminar")

  async function count(table, key, values) {
    const { count: n } = await admin.from(table).select("*", { count: "exact", head: true }).in(key, values)
    return n ?? 0
  }
  async function countEq(table, key, value) {
    const { count: n } = await admin.from(table).select("*", { count: "exact", head: true }).eq(key, value)
    return n ?? 0
  }

  const counts = {
    audit_logs_actor:     await countEq("audit_logs", "actor_id", USER_ID),
    audit_logs_entity_app: await count("audit_logs", "entity_id", APP_IDS),
    audit_logs_entity_co: await countEq("audit_logs", "entity_id", COMPANY),
    notifications_recip:  await countEq("notifications", "recipient_id", USER_ID),
    notifications_app:    await count("notifications", "related_application_id", APP_IDS),
    app_comments:         await count("application_comments", "application_id", APP_IDS),
    form_submissions:     await count("form_submissions", "application_id", APP_IDS),
    documents:            await count("documents", "application_id", APP_IDS),
    app_contracts:        await count("application_contracts", "application_id", APP_IDS),
    product_orders:       await countEq("product_orders", "company_id", COMPANY),
    applications:         await countEq("applications", "company_id", COMPANY),
    company_users:        await countEq("company_users", "company_id", COMPANY),
    companies:            await countEq("companies", "id", COMPANY),
    profiles:             await countEq("profiles", "id", USER_ID),
  }

  for (const [k, v] of Object.entries(counts)) {
    log(`  ${k.padEnd(28)} ${v} fila(s)`)
  }

  const totalStorage = BUCKETS.reduce((s, b) => s + storagePaths[b].size, 0)
  log(`\n  Total storage paths:          ${totalStorage}`)

  if (DRY) {
    section("DRY RUN completo — no se borró nada")
    log("  Para ejecutar el borrado real: DRY_RUN=false node scripts/cleanup-tony-bolivar.mjs")
    return
  }

  // ── 5. BORRADO REAL ───────────────────────────────────────────────────────

  section("BORRADO REAL — orden hijos → padres")

  // 5a. Storage
  log("\n  [1] Storage")
  for (const bucket of BUCKETS) {
    const paths = [...storagePaths[bucket]]
    if (paths.length === 0) { log(`  ${bucket}: nada`); continue }
    const { error } = await admin.storage.from(bucket).remove(paths)
    if (error) log(`  ✗ ${bucket}: ${error.message}`)
    else log(`  ✓ ${bucket}: ${paths.length} archivo(s) eliminados`)
  }

  // 5b. audit_logs
  log("\n  [2] audit_logs")
  await safeDeleteEq("audit_logs", "actor_id", USER_ID, "audit_logs (actor)")
  await safeDelete("audit_logs", "entity_id", [...APP_IDS, COMPANY], "audit_logs (entity)")

  // 5c. notifications
  log("\n  [3] notifications")
  await safeDeleteEq("notifications", "recipient_id", USER_ID, "notifications (recipient)")
  await safeDelete("notifications", "related_application_id", APP_IDS, "notifications (app)")

  // 5d. application_comments
  log("\n  [4] application_comments")
  await safeDelete("application_comments", "application_id", APP_IDS, "application_comments")

  // 5e. form_submissions
  log("\n  [5] form_submissions")
  await safeDelete("form_submissions", "application_id", APP_IDS, "form_submissions")

  // 5f. documents
  log("\n  [6] documents")
  await safeDelete("documents", "application_id", APP_IDS, "documents")

  // 5g. application_contracts
  log("\n  [7] application_contracts")
  await safeDelete("application_contracts", "application_id", APP_IDS, "application_contracts")

  // 5h. product_orders
  log("\n  [8] product_orders")
  await safeDeleteEq("product_orders", "company_id", COMPANY, "product_orders")

  // 5i. applications
  log("\n  [9] applications")
  await safeDeleteEq("applications", "company_id", COMPANY, "applications")

  // 5j. company_users
  log("\n  [10] company_users")
  await safeDeleteEq("company_users", "company_id", COMPANY, "company_users (by company)")
  await safeDeleteEq("company_users", "user_id", USER_ID, "company_users (by user)")

  // 5k. companies
  log("\n  [11] companies")
  await safeDeleteEq("companies", "id", COMPANY, "companies")

  // 5l. profiles
  log("\n  [12] profiles")
  await safeDeleteEq("profiles", "id", USER_ID, "profiles")

  // 5m. auth.users (Admin API)
  log("\n  [13] auth.users")
  const { error: authErr } = await admin.auth.admin.deleteUser(USER_ID)
  if (authErr) log(`  ✗ auth.deleteUser: ${authErr.message}`)
  else log(`  ✓ auth.deleteUser: OK`)

  // ── 6. VERIFICACIÓN FINAL ─────────────────────────────────────────────────

  section("VERIFICACIÓN FINAL")

  const checks = [
    { label: "companies",         n: await countEq("companies", "id", COMPANY) },
    { label: "applications",      n: await countEq("applications", "company_id", COMPANY) },
    { label: "documents",         n: await count("documents", "application_id", APP_IDS) },
    { label: "company_users",     n: await countEq("company_users", "company_id", COMPANY) },
    { label: "profiles",          n: await countEq("profiles", "id", USER_ID) },
    { label: "notifications",     n: await countEq("notifications", "recipient_id", USER_ID) },
    { label: "form_submissions",  n: await count("form_submissions", "application_id", APP_IDS) },
    { label: "application_contracts", n: await count("application_contracts", "application_id", APP_IDS) },
  ]

  const { data: deletedUser } = await admin.auth.admin.getUserById(USER_ID)
  const authGone = !deletedUser?.user

  let allClean = authGone
  for (const c of checks) {
    const ok = c.n === 0
    log(`  ${ok ? "✓" : "✗"} ${c.label.padEnd(28)} ${c.n} fila(s) restantes`)
    if (!ok) allClean = false
  }
  log(`  ${authGone ? "✓" : "✗"} auth.users                   ${authGone ? "eliminado" : "AÚN EXISTE"}`)

  console.log(`\n${"═".repeat(60)}`)
  if (allClean) {
    console.log("  ✅  LIMPIEZA OK — cuenta eliminada completamente")
  } else {
    console.log("  ⚠️  LIMPIEZA INCOMPLETA — ver detalles arriba")
  }
  console.log(`${"═".repeat(60)}\n`)
}

main().catch((e) => {
  console.error("Error inesperado:", e)
  process.exit(1)
})
