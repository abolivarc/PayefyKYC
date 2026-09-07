#!/usr/bin/env tsx
/**
 * Notifica a un contacto interno que hay comercios con expediente listo
 * para avanzar con Terminales. Usa el mismo pipeline de correo de la app
 * (Resend + bitácora email_log vía lib/email/send.ts).
 *
 * Ejecutar:
 *   npx tsx scripts/notify-terminals-ready.ts                 # dry-run (imprime el correo)
 *   DRY_RUN=false npx tsx scripts/notify-terminals-ready.ts   # envía
 */
import * as path from "path"
import * as dotenv from "dotenv"

dotenv.config({ path: path.join(process.cwd(), ".env.local") })

const DRY_RUN = process.env.DRY_RUN !== "false"
const TO = "e.lopez@payefy.me"

const G = "#004238"
const A = "#AEFF99"

const MERCHANTS = [
  { name: "ARANDAS COMPOSTELA SA DE CV", rfc: "ACO200612IT2" },
  { name: "IMPULSO INTERNACIONAL BEKCERR SA DE CV", rfc: "IIB250407DB1" },
]

const subject = "Nuevos comercios listos para Terminales — ARANDAS COMPOSTELA e IMPULSO INTERNACIONAL BEKCERR"

const html = `<!DOCTYPE html><html lang="es"><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#111827;">
  <div style="background:${G};padding:20px 24px;border-radius:8px 8px 0 0;">
    <span style="font-weight:800;font-size:18px;color:${A};letter-spacing:-.5px;font-family:Georgia,serif;">payefy</span>
    <span style="color:rgba(255,255,255,.7);font-size:13px;margin-left:8px;">· Terminales</span>
  </div>
  <div style="border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 8px 8px;">
    <h2 style="color:${G};margin-top:0;">2 nuevos comercios listos para Terminales</h2>
    <p>Hola,</p>
    <p>Te compartimos que los siguientes comercios ya están listos para avanzar con
    el alta de <strong>Terminales</strong>:</p>
    <table style="border-collapse:collapse;width:100%;margin:16px 0;">
      <tr>
        <th style="text-align:left;padding:8px;border:1px solid #e5e7eb;background:#f9fafb;">Comercio</th>
        <th style="text-align:left;padding:8px;border:1px solid #e5e7eb;background:#f9fafb;">RFC</th>
        <th style="text-align:left;padding:8px;border:1px solid #e5e7eb;background:#f9fafb;">Producto</th>
      </tr>
      ${MERCHANTS.map(
        (m) => `<tr>
        <td style="padding:8px;border:1px solid #e5e7eb;"><strong>${m.name}</strong></td>
        <td style="padding:8px;border:1px solid #e5e7eb;">${m.rfc}</td>
        <td style="padding:8px;border:1px solid #e5e7eb;">Terminales</td>
      </tr>`
      ).join("")}
    </table>
    <p>Quedamos atentos para coordinar los siguientes pasos. Cualquier duda o si
    necesitas el expediente de alguno de los dos, responde este correo.</p>
    <p style="margin-bottom:0;">Saludos,<br/><strong>Equipo Payefy</strong></p>
    <p style="color:#9ca3af;font-size:11px;margin-bottom:0;margin-top:24px;">Payefy · Notificación enviada desde PayefyKYC.</p>
  </div>
</body></html>`

async function main() {
  console.log(`\n─── notify-terminals-ready [${DRY_RUN ? "DRY-RUN" : "⚡ ENVÍO REAL"}] ───`)
  console.log(`Para:    ${TO}`)
  console.log(`Asunto:  ${subject}`)
  console.log(`Comercios: ${MERCHANTS.map((m) => m.name).join(" · ")}`)

  if (DRY_RUN) {
    console.log(`\n(dry-run: no se envió nada; DRY_RUN=false para enviar)\n`)
    return
  }

  const { sendEmail } = await import("../lib/email/send")
  const { error } = await sendEmail({ to: TO, subject, html })
  if (error) {
    console.error(`❌  Envío falló: ${error}`)
    process.exit(1)
  }
  console.log(`✅  Correo enviado a ${TO} y registrado en email_log.\n`)
}

main().catch((e) => {
  console.error("Error:", e)
  process.exit(1)
})
