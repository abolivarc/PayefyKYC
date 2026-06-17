"use client"

import { useState, useRef } from "react"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  complementaryInfoSchemaV2,
  ROW_MAP,
  type ComplementaryInfoV2Values,
} from "@/lib/validations/complementary-info-v2"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Textarea } from "@/components/ui/textarea"

interface Props {
  appId: string
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function SectionTitle({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
      <span
        style={{
          width: 28,
          height: 28,
          borderRadius: "50%",
          background: "#004238",
          color: "#AEFF99",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 13,
          fontWeight: 700,
          flexShrink: 0,
        }}
      >
        {n}
      </span>
      <h3
        style={{
          margin: 0,
          fontSize: 14,
          fontWeight: 600,
          color: "#16201b",
          textTransform: "uppercase",
          letterSpacing: ".04em",
        }}
      >
        {children}
      </h3>
    </div>
  )
}

function FieldErr({ msg }: { msg?: string }) {
  if (!msg) return null
  return <p style={{ fontSize: 11, color: "#a32d2d", marginTop: 3 }}>{msg}</p>
}

const selectStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  border: "1px solid #e2e8f0",
  borderRadius: 6,
  fontSize: 14,
  background: "#fff",
  color: "#16201b",
}

const labelStyle: React.CSSProperties = { fontSize: 13, display: "block", marginBottom: 4 }

// ── File picker sub-component ─────────────────────────────────────────────────

function FilePicker({
  label,
  hint,
  accept,
  file,
  onChange,
  onClear,
  inputRef,
}: {
  label: string
  hint: string
  accept: string
  file: File | null
  onChange: (f: File | null) => void
  onClear: () => void
  inputRef: React.RefObject<HTMLInputElement | null>
}) {
  return (
    <div style={{ border: "1px dashed #d3dbd6", borderRadius: 8, padding: "14px 16px" }}>
      <p className="text-sm font-medium mb-1">{label}</p>
      <p className="text-xs text-muted-foreground mb-3">{hint}</p>
      <label
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          fontSize: 12,
          padding: "7px 14px",
          border: "1px solid #d3dbd6",
          borderRadius: 6,
          background: "#fff",
          cursor: "pointer",
          color: "#374151",
        }}
      >
        <svg
          viewBox="0 0 24 24"
          width={13}
          height={13}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        {file ? file.name : "Seleccionar archivo"}
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          style={{ display: "none" }}
          onChange={(e) => onChange(e.target.files?.[0] ?? null)}
        />
      </label>
      {file && (
        <button
          type="button"
          onClick={() => {
            onClear()
            if (inputRef.current) inputRef.current.value = ""
          }}
          className="ml-2 text-xs text-muted-foreground underline"
        >
          Quitar
        </button>
      )}
    </div>
  )
}

// ── Mode selector cards ───────────────────────────────────────────────────────

function ModeSelector({ onSelect }: { onSelect: (mode: "portal" | "upload") => void }) {
  return (
    <div>
      <p style={{ fontSize: 14, color: "#374151", marginBottom: 20 }}>
        Elige cómo deseas completar la información complementaria:
      </p>
      <div className="grid sm:grid-cols-2 gap-4">
        {/* Opción A: Portal */}
        <button
          type="button"
          onClick={() => onSelect("portal")}
          style={{
            border: "2px solid #e3e8e5",
            borderRadius: 12,
            padding: "24px 20px",
            textAlign: "left",
            background: "#fafcfb",
            cursor: "pointer",
            transition: "border-color .15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#004238")}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#e3e8e5")}
        >
          <div style={{ fontSize: 28, marginBottom: 10 }}>📝</div>
          <p style={{ fontSize: 14, fontWeight: 700, color: "#16201b", margin: "0 0 6px" }}>
            Llenar en el portal
          </p>
          <p style={{ fontSize: 12, color: "#5f6b64", margin: 0, lineHeight: 1.5 }}>
            Completa el formulario directamente aquí. Generamos el Excel por ti y lo guardamos en tu
            expediente.
          </p>
        </button>

        {/* Opción B: Upload */}
        <button
          type="button"
          onClick={() => onSelect("upload")}
          style={{
            border: "2px solid #e3e8e5",
            borderRadius: 12,
            padding: "24px 20px",
            textAlign: "left",
            background: "#fafcfb",
            cursor: "pointer",
            transition: "border-color .15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#004238")}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#e3e8e5")}
        >
          <div style={{ fontSize: 28, marginBottom: 10 }}>📤</div>
          <p style={{ fontSize: 14, fontWeight: 700, color: "#16201b", margin: "0 0 6px" }}>
            Descargar y subir plantilla
          </p>
          <p style={{ fontSize: 12, color: "#5f6b64", margin: 0, lineHeight: 1.5 }}>
            Descarga nuestra plantilla Excel, llénala fuera de línea y súbela con los documentos
            adjuntos.
          </p>
        </button>
      </div>
    </div>
  )
}

