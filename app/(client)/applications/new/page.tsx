"use client"

import { useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { createApplications } from "../actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"

type ProductOption = "cards" | "terminals" | "both"
type PersonType = "persona_fisica" | "persona_moral"

const OPTION_META: Record<
  ProductOption,
  { label: string; description: string; products: ("cards" | "terminals")[] }
> = {
  cards: {
    label: "Solo Tarjeta Payefy",
    description: "Líneas de crédito empresariales para financiar tu negocio.",
    products: ["cards"],
  },
  terminals: {
    label: "Solo Terminal TPV",
    description: "Acepta pagos con tarjeta en tu punto de venta o e-commerce.",
    products: ["terminals"],
  },
  both: {
    label: "Tarjeta + Terminal",
    description: "Ambos productos en un solo proceso de onboarding.",
    products: ["cards", "terminals"],
  },
}

function parseProductParam(param: string | null): {
  selected: ProductOption | null
  skipStep1: boolean
} {
  if (!param) return { selected: null, skipStep1: false }
  if (param === "both") return { selected: "both", skipStep1: true }
  if (param === "cards") return { selected: "cards", skipStep1: true }
  if (param === "terminals") return { selected: "terminals", skipStep1: true }
  if (param === "cards,terminals" || param === "terminals,cards")
    return { selected: "both", skipStep1: true }
  return { selected: null, skipStep1: false }
}

function CheckIcon() {
  return (
    <svg
      className="h-3 w-3 text-white"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={3}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  )
}

function WizardContent() {
  const searchParams = useSearchParams()
  const urlError = searchParams.get("error")

  const { selected: initialSelected, skipStep1 } = parseProductParam(
    searchParams.get("product")
  )

  const [step, setStep] = useState(skipStep1 ? 2 : 1)
  const [selected, setSelected] = useState<ProductOption | null>(initialSelected)
  const [terminalType, setTerminalType] = useState("")
  const [personType, setPersonType] = useState<PersonType | "">("")

  const hasTerminals = selected === "terminals" || selected === "both"
  const products = selected ? OPTION_META[selected].products : []

  const selectedLabel = selected ? OPTION_META[selected].label : ""

  return (
    <div className="max-w-xl mx-auto p-6 sm:p-8">
      {/* Progress */}
      <div className="flex items-center gap-2 mb-8">
        <Badge variant={step === 1 ? "default" : "pending"}>1. Producto</Badge>
        <div className="h-px flex-1 bg-border" />
        <Badge variant={step === 2 ? "default" : "pending"}>2. Empresa</Badge>
      </div>

      {urlError && step === 2 && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{urlError}</AlertDescription>
        </Alert>
      )}

      {/* Paso 1 */}
      {step === 1 && (
        <div className="space-y-4">
          <h1 className="text-xl font-bold">¿Qué producto necesitas?</h1>
          <p className="text-sm text-muted-foreground">
            Selecciona una opción. Puedes cambiarla antes de enviar tu solicitud.
          </p>

          {(["cards", "terminals", "both"] as ProductOption[]).map((opt) => {
            const meta = OPTION_META[opt]
            const isSelected = selected === opt
            return (
              <button
                key={opt}
                type="button"
                onClick={() => setSelected(opt)}
                className={`w-full text-left rounded-xl border-2 p-4 transition-colors ${
                  isSelected
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-0.5 h-5 w-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                      isSelected ? "border-primary bg-primary" : "border-input"
                    }`}
                  >
                    {isSelected && <div className="h-2 w-2 rounded-full bg-white" />}
                  </div>
                  <div>
                    <p className="font-semibold">{meta.label}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {meta.description}
                    </p>
                  </div>
                </div>
              </button>
            )
          })}

          <Button
            type="button"
            className="w-full"
            disabled={!selected}
            onClick={() => setStep(2)}
          >
            Continuar
          </Button>
        </div>
      )}

      {/* Paso 2 */}
      {step === 2 && (
        <div className="space-y-4">
          {/* Banner de producto seleccionado */}
          <div className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 px-4 py-2.5 text-sm">
            <span className="text-muted-foreground">
              Producto: <span className="font-medium text-foreground">{selectedLabel}</span>
            </span>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="font-medium text-primary hover:underline"
            >
              ← Cambiar
            </button>
          </div>

          <h1 className="text-xl font-bold">Datos de tu empresa</h1>
          <p className="text-sm text-muted-foreground">
            Ingresa los datos fiscales de la empresa que solicitará el producto.
          </p>

          {/* Tipo de persona — requerido cuando el producto incluye terminales */}
          {hasTerminals && (
            <div className="space-y-2">
              <Label>Tipo de persona <span className="text-destructive">*</span></Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(
                  [
                    { value: "persona_moral", label: "Persona Moral", sub: "Empresa / Sociedad" },
                    { value: "persona_fisica", label: "Persona Física", sub: "Con actividad empresarial" },
                  ] as { value: PersonType; label: string; sub: string }[]
                ).map(({ value, label, sub }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setPersonType(value)}
                    className={`text-left rounded-xl border-2 p-3 transition-colors ${
                      personType === value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <div
                        className={`mt-0.5 h-4 w-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                          personType === value ? "border-primary bg-primary" : "border-input"
                        }`}
                      >
                        {personType === value && (
                          <div className="h-1.5 w-1.5 rounded-full bg-white" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-semibold leading-tight">{label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <form action={createApplications} className="space-y-4">
            {/* Hidden: productos seleccionados */}
            {products.map((p) => (
              <input key={p} type="hidden" name="products" value={p} />
            ))}
            {terminalType && (
              <input type="hidden" name="terminal_type" value={terminalType} />
            )}
            {personType && (
              <input type="hidden" name="person_type" value={personType} />
            )}

            {hasTerminals && (
              <div className="space-y-2">
                <Label htmlFor="terminal_type_select">
                  Modalidad de la terminal{" "}
                  <span className="text-muted-foreground font-normal">(opcional)</span>
                </Label>
                <Select
                  id="terminal_type_select"
                  value={terminalType}
                  onChange={(e) => setTerminalType(e.target.value)}
                >
                  <option value="">Selecciona una modalidad</option>
                  <option value="card_present">Tarjeta Presente (punto de venta)</option>
                  <option value="ecommerce">E-commerce (tienda en línea)</option>
                  <option value="both">Ambas modalidades</option>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="legal_name">Razón social</Label>
              <Input
                id="legal_name"
                name="legal_name"
                placeholder="Empresa Ejemplo S.A. de C.V."
                required
                minLength={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tax_id">RFC</Label>
              <Input
                id="tax_id"
                name="tax_id"
                placeholder="EJE900101ABC"
                required
                minLength={12}
                maxLength={13}
                className="uppercase"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="operator_email">Correo empresarial</Label>
              <Input
                id="operator_email"
                name="operator_email"
                type="email"
                placeholder="operaciones@miempresa.com"
                required
              />
              <p className="text-xs text-muted-foreground">
                Se usará para comunicaciones operativas
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setStep(1)}
              >
                Atrás
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={hasTerminals && !personType}
              >
                Crear solicitud
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

export default function NewApplicationPage() {
  return (
    <Suspense fallback={null}>
      <WizardContent />
    </Suspense>
  )
}
