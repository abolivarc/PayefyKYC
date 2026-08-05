"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { sendExpedienteEmail, type EmailTemplateKey } from "@/app/(admin)/admin/tracking/email-action"

const TEMPLATE_OPTIONS: { key: EmailTemplateKey; label: string; defaultSubject: string; recipientHint: string }[] = [
  {
    key: "expediente_to_transfer",
    label: "Apertura de centro de costos → Transfer",
    defaultSubject: "Apertura de centro de costos",
    recipientHint: "Email del ejecutivo Transfer",
  },
  {
    key: "request_docs_to_client",
    label: "Solicitar documentos al cliente",
    defaultSubject: "Acción requerida en tu expediente",
    recipientHint: "Email del cliente (se autocompleta)",
  },
  {
    key: "contract_to_client",
    label: "Enviar contrato al cliente",
    defaultSubject: "Tu contrato está listo para firmar",
    recipientHint: "Email del cliente (se autocompleta)",
  },
]

interface Props {
  applicationId: string
  clientEmail?: string
  onClose: () => void
  initialTemplate?: EmailTemplateKey
}

export function EmailComposer({ applicationId, clientEmail, onClose, initialTemplate }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [template, setTemplate] = useState<EmailTemplateKey>(initialTemplate ?? "expediente_to_transfer")
  const [toEmail, setToEmail] = useState("")
  const [recipientName, setRecipientName] = useState("")
  const [customMessage, setCustomMessage] = useState("")
  const [attachExpediente, setAttachExpediente] = useState(true)
  const [contractName, setContractName] = useState("")
  const [signingUrl, setSigningUrl] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  const selected = TEMPLATE_OPTIONS.find((t) => t.key === template)!
  const isTransfer = template === "expediente_to_transfer"
  const isContract = template === "contract_to_client"
  const isClientTemplate = template === "request_docs_to_client" || template === "contract_to_client"

  const resolvedTo = toEmail || (isClientTemplate ? (clientEmail ?? "") : "")

  function handleSend() {
    setError(null)
    startTransition(async () => {
      const res = await sendExpedienteEmail({
        applicationId,
        templateKey: template,
        toEmail: resolvedTo,
        recipientName: recipientName.trim() || undefined,
        customMessage: customMessage || undefined,
        attachExpediente: isTransfer ? attachExpediente : false,
        contractName: isContract ? contractName || undefined : undefined,
        signingUrl: isContract ? signingUrl || undefined : undefined,
      })
      if (res.error) {
        setError(res.error)
      } else {
        setSent(true)
        setTimeout(() => { onClose(); router.refresh() }, 1200)
      }
    })
  }

  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 1000,
        display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: "#fff", borderRadius: 12, padding: 28, width: "100%", maxWidth: 520,
        boxShadow: "0 8px 40px rgba(0,0,0,.18)", maxHeight: "90vh", overflowY: "auto",
      }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 16, color: "#004238", fontWeight: 700 }}>Enviar correo</h3>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "#6b7280", lineHeight: 1 }}
          >
            ×
          </button>
        </div>

        {sent ? (
          <div style={{ textAlign: "center", padding: "24px 0", color: "#004238" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>✓</div>
            <p style={{ margin: 0, fontWeight: 600 }}>Correo enviado</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Template selector */}
            <div>
              <label style={labelStyle}>Plantilla</label>
              <select
                value={template}
                onChange={(e) => setTemplate(e.target.value as EmailTemplateKey)}
                style={inputStyle}
              >
                {TEMPLATE_OPTIONS.map((t) => (
                  <option key={t.key} value={t.key}>{t.label}</option>
                ))}
              </select>
            </div>

            {/* Recipient */}
            <div>
              <label style={labelStyle}>
                Destinatario
                {isClientTemplate && clientEmail && (
                  <span style={{ color: "#9ca3af", fontWeight: 400 }}> (default: {clientEmail})</span>
                )}
              </label>
              <input
                type="email"
                value={toEmail}
                onChange={(e) => setToEmail(e.target.value)}
                placeholder={selected.recipientHint}
                style={inputStyle}
              />
            </div>

            {/* Nombre de pila para el saludo. Si se deja vacío el correo abre
                con "Buen día" en lugar de un "Estimado," sin nombre. */}
            {!isClientTemplate && (
              <div>
                <label style={labelStyle}>
                  Nombre del destinatario
                  <span style={{ color: "#9ca3af", fontWeight: 400 }}> (opcional)</span>
                </label>
                <input
                  type="text"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="Ej: Mario"
                  style={inputStyle}
                />
              </div>
            )}

            {/* Contract name (contract template only) */}
            {isContract && (
              <div>
                <label style={labelStyle}>Nombre del contrato</label>
                <input
                  type="text"
                  value={contractName}
                  onChange={(e) => setContractName(e.target.value)}
                  placeholder="ej. Contrato de servicios Payefy"
                  style={inputStyle}
                />
              </div>
            )}

            {/* Signing URL (contract template only) */}
            {isContract && (
              <div>
                <label style={labelStyle}>Link de firma (DocuSign / weetrust)</label>
                <input
                  type="url"
                  value={signingUrl}
                  onChange={(e) => setSigningUrl(e.target.value)}
                  placeholder="https://..."
                  style={inputStyle}
                />
              </div>
            )}

            {/* Custom message */}
            <div>
              <label style={labelStyle}>
                {template === "request_docs_to_client" ? "Descripción de lo solicitado" : "Mensaje adicional (opcional)"}
              </label>
              <textarea
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                rows={4}
                placeholder={template === "request_docs_to_client" ? "Describe los documentos o cambios requeridos…" : "Comentario adicional para el destinatario…"}
                style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }}
              />
            </div>

            {/* Attach expediente (transfer only) */}
            {isTransfer && (
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13 }}>
                <input
                  type="checkbox"
                  checked={attachExpediente}
                  onChange={(e) => setAttachExpediente(e.target.checked)}
                  style={{ width: 16, height: 16, accentColor: "#004238" }}
                />
                <span>Adjuntar expediente completo (ZIP)</span>
              </label>
            )}

            {error && (
              <p style={{ fontSize: 12, color: "#a32d2d", margin: 0, background: "#fff5f5", padding: "8px 12px", borderRadius: 6 }}>
                {error}
              </p>
            )}

            {/* Actions */}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
              <button
                onClick={onClose}
                style={{ fontSize: 13, padding: "9px 18px", background: "#fff", border: "1px solid #d3dbd6", borderRadius: 7, cursor: "pointer", color: "#374151" }}
              >
                Cancelar
              </button>
              <button
                disabled={pending || (!resolvedTo && !toEmail)}
                onClick={handleSend}
                style={{
                  fontSize: 13, padding: "9px 20px", background: "#004238", color: "#AEFF99",
                  border: "none", borderRadius: 7, cursor: "pointer", fontWeight: 700,
                  opacity: (pending || (!resolvedTo && !toEmail)) ? 0.6 : 1,
                }}
              >
                {pending ? "Enviando…" : "Enviar correo"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 5,
  textTransform: "uppercase", letterSpacing: ".04em",
}
const inputStyle: React.CSSProperties = {
  width: "100%", fontSize: 13, padding: "8px 10px", border: "1px solid #e3e8e5",
  borderRadius: 7, outline: "none", color: "#111827", boxSizing: "border-box",
  background: "#fafafa",
}
