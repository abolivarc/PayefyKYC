"use client"

import { useState, useRef } from "react"
import Link from "next/link"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  complementaryInfoSchema,
  type ComplementaryInfoValues,
  PARTY_ROLES,
} from "@/lib/validations/complementary-info"
import { createClient } from "@/lib/supabase/client"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Textarea } from "@/components/ui/textarea"

interface Props {
  appId: string
}

function SectionTitle({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
      <span style={{
        width: 28, height: 28, borderRadius: "50%", background: "#004238", color: "#AEFF99",
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        fontSize: 13, fontWeight: 700, flexShrink: 0,
      }}>{n}</span>
      <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#16201b", textTransform: "uppercase", letterSpacing: ".04em" }}>
        {children}
      </h3>
    </div>
  )
}

function FieldErr({ msg }: { msg?: string }) {
  if (!msg) return null
  return <p style={{ fontSize: 11, color: "#a32d2d", marginTop: 3 }}>{msg}</p>
}

// Simple client-side file upload to a named document template slot
async function uploadDocFile(
  appId: string,
  templateCode: string,
  file: File
): Promise<string | null> {
  const supabase = createClient()

  // Find document_template
  const { data: tmpl } = await supabase
    .from("document_templates")
    .select("id")
    .eq("code", templateCode)
    .single()
  if (!tmpl) return `Template "${templateCode}" no encontrado`

  // Find or create document record
  let { data: doc } = await supabase
    .from("documents")
    .select("id")
    .eq("application_id", appId)
    .eq("template_id", tmpl.id)
    .maybeSingle()

  if (!doc) {
    const { data: newDoc, error: insertErr } = await supabase
      .from("documents")
      .insert({ application_id: appId, template_id: tmpl.id, status: "pending_upload" })
      .select("id")
      .single()
    if (insertErr || !newDoc) return insertErr?.message ?? "Error al crear documento"
    doc = newDoc
  }

  const ext = file.name.split(".").pop() ?? "pdf"
  const path = `${appId}/${doc.id}/${templateCode}.${ext}`

  const { error: upErr } = await supabase.storage
    .from("kyc-documents")
    .upload(path, file, { upsert: true })
  if (upErr) return upErr.message

  const { error: updateErr } = await supabase
    .from("documents")
    .update({
      storage_path: path,
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type,
      status: "pending_review",
      uploaded_at: new Date().toISOString(),
    })
    .eq("id", doc.id)

  return updateErr?.message ?? null
}

