"use client"

import { useRef, useState } from "react"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { termsOpmSchema, type TermsOpmValues } from "@/lib/validations/terms-opm"
import { uploadDocumentFile } from "@/lib/documents/upload"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface Props {
  appId: string
  documentId: string
  initialFileName?: string | null
  defaultCompanyName?: string
}

export function TermsAndConditionsForm({
  appId,
  documentId,
  initialFileName,
  defaultCompanyName,
}: Props) {
  const [generating, setGenerating] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)
  const [generated, setGenerated] = useState(false)

  const [uploading, setUploading] = useState(false)
  const [uploadedName, setUploadedName] = useState<string | null>(initialFileName ?? null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const form = useForm<TermsOpmValues>({
    resolver: zodResolver(termsOpmSchema),
    defaultValues: {
      company_legal_name: defaultCompanyName ?? "",
      signer_full_name: "",
      signing_date: new Date().toISOString().slice(0, 10),
    },
  })

  async function handleGenerate(data: TermsOpmValues) {
    setGenerating(true)
    setGenerateError(null)
    try {
      const res = await fetch("/api/pdf/terms-and-conditions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const json = await res.json()
        setGenerateError(json.error ?? "Error al generar el documento")
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      const safeName = data.company_legal_name
        .replace(/[^a-zA-Z0-9\s]/g, "")
        .trim()
        .replace(/\s+/g, "_")
      a.href = url
      a.download = `terminos_condiciones_${safeName}.docx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      setGenerated(true)
    } catch {
      setGenerateError("Error de conexión")
    } finally {
      setGenerating(false)
    }
  }

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
    <div className="space-y-6">
      {/* Banner de estado */}
      {uploadedName ? (
        <Alert>
          <AlertDescription>
            ✅ Documento firmado subido correctamente. El documento está en revisión.
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
              Requiere documento firmado
            </p>
            <p className="text-sm" style={{ color: "#92400E" }}>
              Sube el documento firmado si ya lo tienes, o genera uno pre-llenado para imprimirlo y firmarlo.
            </p>
          </div>
        </div>
      )}

      {/* Opción A — Subir firmado (primero, más común) */}
      <div
        className="rounded-xl border-2 p-4 space-y-3"
        style={uploadedName ? { borderColor: "#1f7a4d" } : { borderColor: "#004238" }}
      >
        <p className="text-sm font-semibold">
          Opción A — Subir documento firmado y escaneado
          {!uploadedName && (
            <span style={{ color: "#B45309" }}> (requerido para completar)</span>
          )}
        </p>
        <p className="text-sm text-muted-foreground">
          Si ya tienes el documento firmado (PDF, foto o escaneo), súbelo aquí directamente.
        </p>

        {uploadedName ? (
          <p className="text-sm font-medium" style={{ color: "#047857" }}>
            ✅ {uploadedName}
          </p>
        ) : (
          <>
            <input
              ref={fileRef}
              type="file"
              accept="*"
              className="hidden"
              onChange={handleUpload}
            />
            <Button disabled={uploading} onClick={() => fileRef.current?.click()}>
              {uploading ? "Subiendo…" : "Subir documento firmado"}
            </Button>
          </>
        )}

        {uploadError && (
          <p className="text-xs text-destructive">{uploadError}</p>
        )}
      </div>

      {/* Opción B — Generar pre-llenado */}
      <div className="rounded-xl border p-4 space-y-4">
        <div>
          <p className="text-sm font-semibold">Opción B — Generar y descargar pre-llenado</p>
          <p className="text-sm text-muted-foreground">
            Captura los datos, descarga el documento con los datos ya integrados, imprímelo, fírmalo y súbelo arriba.
          </p>
        </div>

        {generateError && (
          <Alert variant="destructive">
            <AlertDescription>{generateError}</AlertDescription>
          </Alert>
        )}
        {generated && (
          <Alert>
            <AlertDescription>
              ✅ Documento descargado. Imprímelo, fírmalo y súbelo en la sección de arriba.
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={form.handleSubmit(handleGenerate)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="company_legal_name">Razón social</Label>
            <Input
              id="company_legal_name"
              {...form.register("company_legal_name")}
              placeholder="Empresa Ejemplo S.A. de C.V."
            />
            {form.formState.errors.company_legal_name && (
              <p className="text-xs text-destructive">
                {form.formState.errors.company_legal_name.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="signer_full_name">Nombre del representante legal</Label>
            <Input
              id="signer_full_name"
              {...form.register("signer_full_name")}
              placeholder="Nombre Apellido Apellido"
            />
            {form.formState.errors.signer_full_name && (
              <p className="text-xs text-destructive">
                {form.formState.errors.signer_full_name.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="signing_date">Fecha</Label>
            <Input id="signing_date" type="date" {...form.register("signing_date")} />
          </div>

          <Button type="submit" variant="outline" disabled={generating}>
            {generating ? "Generando…" : "Generar y descargar (.docx)"}
          </Button>
        </form>
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
