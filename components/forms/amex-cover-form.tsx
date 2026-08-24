"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { uploadDocumentFile } from "@/lib/documents/upload"
import { useDraftAutosave, draftLabel } from "@/lib/forms/use-draft-autosave"
import { AlertTriangle, Download, Upload, CheckCircle2 } from "lucide-react"

interface Field {
  key: string
  label: string
  required?: boolean
  placeholder?: string
  type?: string
}

const SECTIONS: { title: string; hint?: string; fields: Field[] }[] = [
  {
    title: "Datos generales",
    fields: [
      { key: "razonSocial", label: "Denominación o razón social", required: true },
      { key: "nombreComercial", label: "Nombre comercial" },
      { key: "rfc", label: "R.F.C.", required: true },
      { key: "objetoSocial", label: "Objeto social" },
      { key: "giroComercial", label: "Giro comercial", required: true },
    ],
  },
  {
    title: "Domicilio fiscal",
    fields: [
      { key: "fiscalCalle", label: "Calle y número ext. e int.", required: true },
      { key: "fiscalColonia", label: "Colonia", required: true },
      { key: "fiscalMunicipio", label: "Delegación, municipio o alcaldía", required: true },
      { key: "fiscalCp", label: "Código postal", required: true },
      { key: "fiscalEstado", label: "Entidad federativa", required: true },
      { key: "fiscalCiudad", label: "Ciudad o población", required: true },
      { key: "fiscalPais", label: "País" },
    ],
  },
  {
    title: "Domicilio del establecimiento",
    hint: "Donde opera el negocio. Si es el mismo que el fiscal, usa el botón de copiar.",
    fields: [
      { key: "estCalle", label: "Calle y número ext. e int.", required: true },
      { key: "estColonia", label: "Colonia", required: true },
      { key: "estMunicipio", label: "Delegación, municipio o alcaldía", required: true },
      { key: "estCp", label: "Código postal", required: true },
      { key: "estEstado", label: "Entidad federativa", required: true },
      { key: "estCiudad", label: "Ciudad o población", required: true },
      { key: "estPais", label: "País" },
      { key: "estTelefono", label: "Teléfono (con clave del país)", required: true, placeholder: "+52 55 1234 5678" },
      { key: "estCorreo", label: "Correo electrónico autorizado", required: true, type: "email" },
    ],
  },
  {
    title: "Datos con los que acredita existencia legal",
    hint: "Vienen de tu acta constitutiva. Si eres persona física, puedes dejarlos vacíos.",
    fields: [
      { key: "escrituraNumero", label: "Número de escritura pública / póliza" },
      { key: "fechaConstitucion", label: "Fecha de constitución", placeholder: "12 de marzo de 2014" },
      { key: "notariaNumero", label: "Número de notaría / correduría" },
      { key: "notariaEstado", label: "Entidad federativa del fedatario" },
      { key: "folioRppc", label: "Folio del registro en el RPPyC" },
      { key: "fechaRppc", label: "Fecha de inscripción en el RPPyC" },
      { key: "fedatarioNombre", label: "Nombre del fedatario" },
      { key: "paisNacionalidadEmpresa", label: "País de nacionalidad de la razón social" },
    ],
  },
  {
    title: "Representante legal",
    fields: [
      { key: "repNombre", label: "Nombre completo", required: true },
      { key: "repIdTipo", label: "Tipo de identificación", placeholder: "INE, pasaporte…" },
      { key: "repIdAutoridad", label: "Autoridad que la emite" },
      { key: "repIdNumero", label: "Número de identificación" },
      { key: "repFechaNacimiento", label: "Fecha de nacimiento" },
      { key: "repPaisNacimiento", label: "País de nacimiento" },
      { key: "repPaisNacionalidad", label: "País de nacionalidad" },
      { key: "repRfc", label: "R.F.C.", required: true },
      { key: "repCurp", label: "CURP", required: true },
    ],
  },
  {
    title: "Poder del representante legal",
    hint: "Si eres persona física, puedes dejar esta sección vacía.",
    fields: [
      { key: "poderEscritura", label: "Número de escritura del poder" },
      { key: "poderFecha", label: "Fecha de otorgamiento del poder" },
      { key: "poderFedatarioNumero", label: "Número de fedatario" },
      { key: "poderLocalidad", label: "Localidad" },
      { key: "poderFedatarioNombre", label: "Nombre del fedatario público" },
      { key: "poderFolioRppc", label: "Folio del registro en el RPPyC" },
      { key: "poderFechaRppc", label: "Fecha de inscripción en el RPPyC" },
    ],
  },
  {
    title: "Domicilio del representante legal",
    fields: [
      { key: "repCalle", label: "Calle y número ext. e int." },
      { key: "repColonia", label: "Colonia" },
      { key: "repMunicipio", label: "Delegación, municipio o alcaldía" },
      { key: "repCp", label: "Código postal" },
      { key: "repEstado", label: "Entidad federativa" },
      { key: "repCiudad", label: "Ciudad o población" },
      { key: "repPais", label: "País" },
      { key: "repTelefono", label: "Teléfono (con clave del país)" },
      { key: "repCorreo", label: "Correo electrónico", type: "email" },
    ],
  },
]

const ALL_KEYS = SECTIONS.flatMap((s) => s.fields.map((f) => f.key))