// ── Portal form ───────────────────────────────────────────────────────────────

function PortalForm({ appId, onBack }: { appId: string; onBack: () => void }) {
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [orgFile, setOrgFile] = useState<File | null>(null)
  const [taxFile, setTaxFile] = useState<File | null>(null)
  const [importInfo, setImportInfo] = useState<{ filled: number } | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const orgRef = useRef<HTMLInputElement>(null)
  const taxRef = useRef<HTMLInputElement>(null)
  const importRef = useRef<HTMLInputElement>(null)

  const DATE_FIELDS = new Set(["director_nacimiento", "colaborador_nacimiento", "pep_inicio", "pep_fin"])
  const YESNO_FIELDS = new Set(["ingresos_adicionales", "tiene_sucursales", "tiene_participacion", "parte_grupo", "pep_vigente"])

  async function handleImport(file: File) {
    setImportError(null)
    setImportInfo(null)
    try {
      const { read, utils } = await import("xlsx")
      const buf = await file.arrayBuffer()
      const wb = read(buf, { cellDates: true })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows = utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: "" })

      let filled = 0
      const values: Partial<ComplementaryInfoV2Values> = {}

      for (const [field, rowNum] of Object.entries(ROW_MAP) as [keyof ComplementaryInfoV2Values, number][]) {
        const raw = (rows[rowNum - 1] as unknown[])?.[1]

        let val: string
        if (raw instanceof Date) {
          val = raw.toISOString().slice(0, 10)
        } else {
          val = String(raw ?? "").trim()
        }

        if (!val || val.toLowerCase() === "n/a" || val.toLowerCase() === "na") continue

        // Normalize date strings DD/MM/YY(YY) → YYYY-MM-DD
        if (DATE_FIELDS.has(field as string) && /^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(val)) {
          const [d, m, y] = val.split("/")
          const year = y.length === 2 ? (parseInt(y) <= 30 ? `20${y.padStart(2,"0")}` : `19${y.padStart(2,"0")}`) : y
          val = `${year}-${m.padStart(2,"0")}-${d.padStart(2,"0")}`
        }

        // Normalize yes/no
        if (YESNO_FIELDS.has(field as string)) {
          const lower = val.toLowerCase()
          if (lower === "si" || lower === "sí" || lower === "yes") val = "Sí"
          else if (lower === "no") val = "No"
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(values as Record<string, string>)[field as string] = val
        filled++
      }

      form.reset({ ...form.getValues(), ...values })
      setImportInfo({ filled })
    } catch {
      setImportError("No se pudo leer el archivo. Verifica que sea una plantilla válida.")
    } finally {
      if (importRef.current) importRef.current.value = ""
    }
  }

  const form = useForm<ComplementaryInfoV2Values>({
    resolver: zodResolver(complementaryInfoSchemaV2),
    defaultValues: {
      director_nombre: "",
      director_nacimiento: "",
      director_cargo: "",
      colaborador_nombre: "",
      colaborador_puesto: "",
      colaborador_nacimiento: "",
      pep_relacion: "",
      pep_residencia: "",
      pep_dependencia: "",
      pep_cargo: "",
      pep_sueldo: "",
      pep_inicio: "",
      pep_fin: "",
      pep_vigente: "",
      anos_actividad: "",
      ingresos_mensuales: "",
      ingresos_adicionales: "No",
      ingresos_adicionales_cuales: "",
      clientes_extranjero: "",
      productos_servicios: "",
      num_empleados: "",
      ingresos_empresa: "",
      tiene_sucursales: "No",
      num_sucursales: "",
      estados_sucursales: "",
      principales_clientes: "",
      principales_proveedores: "",
      tiene_participacion: "No",
      participacion_razon: "",
      parte_grupo: "No",
      grupo_detalle: "",
    },
  })

  const err = form.formState.errors
  const watchIngresos = form.watch("ingresos_adicionales")
  const watchSucursales = form.watch("tiene_sucursales")
  const watchParticipacion = form.watch("tiene_participacion")
  const watchGrupo = form.watch("parte_grupo")

  async function onSubmit(data: ComplementaryInfoV2Values) {
    setSubmitting(true)
    setServerError(null)
    try {
      const fd = new FormData()
      fd.append("mode", "portal")
      fd.append("applicationId", appId)

      // Append all string fields
      for (const [k, v] of Object.entries(data)) {
        if (typeof v === "string") fd.append(k, v)
      }
      if (orgFile) fd.append("orgFile", orgFile)
      if (taxFile) fd.append("taxFile", taxFile)

      const res = await fetch("/api/forms/complementary-info", {
        method: "POST",
        body: fd,
      })
      const json = await res.json()
      if (!res.ok || json.error) {
        setServerError(json.error ?? "Error al guardar el formulario")
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
            Formulario guardado correctamente. El archivo Excel ha sido generado y guardado en tu
            expediente.
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

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10">
      {serverError && (
        <Alert variant="destructive">
          <AlertDescription style={{ whiteSpace: "pre-line" }}>{serverError}</AlertDescription>
        </Alert>
      )}

      {/* ── Excel import banner ───────────────────────────────────── */}
      <div style={{ background: "#f0faf5", border: "1px solid #b6e8cc", borderRadius: 10, padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 20 }}>📊</span>
          <div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#16201b" }}>
              ¿Ya tienes la plantilla llenada?
            </p>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: "#5f6b64" }}>
              Importa el Excel y pre-llenamos el formulario por ti.
            </p>
          </div>
        </div>
        <input
          ref={importRef}
          type="file"
          accept=".xlsx"
          style={{ display: "none" }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImport(f) }}
        />
        <button
          type="button"
          onClick={() => importRef.current?.click()}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, padding: "7px 14px", background: "#004238", color: "#AEFF99", border: "none", borderRadius: 6, cursor: "pointer", whiteSpace: "nowrap" }}
        >
          Importar desde Excel
        </button>
      </div>

      {importInfo && (
        <div style={{ background: "#EDFBEA", border: "1px solid #b6e8cc", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#047857" }}>
          ✓ {importInfo.filled} campos importados. Revisa y ajusta lo que necesites antes de guardar.
        </div>
      )}
      {importError && (
        <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#B91C1C" }}>
          {importError}
        </div>
      )}

      {/* ── Sección 1: Información complementaria ────────────────── */}
      <section>
        <SectionTitle n={1}>Información complementaria</SectionTitle>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label style={labelStyle} htmlFor="director_nombre">
              Nombre de Director general
            </Label>
            <Input id="director_nombre" {...form.register("director_nombre")} />
            <FieldErr msg={err.director_nombre?.message} />
          </div>
          <div className="space-y-1">
            <Label style={labelStyle} htmlFor="director_nacimiento">
              Fecha de nacimiento de director general
            </Label>
            <Input id="director_nacimiento" type="date" {...form.register("director_nacimiento")} />
            <FieldErr msg={err.director_nacimiento?.message} />
          </div>
          <div className="space-y-1">
            <Label style={labelStyle} htmlFor="director_cargo">
              Cargo en la empresa
            </Label>
            <Input id="director_cargo" {...form.register("director_cargo")} />
            <FieldErr msg={err.director_cargo?.message} />
          </div>
          <div className="space-y-1">
            <Label style={labelStyle} htmlFor="colaborador_nombre">
              Colaborador que reporte directamente
            </Label>
            <Input id="colaborador_nombre" {...form.register("colaborador_nombre")} />
            <FieldErr msg={err.colaborador_nombre?.message} />
          </div>
          <div className="space-y-1">
            <Label style={labelStyle} htmlFor="colaborador_puesto">
              Puesto del colaborador que reporta directamente
            </Label>
            <Input id="colaborador_puesto" {...form.register("colaborador_puesto")} />
            <FieldErr msg={err.colaborador_puesto?.message} />
          </div>
          <div className="space-y-1">
            <Label style={labelStyle} htmlFor="colaborador_nacimiento">
              Fecha de nacimiento del colaborador que reporte directamente
            </Label>
            <Input
              id="colaborador_nacimiento"
              type="date"
              {...form.register("colaborador_nacimiento")}
            />
            <FieldErr msg={err.colaborador_nacimiento?.message} />
          </div>
        </div>
        <div className="mt-4">
          <FilePicker
            label="Organigrama empresarial (opcional)"
            hint="Adjunta el organigrama corporativo en PDF o imagen."
            accept=".pdf,.jpg,.jpeg,.png,.xlsx"
            file={orgFile}
            onChange={setOrgFile}
            onClear={() => setOrgFile(null)}
            inputRef={orgRef}
          />
        </div>
      </section>

      {/* ── Sección 2: Datos del PEP (opcional) ──────────────────── */}
      <section>
        <SectionTitle n={2}>Datos del PEP (opcional)</SectionTitle>
        <p className="text-xs text-muted-foreground mb-3">
          Completa esta sección solo si algún directivo o colaborador es una Persona Políticamente
          Expuesta.
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label style={labelStyle} htmlFor="pep_relacion">
              Relación con PEP
            </Label>
            <Input id="pep_relacion" {...form.register("pep_relacion")} />
          </div>
          <div className="space-y-1">
            <Label style={labelStyle} htmlFor="pep_residencia">
              Lugar de residencia del PEP
            </Label>
            <Input id="pep_residencia" {...form.register("pep_residencia")} />
          </div>
          <div className="space-y-1">
            <Label style={labelStyle} htmlFor="pep_dependencia">
              Nombre de la dependencia
            </Label>
            <Input id="pep_dependencia" {...form.register("pep_dependencia")} />
          </div>
          <div className="space-y-1">
            <Label style={labelStyle} htmlFor="pep_cargo">
              Cargo en la dependencia
            </Label>
            <Input id="pep_cargo" {...form.register("pep_cargo")} />
          </div>
          <div className="space-y-1">
            <Label style={labelStyle} htmlFor="pep_sueldo">
              Sueldo estimado
            </Label>
            <Input id="pep_sueldo" {...form.register("pep_sueldo")} placeholder="Ej. $50,000 MXN" />
          </div>
          <div className="space-y-1">
            <Label style={labelStyle} htmlFor="pep_vigente">
              ¿Es vigente el cargo?
            </Label>
            <select id="pep_vigente" {...form.register("pep_vigente")} style={selectStyle}>
              <option value="">— Selecciona —</option>
              <option value="Sí">Sí</option>
              <option value="No">No</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label style={labelStyle} htmlFor="pep_inicio">
              Fecha de inicio de cargo
            </Label>
            <Input id="pep_inicio" type="date" {...form.register("pep_inicio")} />
          </div>
          <div className="space-y-1">
            <Label style={labelStyle} htmlFor="pep_fin">
              Fecha de fin de cargo
            </Label>
            <Input id="pep_fin" type="date" {...form.register("pep_fin")} />
          </div>
        </div>
      </section>

      {/* ── Sección 3: Datos de la empresa ───────────────────────── */}
      <section>
        <SectionTitle n={3}>Datos de la empresa</SectionTitle>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label style={labelStyle} htmlFor="anos_actividad">
              Años desempeñando la actividad
            </Label>
            <Input id="anos_actividad" {...form.register("anos_actividad")} placeholder="Ej. 5" />
            <FieldErr msg={err.anos_actividad?.message} />
          </div>
          <div className="space-y-1">
            <Label style={labelStyle} htmlFor="ingresos_mensuales">
              Ingresos mensuales aproximados
            </Label>
            <Input
              id="ingresos_mensuales"
              {...form.register("ingresos_mensuales")}
              placeholder="Ej. $200,000 MXN"
            />
            <FieldErr msg={err.ingresos_mensuales?.message} />
          </div>
          <div className="space-y-1">
            <Label style={labelStyle} htmlFor="ingresos_adicionales">
              ¿Tienes ingresos adicionales?
            </Label>
            <select
              id="ingresos_adicionales"
              {...form.register("ingresos_adicionales")}
              style={selectStyle}
            >
              <option value="No">No</option>
              <option value="Sí">Sí</option>
            </select>
            <FieldErr msg={err.ingresos_adicionales?.message} />
          </div>
          {watchIngresos === "Sí" && (
            <div className="space-y-1">
              <Label style={labelStyle} htmlFor="ingresos_adicionales_cuales">
                Si, ¿cuales?
              </Label>
              <Input
                id="ingresos_adicionales_cuales"
                {...form.register("ingresos_adicionales_cuales")}
                placeholder="Describe los ingresos adicionales"
              />
              <FieldErr msg={err.ingresos_adicionales_cuales?.message} />
            </div>
          )}
          <div className="space-y-1">
            <Label style={labelStyle} htmlFor="clientes_extranjero">
              Tienes clientes y/o proveedores en el extranjero ¿en donde?
            </Label>
            <Input
              id="clientes_extranjero"
              {...form.register("clientes_extranjero")}
              placeholder="Ej. EE.UU., España / No"
            />
            <FieldErr msg={err.clientes_extranjero?.message} />
          </div>
          <div className="space-y-1">
            <Label style={labelStyle} htmlFor="num_empleados">
              Número de empleados
            </Label>
            <Input id="num_empleados" {...form.register("num_empleados")} placeholder="Ej. 25" />
            <FieldErr msg={err.num_empleados?.message} />
          </div>
          <div className="space-y-1">
            <Label style={labelStyle} htmlFor="ingresos_empresa">
              Ingresos mensuales aproximados de la empresa
            </Label>
            <Input
              id="ingresos_empresa"
              {...form.register("ingresos_empresa")}
              placeholder="Ej. $500,000 MXN"
            />
            <FieldErr msg={err.ingresos_empresa?.message} />
          </div>
          <div className="space-y-1">
            <Label style={labelStyle} htmlFor="tiene_sucursales">
              ¿Tienes sucursales o puntos de venta?
            </Label>
            <select
              id="tiene_sucursales"
              {...form.register("tiene_sucursales")}
              style={selectStyle}
            >
              <option value="No">No</option>
              <option value="Sí">Sí</option>
            </select>
            <FieldErr msg={err.tiene_sucursales?.message} />
          </div>
          {watchSucursales === "Sí" && (
            <>
              <div className="space-y-1">
                <Label style={labelStyle} htmlFor="num_sucursales">
                  Número de sucursales
                </Label>
                <Input
                  id="num_sucursales"
                  {...form.register("num_sucursales")}
                  placeholder="Ej. 3"
                />
                <FieldErr msg={err.num_sucursales?.message} />
              </div>
              <div className="space-y-1">
                <Label style={labelStyle} htmlFor="estados_sucursales">
                  Estados donde se ubican
                </Label>
                <Input
                  id="estados_sucursales"
                  {...form.register("estados_sucursales")}
                  placeholder="Ej. CDMX, Jalisco"
                />
                <FieldErr msg={err.estados_sucursales?.message} />
              </div>
            </>
          )}
          <div className="space-y-1">
            <Label style={labelStyle} htmlFor="tiene_participacion">
              ¿Tienes participación accionaria en otras empresas?
            </Label>
            <select
              id="tiene_participacion"
              {...form.register("tiene_participacion")}
              style={selectStyle}
            >
              <option value="No">No</option>
              <option value="Sí">Sí</option>
            </select>
            <FieldErr msg={err.tiene_participacion?.message} />
          </div>
          {watchParticipacion === "Sí" && (
            <div className="space-y-1">
              <Label style={labelStyle} htmlFor="participacion_razon">
                Si, ¿razón social? ¿giro?
              </Label>
              <Input
                id="participacion_razon"
                {...form.register("participacion_razon")}
                placeholder="Razón social y giro de la empresa"
              />
              <FieldErr msg={err.participacion_razon?.message} />
            </div>
          )}
          <div className="space-y-1">
            <Label style={labelStyle} htmlFor="parte_grupo">
              ¿Tu empresa es parte de un grupo empresarial?
            </Label>
            <select id="parte_grupo" {...form.register("parte_grupo")} style={selectStyle}>
              <option value="No">No</option>
              <option value="Sí">Sí</option>
            </select>
            <FieldErr msg={err.parte_grupo?.message} />
          </div>
        </div>

        {/* Full-width textareas */}
        <div className="space-y-3 mt-3">
          <div className="space-y-1">
            <Label style={labelStyle} htmlFor="productos_servicios">
              Productos o servicios que comercializa la empresa
            </Label>
            <Textarea
              id="productos_servicios"
              {...form.register("productos_servicios")}
              placeholder="Describe los principales productos o servicios"
              rows={3}
            />
            <FieldErr msg={err.productos_servicios?.message} />
          </div>
          <div className="space-y-1">
            <Label style={labelStyle} htmlFor="principales_clientes">
              Principales clientes
            </Label>
            <Textarea
              id="principales_clientes"
              {...form.register("principales_clientes")}
              placeholder="Nombres o sectores de tus principales clientes"
              rows={3}
            />
            <FieldErr msg={err.principales_clientes?.message} />
          </div>
          <div className="space-y-1">
            <Label style={labelStyle} htmlFor="principales_proveedores">
              Principales proveedores
            </Label>
            <Textarea
              id="principales_proveedores"
              {...form.register("principales_proveedores")}
              placeholder="Nombres o sectores de tus principales proveedores"
              rows={3}
            />
            <FieldErr msg={err.principales_proveedores?.message} />
          </div>
          {watchGrupo === "Sí" && (
            <div className="space-y-1">
              <Label style={labelStyle} htmlFor="grupo_detalle">
                Si (Denominación, fecha de constitución, objeto social, porcentaje de
                participación, domicilio)
              </Label>
              <Textarea
                id="grupo_detalle"
                {...form.register("grupo_detalle")}
                placeholder="Detalla la información del grupo empresarial"
                rows={4}
              />
              <FieldErr msg={err.grupo_detalle?.message} />
            </div>
          )}
        </div>

        {/* Optional tax file */}
        <div className="mt-4">
          <FilePicker
            label="Adjuntar última declaración anual (opcional)"
            hint="Acuse completo del SAT en PDF."
            accept=".pdf"
            file={taxFile}
            onChange={setTaxFile}
            onClear={() => setTaxFile(null)}
            inputRef={taxRef}
          />
        </div>
      </section>

      {/* ── Actions ────────────────────────────────────────── */}
      <div className="flex gap-3 pt-2 flex-wrap">
        <button
          type="button"
          onClick={onBack}
          style={{
            padding: "8px 18px",
            border: "1px solid #e2e8f0",
            borderRadius: 6,
            background: "#fff",
            fontSize: 14,
            cursor: "pointer",
            color: "#374151",
          }}
        >
          Cambiar opción
        </button>
        <Link
          href={`/applications/${appId}/documents`}
          className={buttonVariants({ variant: "outline" })}
        >
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

// ── Upload form ───────────────────────────────────────────────────────────────

function UploadForm({ appId, onBack }: { appId: string; onBack: () => void }) {
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [structureErrors, setStructureErrors] = useState<string[]>([])
  const [fieldErrors, setFieldErrors] = useState<string[]>([])
  const [xlsxFile, setXlsxFile] = useState<File | null>(null)
  const [orgFile, setOrgFile] = useState<File | null>(null)
  const [taxFile, setTaxFile] = useState<File | null>(null)
  const xlsxRef = useRef<HTMLInputElement>(null)
  const orgRef = useRef<HTMLInputElement>(null)
  const taxRef = useRef<HTMLInputElement>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setServerError(null)
    setStructureErrors([])
    setFieldErrors([])

    if (!xlsxFile) {
      setServerError("Debes seleccionar el archivo Excel de la plantilla.")
      return
    }
    if (!orgFile) {
      setServerError("Debes adjuntar el organigrama empresarial.")
      return
    }
    if (!taxFile) {
      setServerError("Debes adjuntar la última declaración anual.")
      return
    }

    setSubmitting(true)
    try {
      const fd = new FormData()
      fd.append("mode", "upload")
      fd.append("applicationId", appId)
      fd.append("xlsxFile", xlsxFile)
      fd.append("orgFile", orgFile)
      fd.append("taxFile", taxFile)

      const res = await fetch("/api/forms/complementary-info", {
        method: "POST",
        body: fd,
      })
      const json = await res.json()

      if (!res.ok || json.error) {
        setServerError(json.error ?? "Error al procesar el archivo")
        if (json.structureErrors?.length) setStructureErrors(json.structureErrors)
        if (json.fieldErrors?.length) setFieldErrors(json.fieldErrors)
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
            Archivo subido correctamente. Tu expediente ha sido actualizado.
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Step 1: Download template */}
      <div style={{ background: "#f0faf5", border: "1px solid #b6e8cc", borderRadius: 10, padding: "16px 18px" }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: "#16201b", margin: "0 0 6px" }}>
          Paso 1 — Descarga la plantilla oficial
        </p>
        <p style={{ fontSize: 12, color: "#5f6b64", margin: "0 0 12px" }}>
          Usa únicamente esta plantilla. No modifiques las etiquetas de la columna A.
        </p>
        <a
          href="/templates/informacion_complementaria.xlsx"
          download
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 13,
            padding: "8px 16px",
            background: "#004238",
            color: "#AEFF99",
            borderRadius: 6,
            textDecoration: "none",
            fontWeight: 600,
          }}
        >
          <svg
            viewBox="0 0 24 24"
            width={14}
            height={14}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Descargar plantilla (.xlsx)
        </a>
      </div>

      {/* Step 2: Upload files */}
      <div>
        <p style={{ fontSize: 13, fontWeight: 600, color: "#16201b", margin: "0 0 12px" }}>
          Paso 2 — Sube los archivos completados
        </p>
        <div className="space-y-4">
          <FilePicker
            label="Plantilla Excel llenada (requerido)"
            hint="El archivo .xlsx descargado con todos los campos completados."
            accept=".xlsx"
            file={xlsxFile}
            onChange={setXlsxFile}
            onClear={() => setXlsxFile(null)}
            inputRef={xlsxRef}
          />
          <FilePicker
            label="Organigrama empresarial (requerido)"
            hint="Diagrama de estructura corporativa en PDF o imagen."
            accept=".pdf,.jpg,.jpeg,.png"
            file={orgFile}
            onChange={setOrgFile}
            onClear={() => setOrgFile(null)}
            inputRef={orgRef}
          />
          <FilePicker
            label="Última declaración anual (requerido)"
            hint="Acuse completo del SAT en PDF."
            accept=".pdf"
            file={taxFile}
            onChange={setTaxFile}
            onClear={() => setTaxFile(null)}
            inputRef={taxRef}
          />
        </div>
      </div>

      {/* Errors */}
      {(serverError || structureErrors.length > 0 || fieldErrors.length > 0) && (
        <Alert variant="destructive">
          <AlertDescription>
            {serverError && <p style={{ marginBottom: structureErrors.length || fieldErrors.length ? 8 : 0 }}>{serverError}</p>}
            {structureErrors.length > 0 && (
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {structureErrors.map((e, i) => (
                  <li key={i} style={{ fontSize: 12 }}>
                    {e}
                  </li>
                ))}
              </ul>
            )}
            {fieldErrors.length > 0 && (
              <>
                <p style={{ margin: "8px 0 4px", fontSize: 12, fontWeight: 600 }}>
                  Campos faltantes:
                </p>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {fieldErrors.map((e, i) => (
                    <li key={i} style={{ fontSize: 12 }}>
                      {e}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-2 flex-wrap">
        <button
          type="button"
          onClick={onBack}
          style={{
            padding: "8px 18px",
            border: "1px solid #e2e8f0",
            borderRadius: 6,
            background: "#fff",
            fontSize: 14,
            cursor: "pointer",
            color: "#374151",
          }}
        >
          Cambiar opción
        </button>
        <Link
          href={`/applications/${appId}/documents`}
          className={buttonVariants({ variant: "outline" })}
        >
          Cancelar
        </Link>
        <Button
          type="submit"
          disabled={submitting}
          style={{ background: "#004238", color: "#AEFF99" }}
        >
          {submitting ? "Subiendo..." : "Subir archivos"}
        </Button>
      </div>
    </form>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────

export function ComplementaryInfoForm({ appId }: Props) {
  const [mode, setMode] = useState<"portal" | "upload" | null>(null)

  if (mode === "portal") {
    return <PortalForm appId={appId} onBack={() => setMode(null)} />
  }

  if (mode === "upload") {
    return <UploadForm appId={appId} onBack={() => setMode(null)} />
  }

  return <ModeSelector onSelect={setMode} />
}
