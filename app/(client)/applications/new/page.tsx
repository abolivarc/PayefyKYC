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

type ProductCode = "cards" | "terminals"

function WizardContent() {
  const searchParams = useSearchParams()
  const urlError = searchParams.get("error")
  const preselected = searchParams.get("product") as ProductCode | null

  const [step, setStep] = useState(1)
  const [selectedProducts, setSelectedProducts] = useState<ProductCode[]>(
    preselected ? [preselected] : []
  )
  const [terminalType, setTerminalType] = useState("")

  const toggleProduct = (code: ProductCode) => {
    setSelectedProducts((prev) =>
      prev.includes(code) ? prev.filter((p) => p !== code) : [...prev, code]
    )
  }

  const hasTerminals = selectedProducts.includes("terminals")

  return (
    <div className="max-w-xl mx-auto p-6 sm:p-8">
      {/* Progress */}
      <div className="flex items-center gap-2 mb-8">
        <Badge variant={step === 1 ? "default" : "pending"}>1. Productos</Badge>
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
          <h1 className="text-xl font-bold">¿Qué producto(s) necesitas?</h1>
          <p className="text-sm text-muted-foreground">
            Puedes solicitar uno o ambos. Se creará un expediente por producto.
          </p>

          <button
            type="button"
            onClick={() => toggleProduct("cards")}
            className={`w-full text-left rounded-xl border-2 p-4 transition-colors ${
              selectedProducts.includes("cards")
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`mt-0.5 h-5 w-5 rounded border-2 flex items-center justify-center ${
                  selectedProducts.includes("cards")
                    ? "border-primary bg-primary"
                    : "border-input"
                }`}
              >
                {selectedProducts.includes("cards") && (
                  <svg
                    className="h-3 w-3 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </div>
              <div>
                <p className="font-semibold">Tarjetas de crédito empresariales</p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Líneas de crédito para financiar tu negocio con Payefy.
                </p>
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => toggleProduct("terminals")}
            className={`w-full text-left rounded-xl border-2 p-4 transition-colors ${
              selectedProducts.includes("terminals")
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`mt-0.5 h-5 w-5 rounded border-2 flex items-center justify-center ${
                  selectedProducts.includes("terminals")
                    ? "border-primary bg-primary"
                    : "border-input"
                }`}
              >
                {selectedProducts.includes("terminals") && (
                  <svg
                    className="h-3 w-3 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </div>
              <div>
                <p className="font-semibold">Terminales TPV</p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Acepta pagos con tarjeta en tu punto de venta o e-commerce.
                </p>
              </div>
            </div>
          </button>

          {hasTerminals && (
            <div className="space-y-2 pt-1">
              <Label htmlFor="terminal_type_select">
                Modalidad de la terminal
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

          <Button
            type="button"
            className="w-full"
            disabled={
              selectedProducts.length === 0 ||
              (hasTerminals && !terminalType)
            }
            onClick={() => setStep(2)}
          >
            Continuar
          </Button>
        </div>
      )}

      {/* Paso 2 */}
      {step === 2 && (
        <div className="space-y-4">
          <h1 className="text-xl font-bold">Datos de tu empresa</h1>
          <p className="text-sm text-muted-foreground">
            Ingresa los datos fiscales de la empresa que solicitará el producto.
          </p>

          <form action={createApplications} className="space-y-4">
            {/* Hidden: productos seleccionados */}
            {selectedProducts.map((p) => (
              <input key={p} type="hidden" name="products" value={p} />
            ))}
            {terminalType && (
              <input type="hidden" name="terminal_type" value={terminalType} />
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
              <Label htmlFor="phone">Teléfono</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                placeholder="5512345678"
                required
                minLength={10}
              />
            </div>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setStep(1)}
              >
                Atrás
              </Button>
              <Button type="submit" className="flex-1">
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
