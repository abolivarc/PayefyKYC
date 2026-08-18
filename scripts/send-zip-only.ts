/**
 * Envía el ZIP de FluCapital que ya está en Desktop.
 * Solo necesita RESEND_API_KEY en el entorno.
 * Uso: RESEND_API_KEY=re_xxx npx tsx scripts/send-zip-only.ts
 */
import { Resend } from "resend"
import { readFileSync } from "fs"
import { resolve } from "path"

const ZIP_PATH = resolve(
  process.env.HOME ?? "/Users/alejandrosantibanez8",
  "Desktop/expediente_FluCapital SC.zip"
)
const TO = "a.santibanez@payefy.me"
const FROM = "Payefy <a.santibanez@payefy.me>"

const apiKey = process.env.RESEND_API_KEY
if (!apiKey) {
  console.error("Falta RESEND_API_KEY. Úsalo así:")
  console.error("  RESEND_API_KEY=re_xxx npx tsx scripts/send-zip-only.ts")
  process.exit(1)
}

const resend = new Resend(apiKey)

async function main() {
  console.log("Leyendo ZIP desde:", ZIP_PATH)
  const zipBuffer = readFileSync(ZIP_PATH)
  const zipBase64 = zipBuffer.toString("base64")
  console.log(`ZIP: ${Math.round(zipBuffer.length / 1024)} KB`)

  console.log(`Enviando a ${TO}…`)
  const { data, error } = await resend.emails.send({
    from: FROM,
    to: TO,
    subject: "[PayefyKYC] Prueba — Expediente FluCapital SC",
    html: "<p>Prueba de envío. Adjunto el expediente ZIP de <strong>FluCapital SC</strong>.</p>",
    attachments: [{ filename: "expediente_FluCapital_SC.zip", content: zipBase64 }],
  })

  if (error) {
    console.error("Error:", error)
    process.exit(1)
  }
  console.log("✅ Enviado. ID:", data?.id)
}

main().catch((e) => { console.error(e); process.exit(1) })
