"use client"

import type { ExportManifest } from "@/app/(admin)/admin/tracking/export-action"

/**
 * Arma el ZIP del expediente en el navegador a partir del manifiesto que
 * devuelve exportExpediente: baja cada documento directo de storage por su
 * URL firmada, agrega el PDF de datos y el resumen, y dispara la descarga.
 * Sin pasar por el servidor no hay límite de tamaño ni timeout.
 */
export async function downloadExpedienteZip(
  manifest: ExportManifest,
  onProgress?: (hecho: number, total: number) => void
): Promise<void> {
  const { default: JSZip } = await import("jszip")
  const zip = new JSZip()
  const total = manifest.archivos.length
  let hecho = 0
  const fallidos: string[] = []

  // De 4 en 4: suficiente para no serializar, sin saturar la conexión
  const cola = [...manifest.archivos]
  const worker = async () => {
    while (cola.length) {
      const a = cola.shift()!
      try {
        const res = await fetch(a.url)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        zip.file(a.nombre, await res.arrayBuffer())
      } catch {
        fallidos.push(a.nombre)
      }
      hecho++
      onProgress?.(hecho, total)
    }
  }
  await Promise.all(Array.from({ length: Math.min(4, total) }, worker))

  for (const e of manifest.extras) zip.file(e.nombre, e.base64, { base64: true })
  if (fallidos.length) {
    zip.file(
      "ARCHIVOS_NO_DESCARGADOS.txt",
      `No se pudieron descargar ${fallidos.length} archivo(s):\n\n${fallidos.join("\n")}\n`
    )
  }

  // Los PDFs escaneados no comprimen: STORE es más rápido y pesa igual
  const blob = await zip.generateAsync({ type: "blob", compression: "STORE" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = manifest.filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 60_000)

  if (fallidos.length) {
    throw new Error(`${fallidos.length} archivo(s) no se pudieron descargar (ver ARCHIVOS_NO_DESCARGADOS.txt en el ZIP)`)
  }
}
