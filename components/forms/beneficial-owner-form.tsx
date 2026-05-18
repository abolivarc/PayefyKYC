"use client"

import { useState } from "react"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  beneficialOwnerSchema,
  type BeneficialOwnerValues,
} from "@/lib/validations/beneficial-owner"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface Props {
  appId: string
}

export function BeneficialOwnerForm({ appId }: Props) {
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)

  const form = useForm<BeneficialOwnerValues>({
    resolver: zodResolver(beneficialOwnerSchema),
    defaultValues: { has_beneficial_owner: false },
  })

  const hasBeneficialOwner = form.watch("has_beneficial_owner")

  async function onSubmit(data: BeneficialOwnerValues) {
    setSubmitting(true)
    setServerError(null)
    try {
      const res = await fetch("/api/pdf/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "beneficial_owner",
          applicationId: appId,
          formData: data,
        }),
      })
      const json = await res.json()
      if (!res.ok || json.error) {
        setServerError(json.error ?? "Error al generar el PDF")
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
            ✅ Tu PDF ha sido generado y guardado en tu expediente.
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
              Descargar PDF
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

      {/* Datos de la empresa */}
      <section className="space-y-3">
        <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
          Datos de la empresa
        </h3>
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
          <Label htmlFor="company_tax_id">RFC</Label>
          <Input
            id="company_tax_id"
            {...form.register("company_tax_id")}
            placeholder="EJE900101ABC"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="company_address">Domicilio fiscal</Label>
          <Input
            id="company_address"
            {...form.register("company_address")}
            placeholder="Av. Principal 123, Col. Centro, CDMX"
          />
        </div>
      </section>

      {/* Toggle beneficiario */}
      <section className="space-y-3">
        <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
          Beneficiario Controlador
        </h3>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            {...form.register("has_beneficial_owner")}
            className="h-4 w-4 rounded border-input"
          />
          <span className="text-sm">
            ¿La empresa cuenta con Beneficiario Controlador identificable?
          </span>
        </label>

        {!hasBeneficialOwner && (
          <p className="text-sm text-muted-foreground rounded-lg bg-slate-50 p-3">
            La empresa declara que no cuenta con un beneficiario controlador
            identificable conforme al Art. 32-B Ter del CFF.
          </p>
        )}

        {hasBeneficialOwner && (
          <div className="space-y-3 pl-2 border-l-2 border-primary/20">
            <div className="space-y-2">
              <Label htmlFor="owner_full_name">Nombre completo del beneficiario</Label>
              <Input id="owner_full_name" {...form.register("owner_full_name")} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="owner_rfc">RFC</Label>
                <Input id="owner_rfc" {...form.register("owner_rfc")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="owner_curp">CURP</Label>
                <Input id="owner_curp" {...form.register("owner_curp")} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="owner_country">País de residencia</Label>
                <Input
                  id="owner_country"
                  {...form.register("owner_country")}
                  placeholder="México"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="owner_control_percentage">% de control</Label>
                <Input
                  id="owner_control_percentage"
                  {...form.register("owner_control_percentage")}
                  placeholder="51"
                />
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Firmante */}
      <section className="space-y-3">
        <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
          Representante legal firmante
        </h3>
        <div className="space-y-2">
          <Label htmlFor="signer_full_name">Nombre completo</Label>
          <Input id="signer_full_name" {...form.register("signer_full_name")} />
          {form.formState.errors.signer_full_name && (
            <p className="text-xs text-destructive">
              {form.formState.errors.signer_full_name.message}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="signer_position">Cargo</Label>
          <Input
            id="signer_position"
            {...form.register("signer_position")}
            placeholder="Representante Legal"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="signing_place">Lugar de firma</Label>
            <Input
              id="signing_place"
              {...form.register("signing_place")}
              placeholder="Ciudad de México"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="signing_date">Fecha de firma</Label>
            <Input
              id="signing_date"
              type="date"
              {...form.register("signing_date")}
            />
          </div>
        </div>
      </section>

      <div className="flex gap-3">
        <Link
          href={`/applications/${appId}/documents`}
          className={buttonVariants({ variant: "outline" })}
        >
          Cancelar
        </Link>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Generando PDF..." : "Generar constancia"}
        </Button>
      </div>
    </form>
  )
}
