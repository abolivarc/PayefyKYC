export async function uploadDocumentFile(
  documentId: string,
  file: File
): Promise<{ success: boolean; error?: string }> {
  // Step 1: Get a presigned upload URL from our API (tiny request, just auth + DB lookup)
  let signedUrl: string
  let path: string
  try {
    const res = await fetch(`/api/documents/${documentId}/upload-url`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mimeType: file.type, fileSize: file.size, fileName: file.name }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: "Error al preparar la subida" }))
      return { success: false, error: data.error ?? "Error al preparar la subida" }
    }
    const data = await res.json()
    signedUrl = data.signedUrl
    path = data.path
  } catch {
    return { success: false, error: "Error de conexión" }
  }

  // Step 2: Upload directly to Supabase Storage (bypasses Vercel's body size limit)
  try {
    const uploadRes = await fetch(signedUrl, {
      method: "PUT",
      body: file,
      headers: { "Content-Type": file.type },
    })
    if (!uploadRes.ok) {
      return { success: false, error: "Error al subir el archivo al almacenamiento" }
    }
  } catch {
    return { success: false, error: "Error al subir el archivo" }
  }

  // Step 3: Confirm upload — update the document record in the DB
  try {
    const res = await fetch(`/api/documents/${documentId}/confirm-upload`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path, fileName: file.name, fileSize: file.size, mimeType: file.type }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: "Error al confirmar la subida" }))
      return { success: false, error: data.error ?? "Error al confirmar la subida" }
    }
  } catch {
    return { success: false, error: "Error de conexión al confirmar" }
  }

  return { success: true }
}