export function ComplementaryInfoForm({ appId }: Props) {
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [orgFile, setOrgFile] = useState<File | null>(null)
  const [taxFile, setTaxFile] = useState<File | null>(null)
  const orgRef = useRef<HTMLInputElement>(null)
  const taxRef = useRef<HTMLInputElement>(null)

  const form = useForm<ComplementaryInfoValues>({
    resolver: zodResolver(complementaryInfoSchema),
    defaultValues: {
      parties: [{ full_name: "", role: "accionista", rfc: "", curp: "", percentage: "", is_pep: false, pep_details: "" }],
      no_sanctions: false,
      no_terrorism: false,
    },
  })

  const { fields: parties, append: addParty, remove: removeParty } =
    useFieldArray({ control: form.control, name: "parties" })

  async function onSubmit(data: ComplementaryInfoValues) {
    setSubmitting(true)
    setServerError(null)
    try {
      // 1. Generate + upload XLSX
      const res = await fetch("/api/pdf/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "complementary_info", applicationId: appId, formData: data }),
      })
      const json = await res.json()
      if (!res.ok || json.error) {
        setServerError(json.error ?? "Error al guardar el formulario")
        return
      }

      // 2. Upload optional files
      const errs: string[] = []
      if (orgFile) {
        const err = await uploadDocFile(appId, "organigrama", orgFile)
        if (err) errs.push(`Organigrama: ${err}`)
      }
      if (taxFile) {
        const err = await uploadDocFile(appId, "tax_declaration", taxFile)
        if (err) errs.push(`Declaración anual: ${err}`)
      }

      if (errs.length > 0) {
        setServerError(`Formulario guardado, pero hubo errores al subir archivos:\n${errs.join("\n")}`)
        return
      }

      setSuccess(true)
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
            ✅ Formulario guardado. El archivo Excel ha sido generado y subido a tu expediente.
          </AlertDescription>
        </Alert>
        <Link href={`/applications/${appId}/documents`} className={buttonVariants({ variant: "default" })}>
          Regresar al expediente
        </Link>
      </div>
    )
  }

  const err = form.formState.errors
  const watchParties = form.watch("parties")

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10">
      {serverError && (
        <Alert variant="destructive">
          <AlertDescription style={{ whiteSpace: "pre-line" }}>{serverError}</AlertDescription>
        </Alert>
      )}

      {/* ── Sección 1: Empresa ─────────────────────────── */}
      <section>
        <SectionTitle n={1}>Datos de la empresa</SectionTitle>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="legal_name">Razón social</Label>
            <Input id="legal_name" {...form.register("legal_name")} />
            <FieldErr msg={err.legal_name?.message} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="tax_id">RFC de la empresa</Label>
            <Input id="tax_id" {...form.register("tax_id")} placeholder="ABCD800101ABC" className="uppercase" />
            <FieldErr msg={err.tax_id?.message} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="tax_regime">Régimen fiscal</Label>
            <Input id="tax_regime" {...form.register("tax_regime")} placeholder="601 - General de Ley" />
            <FieldErr msg={err.tax_regime?.message} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="business_activity">Actividad principal (giro)</Label>
            <Input id="business_activity" {...form.register("business_activity")} />
            <FieldErr msg={err.business_activity?.message} />
          </div>
        </div>
        <div className="space-y-1 mt-3">
          <Label htmlFor="business_description">Descripción del negocio</Label>
          <Textarea id="business_description" {...form.register("business_description")} placeholder="¿A qué se dedica la empresa?" />
          <FieldErr msg={err.business_description?.message} />
        </div>
        <div className="grid sm:grid-cols-3 gap-3 mt-3">
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="address_street">Calle</Label>
            <Input id="address_street" {...form.register("address_street")} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="address_number">Número ext./int.</Label>
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
            <FieldErr msg={err.address_zip?.message} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="phone">Teléfono</Label>
            <Input id="phone" {...form.register("phone")} placeholder="5512345678" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="email">Correo electrónico</Label>
            <Input id="email" type="email" {...form.register("email")} />
            <FieldErr msg={err.email?.message} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="website">Sitio web (opcional)</Label>
            <Input id="website" {...form.register("website")} placeholder="https://" />
          </div>
        </div>
      </section>

      {/* ── Sección 2: Partes relacionadas ─────────────── */}
      <section>
        <SectionTitle n={2}>Partes relacionadas</SectionTitle>
        <p className="text-xs text-muted-foreground mb-3">
          Incluye accionistas con 25%+ de participación, representantes legales, administradores y beneficiarios controladores.
        </p>

        {parties.map((field, i) => {
          const roleVal = watchParties?.[i]?.role
          const isPep = watchParties?.[i]?.is_pep
          const isAccionista = roleVal === "accionista"
          const partyErr = (err.parties as Record<number, Record<string, { message?: string }>>)?.[i]

          return (
            <div key={field.id} style={{
              border: "1px solid #e3e8e5", borderRadius: 10, padding: "14px 16px",
              marginBottom: 12, position: "relative", background: "#fafcfb",
            }}>
              <p className="text-xs font-medium text-muted-foreground mb-2">Persona #{i + 1}</p>

              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Nombre completo</Label>
                  <Input {...form.register(`parties.${i}.full_name`)} />
                  <FieldErr msg={partyErr?.full_name?.message} />
                </div>
                <div className="space-y-1">
                  <Label>Rol</Label>
                  <select
                    {...form.register(`parties.${i}.role`)}
                    style={{
                      width: "100%", padding: "8px 10px", border: "1px solid #e2e8f0",
                      borderRadius: 6, fontSize: 14, background: "#fff", color: "#16201b",
                    }}
                  >
                    {PARTY_ROLES.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label>RFC</Label>
                  <Input
                    {...form.register(`parties.${i}.rfc`)}
                    placeholder="ABCD800101ABC"
                    className="uppercase"
                    maxLength={13}
                  />
                  <FieldErr msg={partyErr?.rfc?.message} />
                </div>
                <div className="space-y-1">
                  <Label>CURP</Label>
                  <Input
                    {...form.register(`parties.${i}.curp`)}
                    placeholder="ABCD800101HMXNRS01"
                    className="uppercase"
                    maxLength={18}
                  />
                  <FieldErr msg={partyErr?.curp?.message} />
                </div>
                {isAccionista && (
                  <div className="space-y-1">
                    <Label>% de participación</Label>
                    <Input
                      {...form.register(`parties.${i}.percentage`)}
                      placeholder="25"
                      type="number"
                      min={0}
                      max={100}
                    />
                    <FieldErr msg={partyErr?.percentage?.message} />
                  </div>
                )}
              </div>

              <div className="mt-3 space-y-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    {...form.register(`parties.${i}.is_pep`)}
                    style={{ width: 15, height: 15, accentColor: "#004238" }}
                  />
                  <span>Persona Políticamente Expuesta (PEP)</span>
                </label>
                {isPep && (
                  <div className="space-y-1">
                    <Label>Cargo o función pública</Label>
                    <Input
                      {...form.register(`parties.${i}.pep_details`)}
                      placeholder="Ej. Director General de organismo público, 2019-2022"
                    />
                    <FieldErr msg={partyErr?.pep_details?.message} />
                  </div>
                )}
              </div>

              {parties.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeParty(i)}
                  style={{
                    position: "absolute", top: 10, right: 12,
                    fontSize: 11, color: "#a32d2d", background: "none",
                    border: "none", cursor: "pointer", textDecoration: "underline",
                  }}
                >
                  Quitar
                </button>
              )}
            </div>
          )
        })}

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => addParty({
            full_name: "", role: "accionista", rfc: "", curp: "",
            percentage: "", is_pep: false, pep_details: "",
          })}
        >
          + Agregar persona
        </Button>
        {err.parties?.root && <FieldErr msg={err.parties.root.message} />}
      </section>

      {/* ── Sección 3: Declaraciones ────────────────────── */}
      <section>
        <SectionTitle n={3}>Declaraciones</SectionTitle>

        <div className="space-y-4">
          <label className="flex items-start gap-3 text-sm cursor-pointer">
            <input
              type="checkbox"
              {...form.register("no_sanctions")}
              className="mt-0.5 h-4 w-4"
              style={{ accentColor: "#004238" }}
            />
            <span>
              La empresa y sus accionistas / representantes <strong>NO</strong> están
              sujetos a sanciones internacionales (OFAC, ONU, UE).
            </span>
          </label>
          <FieldErr msg={err.no_sanctions?.message} />

          <label className="flex items-start gap-3 text-sm cursor-pointer">
            <input
              type="checkbox"
              {...form.register("no_terrorism")}
              className="mt-0.5 h-4 w-4"
              style={{ accentColor: "#004238" }}
            />
            <span>
              La empresa <strong>NO</strong> tiene relación con actividades de
              financiamiento al terrorismo o lavado de dinero.
            </span>
          </label>
          <FieldErr msg={err.no_terrorism?.message} />

          <div className="grid sm:grid-cols-2 gap-3 pt-2">
            <div className="space-y-1">
              <Label htmlFor="declaration_place">Lugar de firma</Label>
              <Input id="declaration_place" {...form.register("declaration_place")} placeholder="Ciudad de México" />
              <FieldErr msg={err.declaration_place?.message} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="declaration_date">Fecha</Label>
              <Input id="declaration_date" type="date" {...form.register("declaration_date")} />
              <FieldErr msg={err.declaration_date?.message} />
            </div>
          </div>
        </div>
      </section>

      {/* ── Archivos adjuntos (opcionales) ─────────────── */}
      <section>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#5f6b64",
            textTransform: "uppercase", letterSpacing: ".04em" }}>
            Archivos adjuntos (opcionales)
          </h3>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          {/* Organigrama */}
          <div style={{ border: "1px dashed #d3dbd6", borderRadius: 8, padding: "14px 16px" }}>
            <p className="text-sm font-medium mb-1">Organigrama corporativo</p>
            <p className="text-xs text-muted-foreground mb-3">
              Estructura accionaria en PDF o imagen (opcional).
            </p>
            <label style={{
              display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12,
              padding: "7px 14px", border: "1px solid #d3dbd6", borderRadius: 6,
              background: "#fff", cursor: "pointer", color: "#374151",
            }}>
              <svg viewBox="0 0 24 24" width={13} height={13} fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              {orgFile ? orgFile.name : "Seleccionar archivo"}
              <input
                ref={orgRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.xlsx"
                style={{ display: "none" }}
                onChange={(e) => setOrgFile(e.target.files?.[0] ?? null)}
              />
            </label>
            {orgFile && (
              <button type="button" onClick={() => { setOrgFile(null); if (orgRef.current) orgRef.current.value = "" }}
                className="ml-2 text-xs text-muted-foreground underline">
                Quitar
              </button>
            )}
          </div>

          {/* Declaración anual */}
          <div style={{ border: "1px dashed #d3dbd6", borderRadius: 8, padding: "14px 16px" }}>
            <p className="text-sm font-medium mb-1">Declaración anual del ejercicio</p>
            <p className="text-xs text-muted-foreground mb-3">
              Acuse completo del SAT (PDF, opcional si ya está en el expediente).
            </p>
            <label style={{
              display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12,
              padding: "7px 14px", border: "1px solid #d3dbd6", borderRadius: 6,
              background: "#fff", cursor: "pointer", color: "#374151",
            }}>
              <svg viewBox="0 0 24 24" width={13} height={13} fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              {taxFile ? taxFile.name : "Seleccionar archivo"}
              <input
                ref={taxRef}
                type="file"
                accept=".pdf"
                style={{ display: "none" }}
                onChange={(e) => setTaxFile(e.target.files?.[0] ?? null)}
              />
            </label>
            {taxFile && (
              <button type="button" onClick={() => { setTaxFile(null); if (taxRef.current) taxRef.current.value = "" }}
                className="ml-2 text-xs text-muted-foreground underline">
                Quitar
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ── Actions ─────────────────────────────────────── */}
      <div className="flex gap-3 pt-2">
        <Link href={`/applications/${appId}/documents`} className={buttonVariants({ variant: "outline" })}>
          Cancelar
        </Link>
        <Button
          type="submit"
          disabled={submitting}
          style={{ background: "#004238", color: "#AEFF99" }}
        >
          {submitting ? "Guardando..." : "Guardar y generar Excel"}
        </Button>
      </div>
    </form>
  )
}
