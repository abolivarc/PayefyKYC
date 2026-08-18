#!/usr/bin/env tsx
/**
 * Adjunta la Declaración Anual 2025 de ASP (tax_declaration) al expediente
 * "ATENCIÓN A LA SALUD PALACE" en Supabase Storage y actualiza la casilla.
 *
 * Dry-run (default): valida todo y muestra lo que haría sin escribir nada.
 * Real:              sube el archivo, actualiza documents, inserta en audit_logs.
 *
 * Ejecutar:
 *   npx tsx scripts/upload-tax-declaration-asp.ts          # dry-run
 *   DRY_RUN=false npx tsx scripts/upload-tax-declaration-asp.ts   # real
 */
import { createClient } from "@supabase/supabase-js"
import * as fs from "fs"
import * as path from "path"
import * as dotenv from "dotenv"

// ── Config ───────────────────────────────────────────────────────────────────
const DRY_RUN = process.env.DRY_RUN !== "false"

const LOCAL_FILE = "/Users/alejandrosantibanez8/Downloads/02 Declaracion ASP Anual 2025 (1).pdf"
const FILE_NAME_READABLE = "Declaración Anual del Ejercicio 2025 - ATENCION A LA SALUD PALACE.pdf"
const MIME_TYPE = "application/pdf"
const UPLOADER_EMAIL = "a.santibanez@payefy.me"

const BUCKET = "kyc-documents"
const COMPANY_ID = "024bd6f7-0731-45e2-8c9f-c07c17e44479"
const APPLICATION_ID = "bccb3eeb-c976-473e-9853-5a67562421fa"
const DOCUMENT_ID = "394b6e87-bc92-4c99-b812-724c7c845d2c"

