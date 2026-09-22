"use client"

import Link from "next/link"
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Spinner } from "@/components/ui/spinner"
import { sendQuote } from "@/lib/proposals/quote-actions"

/** Propuesta vieja del generador que parece ser de este mismo comercio */
export type LeadSuggestion = {
  id: string
  business_name: string
  created_at: string
  sector_name: string | null
  debit_rate: number | null
  credit_rate: number | null
  /** Por qué creemos que es el mismo negocio ("mismo correo de contacto") */
  reason: string
}

export type QuoteSummary = {
  mcc_code: string
  sector_name: string | null
  debit_rate: number
  credit_rate: number
  amex_rate: number | null
  international_rate: number | null
  pdf_storage_path: string | null
  sent_at: string | null
  sent_to: string | null
}

/**
 * Cotización del expediente. Un comercio que llega por redes empieza a subir
 * documentos sin que nadie le haya puesto precio: este bloque es el
 * recordatorio y el acceso para cotizar sin salir del KYC.
 */
export function QuotePanel({
  applicationId,
  quote,
  canQuote,
  csfSubida,
  suggestions = [],
}: {
  applicationId: string
  quote: QuoteSummary | null
  canQuote: boolean
  /** La constancia de situación fiscal ya está cargada: hay con qué cotizar */
  csfSubida: boolean
  /** Propuestas anteriores del generador que parecen ser de este comercio */
  suggestions?: LeadSuggestion[]
}) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function enviar() {
    if (!confirm("Se enviará la propuesta al correo del comercio, con el PDF adjunto. ¿Continuar?")) return
    setError(null)
    startTransition(async () => {
      const res = await sendQuote(applicationId)
      if (res.error) setError(res.error)
      else router.refresh()
    })
  }

  // ── Sin cotizar ──────────────────────────────────────────────────
  if (!quote) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div
          style={{
            background: csfSubida ? "#FFFBEB" : "var(--admin-surface, #fff)",
            border: `1px solid ${csfSubida ? "#F59E0B" : "var(--admin-border, #E7ECF1)"}`,
            borderRadius: 12,
            padding: "14px 18px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: csfSubida ? "#92400E" : "var(--admin-text, #0F1B2A)" }}>
              {csfSubida ? "Falta cotizar a este comercio" : "Sin cotización"}
            </p>
            <p style={{ margin: "3px 0 0", fontSize: 12.5, color: csfSubida ? "#92400E" : "var(--admin-text-muted, #5A6B7B)" }}>
              {csfSubida
                ? "Ya subió su constancia de situación fiscal: puedes asignarle el MCC y sus tasas, y mandarle la propuesta."
                : "En cuanto suba su constancia de situación fiscal podrás asignarle MCC y tasas."}
            </p>
          </div>
          {canQuote && (
            <Link
              href={`/admin/applications/${applicationId}/quote`}
              style={{
                background: "#004238", color: "#AEFF99", padding: "9px 16px",
                borderRadius: 9, fontSize: 13, fontWeight: 700, textDecoration: "none",
                whiteSpace: "nowrap",
              }}
            >
              Cotizar →
            </Link>
          )}
        </div>

        <LeadSuggestions
          applicationId={applicationId}
          suggestions={suggestions}
          canQuote={canQuote}
        />
      </div>
    )
  }

  // ── Ya cotizado ──────────────────────────────────────────────────
  const tasas = [
    { k: "Débito", v: quote.debit_rate },
    { k: "Crédito", v: quote.credit_rate },
    ...(quote.amex_rate ? [{ k: "AMEX", v: quote.amex_rate }] : []),
    ...(quote.international_rate ? [{ k: "Internacional", v: quote.international_rate }] : []),
  ]

  return (
    <div
      style={{
        background: "var(--admin-surface, #fff)",
        border: "1px solid var(--admin-border, #E7ECF1)",
        borderRadius: 12,
        padding: "14px 18px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "var(--admin-text, #0F1B2A)" }}>
            Cotización · MCC {quote.mcc_code}
            {quote.sector_name && (
              <span style={{ fontWeight: 500, color: "var(--admin-text-muted, #5A6B7B)" }}> · {quote.sector_name}</span>
            )}
          </p>
          <p style={{ margin: "3px 0 0", fontSize: 12.5, color: quote.sent_at ? "#1f7a4d" : "#92400E" }}>
            {quote.sent_at
              ? `Enviada al cliente el ${new Date(quote.sent_at).toLocaleDateString("es-MX", { day: "numeric", month: "long" })}${quote.sent_to ? ` · ${quote.sent_to}` : ""}`
              : "Guardada, pendiente de enviar al cliente"}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {quote.pdf_storage_path && (
            <a
              href={`/api/quotes/${applicationId}/view`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: 12.5, fontWeight: 600, color: "#1f7a4d", textDecoration: "none",
                padding: "7px 12px", borderRadius: 8, border: "1px solid #b8e8ca", background: "#e7f6ec",
              }}
            >
              Ver PDF
            </a>
          )}
          {canQuote && (
            <>
              <Link
                href={`/admin/applications/${applicationId}/quote`}
                style={{
                  fontSize: 12.5, fontWeight: 600, padding: "7px 12px", borderRadius: 8,
                  border: "1px solid var(--admin-border, #E7ECF1)", textDecoration: "none",
                  color: "var(--admin-text-muted, #5A6B7B)",
                }}
              >
                Recotizar
              </Link>
              <button
                type="button"
                onClick={enviar}
                disabled={isPending}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  fontSize: 12.5, fontWeight: 700, padding: "8px 14px", borderRadius: 8,
                  border: "none", background: "#004238", color: "#AEFF99", cursor: "pointer",
                }}
              >
                {isPending && <Spinner size={12} />}
                {quote.sent_at ? "Reenviar al cliente" : "Enviar al cliente"}
              </button>
            </>
          )}
        </div>
      </div>

      <div style={{ display: "flex", gap: 18, marginTop: 12, flexWrap: "wrap" }}>
        {tasas.map((t) => (
          <div key={t.k}>
            <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--admin-text-muted, #5A6B7B)" }}>
              {t.k}
            </p>
            <p style={{ margin: "2px 0 0", fontSize: 18, fontWeight: 800, color: "#004238", letterSpacing: "-.02em" }}>
              {t.v}<span style={{ fontSize: 11 }}>%</span>
              <span style={{ fontSize: 9.5, fontWeight: 600, color: "var(--admin-text-muted, #5A6B7B)" }}> + IVA</span>
            </p>
          </div>
        ))}
      </div>

      {error && (
        <p role="alert" style={{ margin: "10px 0 0", fontSize: 12, color: "#B91C1C" }}>{error}</p>
      )}
    </div>
  )
}

