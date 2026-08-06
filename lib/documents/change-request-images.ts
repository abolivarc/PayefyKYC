// Capturas que acompañan una solicitud de cambios.
//
// El revisor adjunta imágenes ("aquí está borroso", "falta esta hoja") y el
// cliente las ve en su portal y en el correo. Viajan como base64 desde el
// navegador (son capturas chicas), se guardan en el bucket kyc-documents bajo
// change-requests/ y al cliente se le muestran con URLs firmadas.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminClient = any

export interface ChangeImageInput {
  /** Nombre original, solo para conservar la extensión */
  name: string
  /** image/png | image/jpeg | image/webp */
  type: string
  /** Contenido en base64, SIN el prefijo data: */
  base64: string
}

export const MAX_CHANGE_IMAGES = 4
export const MAX_CHANGE_IMAGE_BYTES = 5 * 1024 * 1024 // 5 MB por imagen

const ALLOWED = new Set(["image/png", "image/jpeg", "image/webp"])

const EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
}

/** Sube las capturas y devuelve sus rutas en storage. Lanza con mensaje claro. */
export async function uploadChangeImages(
  admin: AdminClient,
  applicationId: string,
  images: ChangeImageInput[]
): Promise<string[]> {
  if (images.length === 0) return []
  if (images.length > MAX_CHANGE_IMAGES) {
    throw new Error(`Máximo ${MAX_CHANGE_IMAGES} imágenes por solicitud de cambios`)
  }

  const paths: string[] = []
  for (const [i, img] of images.entries()) {
    if (!ALLOWED.has(img.type)) {
      throw new Error(`Solo se aceptan imágenes PNG, JPG o WebP (recibí ${img.type || "desconocido"})`)
    }
    const buffer = Buffer.from(img.base64, "base64")
    if (buffer.byteLength === 0) throw new Error("Una de las imágenes llegó vacía")
    if (buffer.byteLength > MAX_CHANGE_IMAGE_BYTES) {
      throw new Error("Cada imagen debe pesar menos de 5 MB")
    }

    const path = `change-requests/${applicationId}/${Date.now()}-${i}.${EXT[img.type]}`
    const { error } = await admin.storage
      .from("kyc-documents")
      .upload(path, buffer, { contentType: img.type })
    if (error) throw new Error(`No se pudo subir la imagen: ${error.message}`)
    paths.push(path)
  }
  return paths
}

/**
 * URLs firmadas para mostrar las capturas (correo y portal del cliente).
 * Un año: el correo queda en la bandeja del cliente y debe seguir abriendo.
 */
export async function signChangeImages(
  admin: AdminClient,
  paths: string[] | null | undefined
): Promise<string[]> {
  if (!paths?.length) return []
  const urls: string[] = []
  for (const path of paths) {
    const { data } = await admin.storage
      .from("kyc-documents")
      .createSignedUrl(path, 60 * 60 * 24 * 365)
    if (data?.signedUrl) urls.push(data.signedUrl)
  }
  return urls
}

/** Bloque <img> para incrustar las capturas en el correo. */
export function imagesEmailBlock(urls: string[]): string {
  if (!urls.length) return ""
  return `
    <div style="margin:16px 0;">
      <p style="margin:0 0 8px;font-size:12px;color:#6b7280;font-weight:bold;">CAPTURAS ADJUNTAS</p>
      ${urls
        .map(
          (u) =>
            `<a href="${u}" target="_blank" style="display:block;margin-bottom:8px;"><img src="${u}" alt="Captura adjunta" style="max-width:100%;border:1px solid #e5e7eb;border-radius:8px;" /></a>`
        )
        .join("")}
    </div>`
}
