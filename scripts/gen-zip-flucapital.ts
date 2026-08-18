import { createClient } from "@supabase/supabase-js"
import JSZip from "jszip"
import * as dotenv from "dotenv"
import { resolve } from "path"
import { writeFileSync } from "fs"

dotenv.config({ path: resolve("/Users/alejandrosantibanez8/projects/PayefyKYC", ".env.local") })

const APP_ID = "1c33dae5-54d0-487f-98bb-da3dcdced11c"
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function main() {
  const { data: docRows, error } = await admin
    .from("documents")
    .select("storage_path, file_name, document_templates(name)")
    .eq("application_id", APP_ID)
    .not("storage_path", "is", null)
  if (error) { console.error(error); process.exit(1) }
  console.log(`Documentos con archivo: ${docRows?.length ?? 0}`)

  const zip = new JSZip()
  const usedNames = new Map<string, number>()
  let added = 0
  for (const doc of docRows ?? []) {
    if (!doc.storage_path || !doc.file_name) continue
    const { data: blob } = await admin.storage.from("kyc-documents").download(doc.storage_path)
    if (!blob) { console.warn("  ⚠ falló:", doc.storage_path); continue }
    const tmplName = (doc.document_templates as unknown as { name: string } | null)?.name ?? doc.file_name
    const ext = doc.file_name.split(".").pop() ?? "pdf"
    const safeName = tmplName.replace(/[/\\:*?"<>|]/g, "_").trim()
    const count = (usedNames.get(safeName) ?? 0) + 1
    usedNames.set(safeName, count)
    const finalName = count > 1 ? `${safeName} (${count}).${ext}` : `${safeName}.${ext}`
    zip.file(finalName, await blob.arrayBuffer())
    console.log("  ✓", finalName)
    added++
  }
  const buf = await zip.generateAsync({ type: "nodebuffer" })
  const out = "/Users/alejandrosantibanez8/Desktop/expediente_FluCapital SC.zip"
  writeFileSync(out, buf)
  console.log(`\nZIP: ${added} archivos, ${Math.round(buf.length / 1024)} KB → ${out}`)
}
main().catch((e) => { console.error(e); process.exit(1) })