// ── Inline sanitizer (same logic as lib/documents/storage-path.ts) ───────────
function sanitizeStorageKey(name: string): string {
  return (
    name
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .normalize("NFC")
      .replace(/[^A-Za-z0-9._-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 200)
    || "documento"
  )
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n${"─".repeat(60)}`)
  console.log(`  upload-tax-declaration-asp  [${DRY_RUN ? "DRY-RUN" : "⚡ REAL"}]`)
  console.log(`${"─".repeat(60)}\n`)

  // Load env
  dotenv.config({ path: path.join(process.cwd(), ".env.local") })
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    console.error("❌  NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not found in .env.local")
    process.exit(1)
  }

  const sb = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // ── 1. Verify local file ──────────────────────────────────────────────────
  if (!fs.existsSync(LOCAL_FILE)) {
    console.error(`❌  LOCAL_FILE not found:\n    ${LOCAL_FILE}`)
    process.exit(1)
  }
  const fileBytes = fs.statSync(LOCAL_FILE).size
  console.log(`✔  Local file:  ${LOCAL_FILE}`)
  console.log(`   Size:        ${fileBytes.toLocaleString()} bytes`)
  console.log(`   MIME:        ${MIME_TYPE}`)
  console.log(`   DB name:     ${FILE_NAME_READABLE}`)

  // ── 2. Resolve uploader profile ───────────────────────────────────────────
  // listUsers (page 1, 1000 max) then filter client-side — fine for a one-off script
  const { data: usersPage, error: listErr } = await sb.auth.admin.listUsers({ page: 1, perPage: 1000 })
  if (listErr) {
    console.error(`❌  auth.admin.listUsers failed:`, listErr.message)
    process.exit(1)
  }
  const uploaderUser = usersPage.users.find((u) => u.email === UPLOADER_EMAIL)
  if (!uploaderUser) {
    console.error(`❌  No auth user found with email "${UPLOADER_EMAIL}"`)
    process.exit(1)
  }
  const uploaderId = uploaderUser.id
  console.log(`\n✔  Uploader:    ${UPLOADER_EMAIL}`)
  console.log(`   profile id:  ${uploaderId}`)

  // ── 3. Verify document row ────────────────────────────────────────────────
  const { data: doc, error: docErr } = await sb
    .from("documents")
    .select("id, status, storage_path, file_name, version")
    .eq("id", DOCUMENT_ID)
    .single()

  if (docErr || !doc) {
    console.error(`❌  Document not found (id=${DOCUMENT_ID}):`, docErr?.message)
    process.exit(1)
  }

  console.log(`\n✔  Document row found:`)
  console.log(`   status:       ${doc.status}`)
  console.log(`   storage_path: ${doc.storage_path ?? "NULL"}`)
  console.log(`   file_name:    ${doc.file_name ?? "NULL"}`)
  console.log(`   version:      ${doc.version}`)

  // Guard: abort if already has a file (additive rule)
  if (doc.storage_path !== null) {
    console.error(`\n🛑  ABORT — storage_path is not NULL: "${doc.storage_path}"`)
    console.error(`   The document already has a file. Refusing to overwrite (additive-only rule).`)
    process.exit(1)
  }

  if (doc.status !== "pending_upload") {
    console.warn(`⚠️   status is "${doc.status}" (expected "pending_upload") — proceeding anyway`)
  }

  // ── 4. Build storage key ──────────────────────────────────────────────────
  const originalFileName = path.basename(LOCAL_FILE)
  const sanitizedName    = sanitizeStorageKey(originalFileName)
  const storageKey       = `${COMPANY_ID}/${APPLICATION_ID}/${DOCUMENT_ID}/${Date.now()}-${sanitizedName}`

  console.log(`\n✔  Storage key calculation:`)
  console.log(`   original filename: ${originalFileName}`)
  console.log(`   sanitized:         ${sanitizedName}`)
  console.log(`   full key:          ${storageKey}`)

  // ── 5. Preview DB writes ──────────────────────────────────────────────────
  const now = new Date().toISOString()
  const documentUpdate = {
    storage_path: storageKey,
    file_name:    FILE_NAME_READABLE,
    file_size:    fileBytes,
    mime_type:    MIME_TYPE,
    status:       "pending_review",
    uploaded_by:  uploaderId,
    uploaded_at:  now,
    updated_at:   now,
  }
  const auditInsert = {
    actor_id:    uploaderId,
    action:      "document_uploaded",
    entity_type: "document",
    entity_id:   DOCUMENT_ID,
    metadata: {
      file_name:       FILE_NAME_READABLE,
      file_size:       fileBytes,
      storage_key:     storageKey,
      application_id:  APPLICATION_ID,
      uploader_email:  UPLOADER_EMAIL,
      via:             "admin-script",
    },
  }

  console.log(`\n✔  Planned UPDATE on documents:`)
  console.log(JSON.stringify(documentUpdate, null, 4))
  console.log(`\n✔  Planned INSERT into audit_logs:`)
  console.log(JSON.stringify(auditInsert, null, 4))

  if (DRY_RUN) {
    console.log(`\n${"─".repeat(60)}`)
    console.log(`  DRY-RUN complete — nothing was written.`)
    console.log(`  Run with DRY_RUN=false to execute for real.`)
    console.log(`${"─".repeat(60)}\n`)
    return
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  REAL EXECUTION
  // ══════════════════════════════════════════════════════════════════════════

  // Upload file
  console.log(`\n⬆  Uploading to Storage...`)
  const fileBuffer = fs.readFileSync(LOCAL_FILE)
  const { error: uploadErr } = await sb.storage
    .from(BUCKET)
    .upload(storageKey, fileBuffer, {
      contentType: MIME_TYPE,
      upsert: false,
    })

  if (uploadErr) {
    console.error(`❌  Storage upload failed:`, uploadErr.message)
    process.exit(1)
  }
  console.log(`✔  File uploaded to Storage.`)

  // Update document row
  const { error: updateErr } = await sb
    .from("documents")
    .update(documentUpdate)
    .eq("id", DOCUMENT_ID)

  if (updateErr) {
    console.error(`❌  documents UPDATE failed:`, updateErr.message)
    console.error(`   ⚠  File IS already in Storage at key: ${storageKey}`)
    process.exit(1)
  }
  console.log(`✔  documents row updated.`)

  // Insert audit log
  const { error: auditErr } = await sb
    .from("audit_logs")
    .insert(auditInsert)

  if (auditErr) {
    console.warn(`⚠️  audit_logs insert failed (non-fatal):`, auditErr.message)
  } else {
    console.log(`✔  audit_logs row inserted.`)
  }

  // ── Verification query ───────────────────────────────────────────────────
  console.log(`\n✔  Verification — SELECT from documents:\n`)
  const { data: verify, error: verifyErr } = await sb
    .from("documents")
    .select("id, status, file_name, file_size, storage_path, uploaded_at")
    .eq("id", DOCUMENT_ID)
    .single()

  if (verifyErr || !verify) {
    console.error(`❌  Verification query failed:`, verifyErr?.message)
  } else {
    console.table([verify])
  }

  console.log(`\n${"─".repeat(60)}`)
  console.log(`  ✅ Done — document is now pending_review.`)
  console.log(`${"─".repeat(60)}\n`)
}

main().catch((err) => {
  console.error("Unhandled error:", err)
  process.exit(1)
})
