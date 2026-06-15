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
