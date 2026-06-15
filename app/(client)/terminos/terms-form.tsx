"use client"

import { useState, useTransition } from "react"
import { recordTermsAcceptance } from "./actions"

export function TermsAcceptanceForm() {
  const [accepted, setAccepted] = useState(false)
  const [pending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!accepted) return
    startTransition(() => {
      recordTermsAcceptance()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-emerald-700 cursor-pointer"
          />
          <span className="text-sm text-slate-700 leading-snug">
            He leído y acepto los{" "}
            <strong className="font-semibold text-slate-900">
              Términos y Condiciones
            </strong>{" "}
            y el{" "}
            <a href="/aviso-de-privacidad" target="_blank" rel="noopener"
              className="font-semibold text-emerald-700 hover:underline">
              Aviso de Privacidad
            </a>{" "}
            de Payefy, S.A.P.I. de C.V. Entiendo que esta aceptación aplica a
            toda mi empresa y que Payefy podrá actualizar estos términos con previo aviso.
          </span>
        </label>
      </div>

      <button
        type="submit"
        disabled={!accepted || pending}
        className="w-full py-3 px-6 rounded-lg font-semibold text-sm transition-colors
          disabled:opacity-40 disabled:cursor-not-allowed
          bg-[#065f2e] text-white hover:bg-[#054a25]"
      >
        {pending ? "Registrando aceptación…" : "Acepto y continúo →"}
      </button>

      <p className="text-xs text-slate-400 text-center">
        Esta aceptación queda registrada con tu usuario, empresa e IP con fecha de hoy.
      </p>
    </form>
  )
}
