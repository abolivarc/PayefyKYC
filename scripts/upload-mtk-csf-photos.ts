#!/usr/bin/env tsx
/**
 * Actualiza el expediente de Terminales de CALIFICADORA DE RECURSOS MTK
 * como si el cliente lo hubiera subido por el portal:
 *
 *   1. CSF 09/2026  → reemplaza el archivo del slot tax_situation_certificate
 *                     (misma fila, status → pending_review; igual que
 *                     app/api/documents/[id]/upload/route.ts).
 *   2. 2 fotos del establecimiento → filas nuevas de business_photos
 *                     (mismo patrón que addExtraDocument + upload del portal).
 *
 * Las fotos aprobadas existentes NO se tocan. No se envían correos ni se
 * escribe audit_logs (el portal tampoco lo hace en este flujo).
 *
 * Ejecutar:
 *   npx tsx scripts/upload-mtk-csf-photos.ts                 # dry-run
 *   DRY_RUN=false npx tsx scripts/upload-mtk-csf-photos.ts   # real
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import * as fs from "fs"
import * as path from "path"
import * as dotenv from "dotenv"

const DRY_RUN = process.env.DRY_RUN !== "false"

const BUCKET = "kyc-documents"
const COMPANY_ID = "06a9e1c4-b223-433b-ae60-28650e622ffc" // CALIFICADORA DE RECURSOS MTK SRL DE CV
const APPLICATION_ID = "02a7a561-5605-4558-8972-3d081fc4a8bb" // producto terminals
const CLIENT_UPLOADER_ID = "011bbfa0-f8d5-4dad-a648-562f3ff6db59" // perfil que subió todo el expediente

const CSF_DOCUMENT_ID = "550a94a5-be35-4f17-8c3a-fe497cbd993a" // slot tax_situation_certificate
const PHOTOS_TEMPLATE_ID = "ee90310e-0ba2-41b2-b681-b20eb3000ffb" // business_photos

const CSF_FILE = "/Users/alejandrosantibanez8/Downloads/MTK_CSF_09_2026.pdf"
const PHOTO_FILES = [
  "/Users/alejandrosantibanez8/Downloads/PHOTO-2026-09-04-11-54-10.jpg",
  "/Users/alejandrosantibanez8/Downloads/PHOTO-2026-09-04-11-54-11.jpg",
]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = SupabaseClient<any, "public", any>

const sb = (): AnyClient => {
  dotenv.config({ path: path.join(process.cwd(), ".env.local") })
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error("❌  NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY no están en .env.local")
    process.exit(1)
  }
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

// Réplica del efecto de POST /api/documents/[id]/upload (subida del cliente)
async function uploadAsClient(
  client: AnyClient,
  documentId: string,
  localFile: string,
  mime: string
) {
  const fileName = path.basename(localFile)
  const storagePath = `${COMPANY_ID}/${APPLICATION_ID}/${documentId}/${fileName}`
  const size = fs.statSync(localFile).size

  console.log(`   → ${fileName} (${size.toLocaleString()} bytes)`)
  console.log(`     storage: ${storagePath}`)

  if (DRY_RUN) return

  const { error: upErr } = await client.storage
    .from(BUCKET)
    .upload(storagePath, fs.readFileSync(localFile), { contentType: mime, upsert: true })
  if (upErr) throw new Error(`Storage upload falló (${fileName}): ${upErr.message}`)

  const { error: dbErr } = await client
    .from("documents")
    .update({
      storage_path: storagePath,
      file_name: fileName,
      file_size: size,
      mime_type: mime,
      status: "pending_review",
      uploaded_by: CLIENT_UPLOADER_ID,
      uploaded_at: new Date().toISOString(),
    })
    .eq("id", documentId)
  if (dbErr) throw new Error(`UPDATE documents falló (${documentId}): ${dbErr.message}. OJO: el archivo YA quedó en Storage en ${storagePath}`)
}

async function main() {
  console.log(`\n─── upload-mtk-csf-photos [${DRY_RUN ? "DRY-RUN" : "⚡ REAL"}] ───\n`)

  for (const f of [CSF_FILE, ...PHOTO_FILES]) {
    if (!fs.existsSync(f)) {
      console.error(`❌  No existe el archivo local: ${f}`)
      process.exit(1)
    }
  }

  const client = sb()

  // Sanity check: el slot de CSF sigue siendo el esperado
  const { data: csfRow, error: csfErr } = await client
    .from("documents")
    .select("id, status, file_name, application_id")
    .eq("id", CSF_DOCUMENT_ID)
    .single()
  if (csfErr || !csfRow || csfRow.application_id !== APPLICATION_ID) {
    console.error("❌  El slot de CSF no coincide con lo esperado:", csfErr?.message ?? csfRow)
    process.exit(1)
  }
  console.log(`✔  Slot CSF actual: "${csfRow.file_name}" (status ${csfRow.status})`)

  // 1) CSF: reemplaza el archivo del slot existente
  console.log(`\n1) CSF 09/2026 → slot ${CSF_DOCUMENT_ID}`)
  await uploadAsClient(client, CSF_DOCUMENT_ID, CSF_FILE, "application/pdf")

  // 2) Fotos: fila nueva de business_photos por cada foto
  for (const photo of PHOTO_FILES) {
    console.log(`\n2) Foto nueva de business_photos`)
    let newDocId = "(dry-run: se crearía)"
    if (!DRY_RUN) {
      const { data: doc, error } = await client
        .from("documents")
        .insert({
          application_id: APPLICATION_ID,
          template_id: PHOTOS_TEMPLATE_ID,
          status: "pending_upload",
        })
        .select("id")
        .single()
      if (error || !doc) throw new Error(`INSERT documents falló: ${error?.message}`)
      newDocId = doc.id as string
      await uploadAsClient(client, newDocId, photo, "image/jpeg")
    } else {
      console.log(`   fila nueva → template business_photos, luego:`)
      await uploadAsClient(client, "«nuevo-doc-id»", photo, "image/jpeg")
    }
  }

  if (DRY_RUN) {
    console.log(`\n─── DRY-RUN completo — no se escribió nada. DRY_RUN=false para ejecutar. ───\n`)
    return
  }

  // Verificación
  const { data: verify } = await client
    .from("documents")
    .select("id, status, file_name, uploaded_at, template_id")
    .eq("application_id", APPLICATION_ID)
    .in("template_id", [PHOTOS_TEMPLATE_ID, "a3af4aad-6744-43a1-926f-9603efef4418"])
    .order("uploaded_at", { ascending: true })
  console.log(`\n✔  Estado final de CSF + fotos:`)
  console.table(verify ?? [])
  console.log(`\n✅ Listo — documentos en pending_review, como subida del cliente.\n`)
}

main().catch((err) => {
  console.error("❌  Error:", err.message ?? err)
  process.exit(1)
})
