import { createClient } from "@supabase/supabase-js"
import JSZip from "jszip"
import { Resend } from "resend"
import * as dotenv from "dotenv"
import { resolve } from "path"
import { writeFileSync } from "fs"

dotenv.config({ path: resolve(process.cwd(), ".env.local") })

const APP_ID = "1c33dae5-54d0-487f-98bb-da3dcdced11c"
const COMPANY_NAME = "FluCapital SC"

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const resend = new Resend(process.env.RESEND_API_KEY!)
const from = "Payefy <a.santibanez@payefy.me>"

async function main() {
  console.log("Descargando documentos de", COMPANY_NAME, "…")

  const { data: docRows, error } = await admin
    .from("documents")
    .select("storage_path, file_name, document_templates(name)")
    .eq("application_id", APP_ID)
    .not("storage_path", "is", null)

  if (error) {
    console.error("Error al obtener docs:", error)
    process.exit(1)
  }

  console.log(`Encontrados ${docRows?.length ?? 0} documentos con archivo`)

  const zip = new JSZip()
  let added = 0

  for (const doc of docRows ?? []) {
    if (!doc.storage_path || !doc.file_name) continue
    const { data: blob } = await admin.storage
      .from("kyc-documents")
      .download(doc.storage_path)
    if (!blob) {
      console.warn("  ⚠ No se pudo descargar:", doc.storage_path)
      continue
    }
    const arrayBuf = await blob.arrayBuffer()
    const templateName =
      (doc.document_templates as unknown as { name: string } | null)?.name ??
      doc.file_name
    const ext = doc.file_name.split(".").pop() ?? "pdf"
    const safeName = templateName.replace(/[/\\:*?"<>|]/g, "_").trim()
    zip.file(`${safeName}.${ext}`, arrayBuf)
    console.log("  ✓", safeName + "." + ext)
    added++
  }

  if (added === 0) {
    console.error("No hay documentos para comprimir")
    process.exit(1)
  }

  console.log(`\nGenerando ZIP (${added} archivos)…`)
  const zipBase64 = await zip.generateAsync({ type: "base64" })
  console.log(`ZIP listo (${Math.round(zipBase64.length * 0.75 / 1024)} KB aprox)`)

  const safeCompany = COMPANY_NAME.replace(/[/\\:*?"<>|]/g, "_").trim()

  console.log("\nEnviando correo a francisco.sosa@payefy.me…")
  const { data, error: emailError } = await resend.emails.send({
    from,
    to: "a.santibanez@payefy.me",
    subject: `[PayefyKYC] Nuevo expediente Tarjetas: ${COMPANY_NAME}`,
    html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;"><div style="background:#004238;padding:20px 24px;border-radius:8px 8px 0 0;"><span style="font-weight:800;font-size:18px;color:#AEFF99;">payefy</span></div><div style="border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 8px 8px;"><h2 style="color:#004238;">Nuevo expediente listo para transferencia</h2><p>Hola Francisco,</p><p>La empresa <strong>${COMPANY_NAME}</strong> ha completado su expediente de <strong>Tarjetas</strong>. Se adjunta el ZIP con los 19 documentos.</p><p style="color:#9ca3af;font-size:11px;">Payefy · Correo generado automáticamente.</p></div></div>`,
    attachments: [{ filename: `expediente_${safeCompany}.zip`, content: zipBase64 }],
  })

  if (emailError) {
    console.error("Error al enviar:", emailError)
    // Guardar ZIP en disco como fallback
    const zipPath = `/Users/alejandrosantibanez8/Desktop/expediente_${safeCompany}.zip`
    writeFileSync(zipPath, Buffer.from(zipBase64, "base64"))
    console.log("ZIP guardado en Desktop como fallback:", zipPath)
    process.exit(1)
  }

  console.log("✅ Correo enviado a francisco.sosa@payefy.me. ID:", data?.id)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
