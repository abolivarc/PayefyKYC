"use client"

import { useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { createApplications } from "../actions"

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

const T = {
  bg: "#F4F8F6",
  surface: "#FFFFFF",
  surface2: "#FBFCFD",
  border: "#E7ECF1",
  borderStrong: "#D6DEE6",
  text: "#0F1B2A",
  textMuted: "#5A6B7B",
  textSubtle: "#8A99A8",
  brand: "#A8F898",
  brandStrong: "#0B7A44",
  brandSoft: "#EDFBEA",
  req: "#E0245E",
  shadowSm: "0 1px 2px rgba(16,30,45,.05)",
} as const

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "11px 14px",
  fontSize: 14,
  fontFamily: "inherit",
  color: T.text,
  background: T.surface,
  border: `1px solid ${T.border}`,
  borderRadius: 10,
  outline: "none",
  boxSizing: "border-box",
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontFamily: "var(--font-display)",
  fontWeight: 600,
  fontSize: 14,
  color: T.text,
  marginBottom: 3,
}

const sectionHeadStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: ".07em",
  textTransform: "uppercase",
  color: T.brandStrong,
  paddingBottom: 8,
  borderBottom: `1px solid ${T.border}`,
  marginBottom: 16,
}

const helpStyle: React.CSSProperties = {
  fontSize: 13,
  color: T.textMuted,
  margin: "0 0 8px",
}