// La carátula firmada usa DD/MM/AAAA
function todayShort() {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, "0")
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`
}

interface Props {
  appId: string
  documentId: string
  initialData: Record<string, string>
  initialFileName: string | null
}

export function AmexCoverForm({ appId, documentId, initialData, initialFileName }: Props) {
  const router = useRouter()
  const [form, setForm] = useState<Record<string, string>>(() => {
    const base: Record<string, string> = {}
    for (const k of ALL_KEYS) base[k] = ""
    base.fiscalPais = "México"
    base.estPais = "México"
    base.repPais = "México"
    base.paisNacionalidadEmpresa = "México"
    base.repPaisNacimiento = "México"
    base.repPaisNacionalidad = "México"
    return { ...base, ...initialData }
  })
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [generated, setGenerated] = useState(false)

  const [uploading, setUploading] = useState(false)
  const [uploadedName, setUploadedName] = useState<string | null>(initialFileName)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }))

  // Memoria: el borrador se guarda solo mientras escribe (caso Carmen 24-ago:
  // llenó el 90 %, se fue a una junta en incógnito y perdió todo)
  const draftState = useDraftAutosave(appId, "amex_cover", form)

  function copyFiscalAddress() {
    setForm((p) => ({
      ...p,
      estCalle: p.fiscalCalle,
      estColonia: p.fiscalColonia,
      estMunicipio: p.fiscalMunicipio,
      estCp: p.fiscalCp,
      estEstado: p.fiscalEstado,
      estCiudad: p.fiscalCiudad,
      estPais: p.fiscalPais,
    }))
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setGenerating(true)
    try {
      const res = await fetch("/api/forms/amex-cover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId: appId,
          data: { ...form, fechaFirma: todayShort() },
        }),
      })
      const json = await res.json()
      if (!res.ok || json.error) {
        setError(json.error ?? "No se pudo generar la carátula")
        return
      }
      const binary = atob(json.base64)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
      const blob = new Blob([bytes.buffer as ArrayBuffer], { type: json.mime })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = json.filename
      a.click()
      URL.revokeObjectURL(url)
      setGenerated(true)
    } catch {
      setError("Error de conexión, intenta de nuevo")
    } finally {
      setGenerating(false)
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ""
    setUploadError(null)
    setUploading(true)
    try {
      const result = await uploadDocumentFile(documentId, file)
      if (!result.success) {
        setUploadError(result.error ?? "Error al subir el archivo")
      } else {
        setUploadedName(file.name)
        router.refresh()
      }
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Paso 1 */}
      <form onSubmit={handleGenerate} className="space-y-6">
      {draftLabel(draftState) && (
        <p style={{ margin: "0 0 10px", fontSize: 12, color: draftState === "error" ? "#B91C1C" : "#1f7a4d" }}>
          {draftLabel(draftState)}
        </p>
      )}
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm font-semibold text-foreground">
            1. Contesta tus datos y descarga la carátula
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Generamos el documento oficial de American Express con tus datos ya
            escritos. El formato lo pone Payefy: tú solo lo firmas.
          </p>
        </div>

        {SECTIONS.map((section) => (
          <div key={section.title} className="rounded-lg border p-4">
            <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
              <div>
                <h3 className="text-sm font-semibold">{section.title}</h3>
                {section.hint && (
                  <p className="text-xs text-muted-foreground mt-0.5">{section.hint}</p>
                )}
              </div>
              {section.title === "Domicilio del establecimiento" && (
                <button
                  type="button"
                  onClick={copyFiscalAddress}
                  className="text-xs font-semibold hover:underline"
                  style={{ color: "#0B7A44", background: "none", border: "none", cursor: "pointer" }}
                >
                  Copiar del domicilio fiscal
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {section.fields.map((f) => (
                <div key={f.key} className="space-y-1.5">
                  <Label htmlFor={f.key} className="text-xs">
                    {f.label}
                    {f.required && <span className="text-destructive"> *</span>}
                  </Label>
                  <Input
                    id={f.key}
                    type={f.type ?? "text"}
                    value={form[f.key] ?? ""}
                    onChange={(e) => set(f.key, e.target.value)}
                    placeholder={f.placeholder}
                    required={f.required}
                    disabled={generating}
                    className="h-9 text-sm"
                  />
                </div>
              ))}
            </div>
          </div>
        ))}

        {error && (
          <p className="text-sm text-destructive flex items-center gap-1.5" role="alert">
            <AlertTriangle className="h-4 w-4" />
            {error}
          </p>
        )}

        <Button
          type="submit"
          disabled={generating}
          className="flex items-center gap-1.5"
          style={{ background: "#004238", color: "#AEFF99" }}
        >
          {generating ? <Spinner size={14} /> : <Download className="h-4 w-4" />}
          {generating ? "Generando…" : "Generar y descargar carátula"}
        </Button>
      </form>

      {/* Paso 2 */}
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <div>
          <p className="text-sm font-semibold text-foreground">
            2. Fírmala y súbela
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Imprime la carátula, fírmala de forma autógrafa y sube aquí el
            documento escaneado en PDF. No modifiques el archivo: American
            Express exige que el formato quede idéntico.
          </p>
        </div>

        {generated && !uploadedName && (
          <p className="text-xs text-emerald-700 flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Carátula descargada. Ahora fírmala y súbela aquí.
          </p>
        )}

        {uploadedName && (
          <p className="text-sm text-emerald-700 flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4" />
            {uploadedName}
          </p>
        )}

        {uploadError && (
          <p className="text-sm text-destructive flex items-center gap-1.5" role="alert">
            <AlertTriangle className="h-4 w-4" />
            {uploadError}
          </p>
        )}

        <input
          ref={fileRef}
          type="file"
          accept=".pdf,image/*"
          className="hidden"
          onChange={handleUpload}
        />
        <Button
          type="button"
          variant="outline"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
          className="flex items-center gap-1.5"
        >
          {uploading ? <Spinner size={14} /> : <Upload className="h-4 w-4" />}
          {uploadedName ? "Reemplazar archivo firmado" : "Subir carátula firmada"}
        </Button>
      </div>
    </div>
  )
}
