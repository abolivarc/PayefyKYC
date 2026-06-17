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
            ✅ Tu constancia ha sido generada y guardada en tu expediente.
          </AlertDescription>
        </Alert>
        <p className="text-sm text-muted-foreground">
          Descárgala, imprímela, fírmala a mano, escanéala y súbela firmada en
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
              Descargar constancia (.docx)
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
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="company_tax_id">RFC de la empresa</Label>
            <Input
              id="company_tax_id"
              {...form.register("company_tax_id")}
              placeholder="EJE900101ABC"
            />
            {form.formState.errors.company_tax_id && (
              <p className="text-xs text-destructive">
                {form.formState.errors.company_tax_id.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="company_address">Domicilio fiscal</Label>
            <Input
              id="company_address"
              {...form.register("company_address")}
              placeholder="Av. Principal 123, Col. Centro, CDMX"
            />
          </div>
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
          <div className="space-y-4 pl-2 border-l-2 border-primary/20">
            {/* Nombre */}
            <div className="space-y-2">
              <Label htmlFor="owner_full_name">Nombre completo</Label>
              <Input id="owner_full_name" {...form.register("owner_full_name")} />
            </div>

            {/* Nacimiento */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="owner_birth_date">Fecha de nacimiento</Label>
                <Input
                  id="owner_birth_date"
                  type="date"
                  {...form.register("owner_birth_date")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="owner_birth_country">País de nacimiento</Label>
                <Input
                  id="owner_birth_country"
                  {...form.register("owner_birth_country")}
                  placeholder="México"
                />
              </div>
            </div>

            {/* Nacionalidad y ocupación */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="owner_nationality">País de nacionalidad</Label>
                <Input
                  id="owner_nationality"
                  {...form.register("owner_nationality")}
                  placeholder="México"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="owner_occupation">Ocupación</Label>
                <Input
                  id="owner_occupation"
                  {...form.register("owner_occupation")}
                  placeholder="Empresario"
                />
              </div>
            </div>

            {/* Domicilio */}
            <div className="space-y-2">
              <Label htmlFor="owner_address">Domicilio completo</Label>
              <Input
                id="owner_address"
                {...form.register("owner_address")}
                placeholder="Calle, número, colonia, ciudad, estado, C.P."
              />
            </div>

            {/* Teléfono y email */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="owner_phone">Número telefónico</Label>
                <Input
                  id="owner_phone"
                  {...form.register("owner_phone")}
                  placeholder="+52 55 1234 5678"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="owner_email">Correo electrónico</Label>
                <Input
                  id="owner_email"
                  type="email"
                  {...form.register("owner_email")}
                  placeholder="nombre@ejemplo.com"
                />
              </div>
            </div>

            {/* CURP y RFC */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="owner_curp">CURP</Label>
                <Input
                  id="owner_curp"
                  {...form.register("owner_curp")}
                  placeholder="AAAA000000HXXXXXX00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="owner_rfc">RFC</Label>
                <Input
                  id="owner_rfc"
                  {...form.register("owner_rfc")}
                  placeholder="AAAA000000XXX"
                />
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Datos de la identificación — solo si hay beneficiario */}
      {hasBeneficialOwner && (
        <section className="space-y-3">
          <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
            Datos de la identificación
          </h3>

          {/* Tipo de documento */}
          <div className="space-y-2">
            <Label>Tipo de documento</Label>
            <div className="flex flex-wrap gap-4">
              {(
                [
                  { value: "credencial", label: "Credencial para votar" },
                  { value: "pasaporte", label: "Pasaporte" },
                  { value: "migratorio", label: "Forma Migratoria" },
                ] as const
              ).map(({ value, label }) => (
                <label key={value} className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="radio"
                    value={value}
                    {...form.register("id_type")}
                    className="h-4 w-4"
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="id_authority">Autoridad que la emite</Label>
              <Input
                id="id_authority"
                {...form.register("id_authority")}
                placeholder="INE, SRE, INM…"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="id_number">Número de identificación</Label>
              <Input
                id="id_number"
                {...form.register("id_number")}
              />
            </div>
          </div>
        </section>
      )}

      {/* Firmante */}
      <section className="space-y-3">
        <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
          Representante legal firmante
        </h3>
        <div className="grid grid-cols-2 gap-3">
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
          {submitting ? "Generando constancia…" : "Generar constancia"}
        </Button>
      </div>
    </form>
  )
}
