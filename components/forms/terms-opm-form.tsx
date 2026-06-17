"use client"

import { useState } from "react"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { termsOpmSchema, type TermsOpmValues } from "@/lib/validations/terms-opm"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface Props {
  appId: string
  defaultCompanyName?: string
}

export function TermsOpmForm({ appId, defaultCompanyName }: Props) {
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)

  const form = useForm<TermsOpmValues>({
    resolver: zodResolver(termsOpmSchema),
    defaultValues: {
      company_legal_name: defaultCompanyName ?? "",
      signer_full_name: "",
      signing_date: new Date().toISOString().slice(0, 10),
    },
  })

  async function onSubmit(data: TermsOpmValues) {
    setSubmitting(true)
    setServerError(null)
    try {
      const res = await fetch("/api/pdf/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "terms_opm",
          applicationId: appId,
          formData: data,
        }),
      })
      const json = await res.json()
      if (!res.ok || json.error) {
        setServerError(json.error ?? "Error al generar el documento")
      } else {
        setSuccess(true)
        setDownloadUrl(json.downloadUrl ?? null)
      }
    } catch {
      setServerError("Error de conexión")
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="space-y-4">
        <Alert>
          <AlertDescription>
            ✅ El documento fue generado y guardado en tu expediente.
          </AlertDescription>
        </Alert>
        <p className="text-sm text-muted-foreground">
          Descárgalo, imprímelo, fírmalo a mano, escanéalo y súbelo firmado en
          el expediente.
        </p>
        <div className="flex gap-3">
          {downloadUrl && (
            <a
              href={downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ variant: "outline" })}
            >
              Descargar T&C OPM (.docx)
            </a>
          )}
          <Link
            href={`/applications/${appId}/documents`}
            className={buttonVariants({ variant: "default" })}
          >
            Regresar al expediente
          </Link>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      {serverError && (
        <Alert variant="destructive">
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      )}

      <p className="text-sm text-muted-foreground">
        Captura los datos del firmante. El documento se genera pre-llenado con el
        texto completo de los Términos y Condiciones de OPM — solo necesitas
        descargarlo, imprimirlo y firmarlo.
      </p>

      <div className="space-y-2">
        <Label htmlFor="company_legal_name">Razón social de la empresa</Label>
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
        <Label htmlFor="signer_full_name">Nombre completo del representante legal</Label>
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
        <Label htmlFor="signing_date">Fecha de firma</Label>
        <Input
          id="signing_date"
          type="date"
          {...form.register("signing_date")}
        />
        {form.formState.errors.signing_date && (
          <p className="text-xs text-destructive">
            {form.formState.errors.signing_date.message}
          </p>
        )}
      </div>

      <div className="flex gap-3">
        <Link
          href={`/applications/${appId}/documents`}
          className={buttonVariants({ variant: "outline" })}
        >
          Cancelar
        </Link>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Generando documento…" : "Generar T&C OPM"}
        </Button>
      </div>
    </form>
  )
}
