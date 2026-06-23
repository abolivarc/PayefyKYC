"use client"

import { useRef, useState } from "react"
import Link from "next/link"
import { uploadDocumentFile } from "@/lib/documents/upload"
import { Button, buttonVariants } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface Props {
  appId: string
  documentId: string
  templateUrl?: string | null
  initialFileName?: string | null
}

export function TermsAndConditionsForm({ appId, documentId, templateUrl, initialFileName }: Props) {
  const [uploading, setUploading] = useState(false)
  const [uploadedName, setUploadedName] = useState<string | null>(initialFileName ?? null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadError(null)
    setUploading(true)
    const result = await uploadDocumentFile(documentId, file)
    setUploading(false)
    if (!result.success) {
      setUploadError(result.error ?? "Error al subir el archivo")
    } else {
      setUploadedName(file.name)
    }
  }

  return (
    <div className="space-y-5">
      {uploadedName ? (
        <Alert>
          <AlertDescription>
            ✅ Términos y condiciones firmados subidos correctamente. El documento está en revisión.
          </AlertDescription>
        </Alert>
      ) : (
        <div
          className="rounded-xl border-2 px-4 py-3 flex gap-3 items-start"
          style={{ borderColor: "#F59E0B", background: "#FFFBEB" }}
        >
          <span style={{ fontSize: 20, lineHeight: 1.4 }}>⚠️</span>
          <div>
            <p className="text-sm font-semibold" style={{ color: "#92400E" }}>
              Este documento aún NO está validado
            </p>
            <p className="text-sm" style={{ color: "#92400E" }}>
              Descarga los términos y condiciones, fírmalos y sube la copia firmada para que cuente como entregado.
            </p>
          </div>
        </div>
      )}

      {/* Paso 1 – Descargar */}
      <div className="rounded-xl border p-4 space-y-2">
        <p className="text-sm font-semibold">Paso 1 — Descarga, imprime y firma</p>
        <p className="text-sm text-muted-foreground">
          Abre el documento, imprímelo, fírmalo a mano con tinta y escanéalo o fótografialo.
        </p>
        {templateUrl ? (
          <a
            href={templateUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Descargar TYC (.pdf)
          </a>
        ) : (
          <p className="text-xs text-muted-foreground italic">
            Solicita el documento a tu gestor de cuenta.
          </p>
        )}
      </div>

      {/* Paso 2 – Subir firmado */}
      <div
        className="rounded-xl border-2 p-4 space-y-2"
        style={uploadedName ? {} : { borderColor: "#F59E0B" }}
      >
        <p className="text-sm font-semibold">
          Paso 2 — Sube la versión firmada{" "}
          {!uploadedName && (
            <span style={{ color: "#B45309" }}>(requerido para completar)</span>
          )}
        </p>
        <p className="text-sm text-muted-foreground">
          Sube el PDF o imagen del documento ya firmado.
        </p>

        {uploadedName ? (
          <p className="text-sm font-medium" style={{ color: "#047857" }}>✅ {uploadedName}</p>
        ) : (
          <>
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleUpload}
            />
            <Button
              size="sm"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
            >
              {uploading ? "Subiendo…" : "Subir TYC firmado"}
            </Button>
          </>
        )}

        {uploadError && (
          <p className="text-xs text-destructive">{uploadError}</p>
        )}
      </div>

      <Link
        href={`/applications/${appId}/documents`}
        className={buttonVariants({ variant: "outline" })}
      >
        Regresar al expediente
      </Link>
    </div>
  )
}