/**
 * Propuestas que ya se le habían hecho a este negocio desde el generador.
 * Un comercio se registra con su razón social y la propuesta se hizo con el
 * nombre comercial, así que nadie las relaciona a mano: aquí se ofrecen para
 * no volver a teclear las tasas que ya se le prometieron.
 */
function LeadSuggestions({
  applicationId,
  suggestions,
  canQuote,
}: {
  applicationId: string
  suggestions: LeadSuggestion[]
  canQuote: boolean
}) {
  if (suggestions.length === 0) return null

  return (
    <div
      style={{
        background: "#F0FDF4",
        border: "1px solid #BBF7D0",
        borderRadius: 12,
        padding: "12px 18px",
      }}
    >
      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#166534" }}>
        {suggestions.length === 1
          ? "Ya le habías hecho una propuesta a este negocio"
          : `Ya le habías hecho ${suggestions.length} propuestas a este negocio`}
      </p>
      <p style={{ margin: "2px 0 8px", fontSize: 12, color: "#15803D" }}>
        Viene del generador de propuestas. Al retomarla, sus tasas entran ya puestas y el lead queda vinculado a este comercio.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {suggestions.map((s) => (
          <div
            key={s.id}
            style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              gap: 12, flexWrap: "wrap",
              background: "#fff", border: "1px solid #D1FAE5", borderRadius: 9,
              padding: "9px 12px",
            }}
          >
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--admin-text, #0F1B2A)" }}>
                {s.business_name}
                {s.debit_rate != null && (
                  <span style={{ fontWeight: 500, color: "var(--admin-text-muted, #5A6B7B)" }}>
                    {" "}· D {s.debit_rate}% · C {s.credit_rate}% + IVA
                  </span>
                )}
              </p>
              <p style={{ margin: "2px 0 0", fontSize: 11.5, color: "var(--admin-text-subtle, #64748B)" }}>
                {new Date(s.created_at).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })}
                {s.sector_name ? ` · ${s.sector_name.split("—")[0].trim()}` : ""} · {s.reason}
              </p>
            </div>
            {canQuote && (
              <Link
                href={`/admin/applications/${applicationId}/quote?lead=${s.id}`}
                style={{
                  background: "#166534", color: "#fff", padding: "7px 13px",
                  borderRadius: 8, fontSize: 12.5, fontWeight: 700,
                  textDecoration: "none", whiteSpace: "nowrap",
                }}
              >
                Usar esta propuesta →
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