function StepNum({ n }: { n: number }) {
  return (
    <span
      style={{
        width: 34,
        height: 34,
        flexShrink: 0,
        borderRadius: "50%",
        background: T.brand,
        color: "#08130C",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "var(--font-display)",
        fontWeight: 800,
        fontSize: 14,
      }}
    >
      {n}
    </span>
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
    <div style={{ background: T.bg, minHeight: "100vh" }}>
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "28px 20px 72px" }}>

        {/* Step rail */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: 24,
            background: T.surface,
            border: `1px solid ${T.border}`,
            borderRadius: 16,
            boxShadow: T.shadowSm,
            padding: "13px 20px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <span
              style={{
                width: 26,
                height: 26,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                fontWeight: 700,
                border: `2px solid ${step > 1 ? T.brandStrong : T.brand}`,
                background: step > 1 ? T.brandStrong : T.brand,
                color: step > 1 ? "#fff" : "#08130C",
              }}
            >
              {step > 1 ? (
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : "1"}
            </span>
            <span
              style={{
                fontSize: 13,
                fontWeight: step === 1 ? 700 : 600,
                color: step === 1 ? T.text : T.textSubtle,
                whiteSpace: "nowrap",
              }}
            >
              Producto
            </span>
          </div>

          <div
            style={{
              flex: 1,
              minWidth: 14,
              height: 2,
              background: step > 1 ? T.brandStrong : T.border,
              margin: "0 8px",
            }}
          />

          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <span
              style={{
                width: 26,
                height: 26,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                fontWeight: 700,
                border: `2px solid ${step === 2 ? T.brand : T.border}`,
                background: step === 2 ? T.brand : T.surface,
                color: step === 2 ? "#08130C" : T.textSubtle,
              }}
            >
              2
            </span>
            <span
              style={{
                fontSize: 13,
                fontWeight: step === 2 ? 700 : 600,
                color: step === 2 ? T.text : T.textSubtle,
                whiteSpace: "nowrap",
              }}
            >
              Empresa
            </span>
          </div>
        </div>

        {/* Error banner */}
        {urlError && step === 2 && (
          <div
            style={{
              marginBottom: 16,
              padding: "12px 16px",
              background: "#FEF2F2",
              border: "1px solid #FBDADA",
              borderRadius: 10,
              color: "#B91C1C",
              fontSize: 14,
            }}
          >
            {urlError}
          </div>
        )}

        {/* ─── STEP 1: Product ─── */}
        {step === 1 && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 13, marginBottom: 6 }}>
              <StepNum n={1} />
              <h1
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 26,
                  fontWeight: 800,
                  letterSpacing: "-.02em",
                  margin: 0,
                  color: T.text,
                }}
              >
                ¿Qué producto necesitas?
              </h1>
            </div>
            <p style={{ fontSize: 14, color: T.textMuted, margin: "0 0 20px 47px" }}>
              Selecciona una opción. Puedes cambiarla antes de enviar tu solicitud.
            </p>

            <div
              style={{
                background: T.surface,
                border: `1px solid ${T.border}`,
                borderRadius: 16,
                boxShadow: T.shadowSm,
                padding: "24px 24px 20px",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {(["cards", "terminals", "both"] as ProductOption[]).map((opt) => {
                  const meta = OPTION_META[opt]
                  const isSelected = selected === opt
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setSelected(opt)}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        borderRadius: 11,
                        border: `2px solid ${isSelected ? T.brandStrong : T.border}`,
                        background: isSelected ? T.brandSoft : T.surface,
                        padding: "14px 16px",
                        cursor: "pointer",
                        transition: "border-color 0.14s, background 0.14s",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                        <div
                          style={{
                            marginTop: 2,
                            width: 20,
                            height: 20,
                            borderRadius: "50%",
                            border: `2px solid ${isSelected ? T.brandStrong : T.borderStrong}`,
                            background: isSelected ? T.brandStrong : T.surface,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          {isSelected && (
                            <div
                              style={{ width: 8, height: 8, borderRadius: "50%", background: "#fff" }}
                            />
                          )}
                        </div>
                        <div>
                          <p
                            style={{
                              fontFamily: "var(--font-display)",
                              fontWeight: 700,
                              fontSize: 14,
                              color: T.text,
                              margin: "0 0 2px",
                            }}
                          >
                            {meta.label}
                          </p>
                          <p style={{ fontSize: 13, color: T.textMuted, margin: 0 }}>
                            {meta.description}
                          </p>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 24 }}>
              <button
                type="button"
                disabled={!selected}
                onClick={() => setStep(2)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  fontFamily: "var(--font-display)",
                  fontSize: 13,
                  fontWeight: 600,
                  padding: "10px 22px",
                  borderRadius: 10,
                  border: "1px solid transparent",
                  background: selected ? T.brand : T.borderStrong,
                  color: selected ? "#08130C" : T.textSubtle,
                  cursor: selected ? "pointer" : "not-allowed",
                  transition: "background 0.14s",
                }}
              >
                Continuar
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* ─── STEP 2: Company ─── */}
        {step === 2 && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 13, marginBottom: 6 }}>
              <StepNum n={2} />
              <h1
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 26,
                  fontWeight: 800,
                  letterSpacing: "-.02em",
                  margin: 0,
                  color: T.text,
                }}
              >
                Datos de tu empresa
              </h1>
            </div>
            <p style={{ fontSize: 14, color: T.textMuted, margin: "0 0 16px 47px" }}>
              Ingresa los datos fiscales de la empresa que solicitará el producto.
            </p>

            {/* Selected product chip */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderRadius: 10,
                border: `1px solid ${T.border}`,
                background: T.brandSoft,
                padding: "9px 14px",
                marginBottom: 20,
                fontSize: 13,
              }}
            >
              <span style={{ color: T.textMuted }}>
                Producto:{" "}
                <strong style={{ color: T.text }}>{selectedLabel}</strong>
              </span>
              <button
                type="button"
                onClick={() => setStep(1)}
                style={{
                  border: 0,
                  background: "transparent",
                  fontSize: 13,
                  fontWeight: 600,
                  color: T.brandStrong,
                  cursor: "pointer",
                  padding: "3px 7px",
                  borderRadius: 6,
                }}
              >
                ← Cambiar
              </button>
            </div>

            <form action={createApplications}>
              {products.map((p) => (
                <input key={p} type="hidden" name="products" value={p} />
              ))}
              {terminalType && (
                <input type="hidden" name="terminal_type" value={terminalType} />
              )}
              {personType && (
                <input type="hidden" name="person_type" value={personType} />
              )}

              <div
                style={{
                  background: T.surface,
                  border: `1px solid ${T.border}`,
                  borderRadius: 16,
                  boxShadow: T.shadowSm,
                  padding: "24px 24px 20px",
                }}
              >
                {/* Tipo de persona */}
                {hasTerminals && (
                  <div style={{ marginBottom: 28 }}>
                    <div style={sectionHeadStyle}>Tipo de empresa</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
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
                          style={{
                            textAlign: "left",
                            borderRadius: 10,
                            border: `2px solid ${personType === value ? T.brandStrong : T.border}`,
                            background: personType === value ? T.brandSoft : T.surface,
                            padding: "12px 14px",
                            cursor: "pointer",
                            transition: "border-color 0.14s, background 0.14s",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                            <div
                              style={{
                                marginTop: 2,
                                width: 16,
                                height: 16,
                                borderRadius: "50%",
                                border: `2px solid ${personType === value ? T.brandStrong : T.borderStrong}`,
                                background: personType === value ? T.brandStrong : T.surface,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                              }}
                            >
                              {personType === value && (
                                <div
                                  style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff" }}
                                />
                              )}
                            </div>
                            <div>
                              <p
                                style={{
                                  fontFamily: "var(--font-display)",
                                  fontWeight: 700,
                                  fontSize: 13,
                                  color: T.text,
                                  margin: "0 0 2px",
                                }}
                              >
                                {label}
                              </p>
                              <p style={{ fontSize: 12, color: T.textMuted, margin: 0 }}>{sub}</p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Modalidad terminal */}
                {hasTerminals && (
                  <div style={{ marginBottom: 28 }}>
                    <div style={sectionHeadStyle}>Modalidad de la terminal</div>
                    <div>
                      <label htmlFor="terminal_type_select" style={labelStyle}>
                        Modalidad{" "}
                        <span style={{ color: T.textSubtle, fontWeight: 500 }}>(opcional)</span>
                      </label>
                      <div style={{ position: "relative" }}>
                        <select
                          id="terminal_type_select"
                          value={terminalType}
                          onChange={(e) => setTerminalType(e.target.value)}
                          style={{ ...inputStyle, appearance: "none", WebkitAppearance: "none" }}
                        >
                          <option value="">Selecciona una modalidad</option>
                          <option value="card_present">Tarjeta Presente (punto de venta)</option>
                          <option value="ecommerce">E-commerce (tienda en línea)</option>
                          <option value="both">Ambas modalidades</option>
                        </select>
                        <svg
                          style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: T.textSubtle }}
                          width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
                        </svg>
                      </div>
                    </div>
                  </div>
                )}

                {/* Datos fiscales */}
                <div>
                  <div style={sectionHeadStyle}>Datos de la empresa</div>

                  <div style={{ marginBottom: 16 }}>
                    <label htmlFor="legal_name" style={labelStyle}>
                      Razón social <span style={{ color: T.req }}>*</span>
                    </label>
                    <input
                      id="legal_name"
                      name="legal_name"
                      placeholder="Empresa Ejemplo S.A. de C.V."
                      required
                      minLength={3}
                      style={inputStyle}
                    />
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <label htmlFor="tax_id" style={labelStyle}>
                      RFC <span style={{ color: T.req }}>*</span>
                    </label>
                    <p style={helpStyle}>12 caracteres para personas físicas, 13 para personas morales.</p>
                    <input
                      id="tax_id"
                      name="tax_id"
                      placeholder="EJE900101ABC"
                      required
                      minLength={12}
                      maxLength={13}
                      style={{
                        ...inputStyle,
                        fontFamily: "var(--font-mono)",
                        letterSpacing: ".04em",
                        textTransform: "uppercase",
                      }}
                    />
                  </div>

                  <div>
                    <label htmlFor="operator_email" style={labelStyle}>
                      Correo empresarial <span style={{ color: T.req }}>*</span>
                    </label>
                    <p style={helpStyle}>Se usará para comunicaciones operativas.</p>
                    <input
                      id="operator_email"
                      name="operator_email"
                      type="email"
                      placeholder="operaciones@miempresa.com"
                      required
                      style={inputStyle}
                    />
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginTop: 24,
                  gap: 12,
                }}
              >
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    fontFamily: "var(--font-display)",
                    fontSize: 13,
                    fontWeight: 600,
                    padding: "10px 20px",
                    borderRadius: 10,
                    border: `1px solid ${T.border}`,
                    background: T.surface,
                    color: T.textMuted,
                    cursor: "pointer",
                    transition: "background 0.14s, border-color 0.14s, color 0.14s",
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 18l-6-6 6-6" />
                  </svg>
                  Atrás
                </button>
                <button
                  type="submit"
                  disabled={hasTerminals && !personType}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    fontFamily: "var(--font-display)",
                    fontSize: 13,
                    fontWeight: 600,
                    padding: "10px 24px",
                    borderRadius: 10,
                    border: "1px solid transparent",
                    background: hasTerminals && !personType ? T.borderStrong : T.brand,
                    color: hasTerminals && !personType ? T.textSubtle : "#08130C",
                    cursor: hasTerminals && !personType ? "not-allowed" : "pointer",
                    transition: "background 0.14s",
                  }}
                >
                  Crear solicitud
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6" />
                  </svg>
                </button>
              </div>
            </form>
          </div>
        )}

      </div>
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
