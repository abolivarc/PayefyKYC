"use client"

import { useState } from "react"
import Link from "next/link"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  complementaryInfoSchema,
  type ComplementaryInfoValues,
} from "@/lib/validations/complementary-info"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Textarea } from "@/components/ui/textarea"

interface Props {
  appId: string
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground border-b pb-1 mb-3">
      {children}
    </h3>
  )
}

export function ComplementaryInfoForm({ appId }: Props) {
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const form = useForm<ComplementaryInfoValues>({
    resolver: zodResolver(complementaryInfoSchema),
    defaultValues: {
      shareholders: [{ full_name: "", rfc: "", curp: "", percentage: "", is_pep: false }],
      legal_representatives: [{ full_name: "", rfc: "", curp: "", percentage: "", is_pep: false }],
      administrators: [{ full_name: "", rfc: "", position: "" }],
      main_clients: [],
      main_suppliers: [],
      no_sanctions: false,
      no_terrorism: false,
    },
  })

  const { fields: shareholders, append: addShareholder, remove: removeShareholder } =
    useFieldArray({ control: form.control, name: "shareholders" })

  const { fields: legalReps, append: addLegalRep, remove: removeLegalRep } =
    useFieldArray({ control: form.control, name: "legal_representatives" })

  const { fields: admins, append: addAdmin, remove: removeAdmin } =
    useFieldArray({ control: form.control, name: "administrators" })

  const { fields: clients, append: addClient, remove: removeClient } =
    useFieldArray({ control: form.control, name: "main_clients" })

  const { fields: suppliers, append: addSupplier, remove: removeSupplier } =
    useFieldArray({ control: form.control, name: "main_suppliers" })

  async function onSubmit(data: ComplementaryInfoValues) {
    setSubmitting(true)
    setServerError(null)
    try {
      const res = await fetch("/api/pdf/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "complementary_info",
          applicationId: appId,
          formData: data,
        }),
      })
      const json = await res.json()
      if (!res.ok || json.error) {
        setServerError(json.error ?? "Error al guardar el formulario")
      } else {
        setSuccess(true)
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
            ✅ Formulario guardado. El archivo Excel ha sido generado y subido a
            tu expediente.
          </AlertDescription>
        </Alert>
        <Link
          href={`/applications/${appId}/documents`}
          className={buttonVariants({ variant: "default" })}
        >
          Regresar al expediente
        </Link>
      </div>
    )
  }

  const err = form.formState.errors

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
      {serverError && (
        <Alert variant="destructive">
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      )}

      {/* ── Sección 1: Empresa ── */}
      <section className="space-y-3">
        <SectionTitle>1. Datos de la empresa</SectionTitle>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="legal_name">Razón social</Label>
            <Input id="legal_name" {...form.register("legal_name")} />
            {err.legal_name && <p className="text-xs text-destructive">{err.legal_name.message}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="tax_id">RFC</Label>
            <Input id="tax_id" {...form.register("tax_id")} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="tax_regime">Régimen fiscal</Label>
            <Input id="tax_regime" {...form.register("tax_regime")} placeholder="Ej. 601 - General de Ley" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="business_activity">Actividad principal</Label>
            <Input id="business_activity" {...form.register("business_activity")} />
          </div>
        </div>
        <div className="space-y-1">
          <Label htmlFor="business_description">Descripción del negocio</Label>
          <Textarea
            id="business_description"
            {...form.register("business_description")}
            placeholder="Describe a qué se dedica la empresa"
          />
        </div>
        <div className="grid sm:grid-cols-3 gap-3">
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="address_street">Calle</Label>
            <Input id="address_street" {...form.register("address_street")} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="address_number">Número</Label>
            <Input id="address_number" {...form.register("address_number")} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="address_colonia">Colonia</Label>
            <Input id="address_colonia" {...form.register("address_colonia")} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="address_city">Ciudad / Municipio</Label>
            <Input id="address_city" {...form.register("address_city")} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="address_state">Estado</Label>
            <Input id="address_state" {...form.register("address_state")} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="address_zip">Código Postal</Label>
            <Input id="address_zip" {...form.register("address_zip")} maxLength={5} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="phone">Teléfono</Label>
            <Input id="phone" {...form.register("phone")} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="email">Correo electrónico</Label>
            <Input id="email" type="email" {...form.register("email")} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="website">Sitio web (opcional)</Label>
            <Input id="website" {...form.register("website")} placeholder="https://" />
          </div>
        </div>
      </section>

      {/* ── Sección 2: Accionistas ── */}
      <section className="space-y-3">
        <SectionTitle>2. Accionistas (25% o más de participación)</SectionTitle>
        {shareholders.map((field, i) => (
          <div key={field.id} className="rounded-lg border p-3 space-y-2 relative">
            <p className="text-xs font-medium text-muted-foreground">Accionista #{i + 1}</p>
            <div className="grid sm:grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label>Nombre completo</Label>
                <Input {...form.register(`shareholders.${i}.full_name`)} />
              </div>
              <div className="space-y-1">
                <Label>RFC</Label>
                <Input {...form.register(`shareholders.${i}.rfc`)} />
              </div>
              <div className="space-y-1">
                <Label>CURP</Label>
                <Input {...form.register(`shareholders.${i}.curp`)} maxLength={18} />
              </div>
              <div className="space-y-1">
                <Label>% Participación</Label>
                <Input {...form.register(`shareholders.${i}.percentage`)} placeholder="25" />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" {...form.register(`shareholders.${i}.is_pep`)} />
              Persona Políticamente Expuesta (PEP)
            </label>
            {shareholders.length > 1 && (
              <button
                type="button"
                onClick={() => removeShareholder(i)}
                className="absolute top-2 right-2 text-xs text-destructive hover:underline"
              >
                Quitar
              </button>
            )}
          </div>
        ))}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => addShareholder({ full_name: "", rfc: "", curp: "", percentage: "", is_pep: false })}
        >
          + Agregar accionista
        </Button>
      </section>

      {/* ── Sección 3: Representantes legales ── */}
      <section className="space-y-3">
        <SectionTitle>3. Representantes legales</SectionTitle>
        {legalReps.map((field, i) => (
          <div key={field.id} className="rounded-lg border p-3 space-y-2 relative">
            <p className="text-xs font-medium text-muted-foreground">Rep. legal #{i + 1}</p>
            <div className="grid sm:grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label>Nombre completo</Label>
                <Input {...form.register(`legal_representatives.${i}.full_name`)} />
              </div>
              <div className="space-y-1">
                <Label>RFC</Label>
                <Input {...form.register(`legal_representatives.${i}.rfc`)} />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label>CURP</Label>
                <Input {...form.register(`legal_representatives.${i}.curp`)} maxLength={18} />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" {...form.register(`legal_representatives.${i}.is_pep`)} />
              Persona Políticamente Expuesta (PEP)
            </label>
            {legalReps.length > 1 && (
              <button
                type="button"
                onClick={() => removeLegalRep(i)}
                className="absolute top-2 right-2 text-xs text-destructive hover:underline"
              >
                Quitar
              </button>
            )}
          </div>
        ))}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => addLegalRep({ full_name: "", rfc: "", curp: "", percentage: "", is_pep: false })}
        >
          + Agregar representante
        </Button>
      </section>

      {/* ── Sección 4: Administradores ── */}
      <section className="space-y-3">
        <SectionTitle>4. Administradores</SectionTitle>
        {admins.map((field, i) => (
          <div key={field.id} className="rounded-lg border p-3 space-y-2 relative">
            <p className="text-xs font-medium text-muted-foreground">Administrador #{i + 1}</p>
            <div className="grid sm:grid-cols-3 gap-2">
              <div className="space-y-1 sm:col-span-1">
                <Label>Nombre completo</Label>
                <Input {...form.register(`administrators.${i}.full_name`)} />
              </div>
              <div className="space-y-1">
                <Label>RFC</Label>
                <Input {...form.register(`administrators.${i}.rfc`)} />
              </div>
              <div className="space-y-1">
                <Label>Cargo</Label>
                <Input {...form.register(`administrators.${i}.position`)} placeholder="Director General" />
              </div>
            </div>
            {admins.length > 1 && (
              <button
                type="button"
                onClick={() => removeAdmin(i)}
                className="absolute top-2 right-2 text-xs text-destructive hover:underline"
              >
                Quitar
              </button>
            )}
          </div>
        ))}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => addAdmin({ full_name: "", rfc: "", position: "" })}
        >
          + Agregar administrador
        </Button>
      </section>

      {/* ── Sección 5: Principales clientes ── */}
      <section className="space-y-3">
        <SectionTitle>5. Principales clientes (opcional)</SectionTitle>
        {clients.map((field, i) => (
          <div key={field.id} className="flex gap-2 items-start">
            <Input placeholder="Nombre" {...form.register(`main_clients.${i}.name`)} />
            <Input placeholder="País" {...form.register(`main_clients.${i}.country`)} className="w-28" />
            <Input placeholder="% ventas" {...form.register(`main_clients.${i}.sales_percentage`)} className="w-24" />
            <Button type="button" variant="ghost" size="sm" onClick={() => removeClient(i)}>
              ✕
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => addClient({ name: "", country: "", sales_percentage: "" })}
        >
          + Agregar cliente
        </Button>
      </section>

      {/* ── Sección 6: Principales proveedores ── */}
      <section className="space-y-3">
        <SectionTitle>6. Principales proveedores (opcional)</SectionTitle>
        {suppliers.map((field, i) => (
          <div key={field.id} className="flex gap-2 items-start">
            <Input placeholder="Nombre" {...form.register(`main_suppliers.${i}.name`)} />
            <Input placeholder="País" {...form.register(`main_suppliers.${i}.country`)} className="w-28" />
            <Input placeholder="% compras" {...form.register(`main_suppliers.${i}.purchase_percentage`)} className="w-24" />
            <Button type="button" variant="ghost" size="sm" onClick={() => removeSupplier(i)}>
              ✕
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => addSupplier({ name: "", country: "", purchase_percentage: "" })}
        >
          + Agregar proveedor
        </Button>
      </section>

      {/* ── Sección 7: Declaraciones ── */}
      <section className="space-y-3">
        <SectionTitle>7. Declaraciones</SectionTitle>
        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            {...form.register("no_sanctions")}
            className="mt-0.5 h-4 w-4"
          />
          <span>
            La empresa y sus accionistas/representantes <strong>NO</strong> están
            sujetos a sanciones internacionales (OFAC, ONU, UE).
          </span>
        </label>
        {err.no_sanctions && (
          <p className="text-xs text-destructive">{err.no_sanctions.message}</p>
        )}
        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            {...form.register("no_terrorism")}
            className="mt-0.5 h-4 w-4"
          />
          <span>
            La empresa <strong>NO</strong> tiene relación con actividades de
            financiamiento al terrorismo.
          </span>
        </label>
        {err.no_terrorism && (
          <p className="text-xs text-destructive">{err.no_terrorism.message}</p>
        )}
        <div className="grid sm:grid-cols-2 gap-3 pt-2">
          <div className="space-y-1">
            <Label htmlFor="declaration_place">Lugar de firma</Label>
            <Input
              id="declaration_place"
              {...form.register("declaration_place")}
              placeholder="Ciudad de México"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="declaration_date">Fecha</Label>
            <Input
              id="declaration_date"
              type="date"
              {...form.register("declaration_date")}
            />
          </div>
        </div>
      </section>

      <div className="flex gap-3 pt-2">
        <Link
          href={`/applications/${appId}/documents`}
          className={buttonVariants({ variant: "outline" })}
        >
          Cancelar
        </Link>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Guardando..." : "Guardar y generar Excel"}
        </Button>
      </div>
    </form>
  )
}
