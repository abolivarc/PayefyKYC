"use client"

import { useRef, useState } from "react"
import { ImagePlus, X } from "lucide-react"
import type { ChangeImageInput } from "@/lib/documents/change-request-images"
import {
  MAX_CHANGE_IMAGES,
  MAX_CHANGE_IMAGE_BYTES,
} from "@/lib/documents/change-request-images"

interface Props {
  images: ChangeImageInput[]
  onChange: (images: ChangeImageInput[]) => void
  disabled?: boolean
}

/**
 * Selector de capturas para una solicitud de cambios. Convierte a base64 en
 * el navegador (son capturas chicas) y muestra miniaturas con opción de quitar.
 */
export function ChangeImagesPicker({ images, onChange, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return
    setError(null)

    const next = [...images]
    for (const file of Array.from(files)) {
      if (next.length >= MAX_CHANGE_IMAGES) {
        setError(`Máximo ${MAX_CHANGE_IMAGES} imágenes`)
        break
      }
      if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
        setError("Solo imágenes PNG, JPG o WebP")
        continue
      }
      if (file.size > MAX_CHANGE_IMAGE_BYTES) {
        setError(`${file.name} pesa más de 5 MB`)
        continue
      }
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () =>
          resolve((reader.result as string).split(",")[1] ?? "")
        reader.onerror = () => reject(reader.error)
        reader.readAsDataURL(file)
      })
      next.push({ name: file.name, type: file.type, base64 })
    }
    onChange(next)
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        multiple
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files)
          e.target.value = ""
        }}
      />

      {images.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {images.map((img, i) => (
            <div key={i} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`data:${img.type};base64,${img.base64}`}
                alt={img.name}
                className="h-16 w-16 rounded-md border border-border object-cover"
              />
              <button
                type="button"
                aria-label={`Quitar ${img.name}`}
                onClick={() => onChange(images.filter((_, j) => j !== i))}
                disabled={disabled}
                className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-foreground text-background shadow"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {images.length < MAX_CHANGE_IMAGES && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
          className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <ImagePlus className="h-3.5 w-3.5" />
          Adjuntar captura {images.length > 0 && `(${images.length}/${MAX_CHANGE_IMAGES})`}
        </button>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
