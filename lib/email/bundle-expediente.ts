import { createClient as createAdminClient } from "@supabase/supabase-js"
import JSZip from "jszip"

export async function bundleExpediente(
  applicationId: string
): Promise<{ filename: string; base64: string }> {
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: docs } = await admin
    .from("documents")
    .select(
      "storage_path, file_name, document_templates(name, code, is_form)"
    )
    .eq("application_id", applicationId)
    .not("storage_path", "is", null)

  const zip = new JSZip()
  let added = 0

  for (const doc of docs ?? []) {
    if (!doc.storage_path) continue
    const tmpl = (doc.document_templates as unknown) as {
      name: string
      code: string
      is_form: boolean
    } | null
    if (tmpl?.is_form && !doc.storage_path.endsWith(".xlsx") && !doc.storage_path.endsWith(".pdf")) continue

    const buckets = ["kyc-documents", "generated-pdfs"]
    let downloaded = false
    for (const bucket of buckets) {
      const { data, error } = await admin.storage
        .from(bucket)
        .download(doc.storage_path)
      if (error || !data) continue

      const ext = doc.file_name?.split(".").pop() ?? doc.storage_path.split(".").pop() ?? "pdf"
      const safeName = (tmpl?.name ?? doc.file_name ?? `doc_${added}`)
        .replace(/[^a-zA-Z0-9_\-. ]/g, "_")
        .slice(0, 60)
      const uniqueName = added === 0 ? `${safeName}.${ext}` : `${safeName}_${added}.${ext}`

      zip.file(uniqueName, await data.arrayBuffer())
      added++
      downloaded = true
      break
    }
    if (!downloaded) continue
  }

  const base64 = await zip.generateAsync({ type: "base64" })
  const shortId = applicationId.replace(/-/g, "").slice(0, 8)
  return {
    filename: `expediente_${shortId}.zip`,
    base64,
  }
}

// ── Adjunto o enlace, según el peso ────────────────────────────────────────
// Resend rechaza correos de más de 40 MB (contenido + adjuntos codificados).
// Sobre ese umbral el ZIP se sube a storage y el correo lleva un botón de
// descarga con URL firmada a 30 días.
const MAX_ADJUNTO_BYTES = 24 * 1024 * 1024 // ~24 MB crudos ≈ 32 MB en base64

export async function zipDeliverable(
  applicationId: string,
  filename: string,
  base64: string
): Promise<
  | { modo: "adjunto"; attachments: { filename: string; content: string }[] }
  | { modo: "enlace"; linkHtml: string; sizeMB: number }
> {
  const rawBytes = Math.floor((base64.length * 3) / 4)
  if (rawBytes <= MAX_ADJUNTO_BYTES) {
    return { modo: "adjunto", attachments: [{ filename, content: base64 }] }
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const path = `expedientes-zip/${applicationId}/${Date.now()}-${filename}`
  const { error: upErr } = await admin.storage
    .from("generated-pdfs")
    .upload(path, Buffer.from(base64, "base64"), { contentType: "application/zip" })
  if (upErr) throw new Error(`No se pudo subir el ZIP para enlace: ${upErr.message}`)

  const { data: signed } = await admin.storage
    .from("generated-pdfs")
    .createSignedUrl(path, 60 * 60 * 24 * 30)
  if (!signed?.signedUrl) throw new Error("No se pudo firmar la URL del ZIP")

  const sizeMB = Math.round(rawBytes / 1024 / 1024)
  const linkHtml = `
    <div style="margin:20px 0;padding:14px 16px;background:#f8faf9;border:1px solid #e5e7eb;border-radius:8px;">
      <p style="margin:0 0 10px;font-size:13px;color:#374151;">
        El expediente pesa ${sizeMB} MB — demasiado para viajar adjunto, así que va como descarga directa
        (enlace válido por 30 días):
      </p>
      <a href="${signed.signedUrl}"
         style="background:#004238;color:#AEFF99;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:700;font-size:14px;display:inline-block;">
        Descargar expediente (${filename}) &rarr;
      </a>
    </div>`
  return { modo: "enlace", linkHtml, sizeMB }
}
