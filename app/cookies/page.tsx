/* eslint-disable react/no-unescaped-entities */
import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { SiteFooter } from "@/components/layout/site-footer"

export const metadata: Metadata = {
  title: "Política de Cookies | Payefy",
  description:
    "Qué cookies utiliza la plataforma de onboarding de Payefy y para qué sirven.",
}

const LAST_UPDATED = "6 de septiembre de 2026"

export default function CookiesPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center py-10 px-4">
      <main className="w-full max-w-3xl bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="px-8 py-6" style={{ background: "#004238" }}>
          <Image
            src="/payefy-logo-light.png"
            alt="Payefy"
            width={110}
            height={24}
            style={{ height: 24, width: "auto", marginBottom: 16 }}
            priority
          />
          <p className="text-xs uppercase tracking-widest font-medium mb-1" style={{ color: "#AEFF99" }}>
            Payefy, S.A.P.I. de C.V.
          </p>
          <h1 className="text-2xl font-bold text-white leading-snug">Política de Cookies</h1>
          <p className="text-xs mt-2" style={{ color: "rgba(255,255,255,0.75)" }}>
            Última actualización: {LAST_UPDATED}
          </p>
        </div>

        {/* Body */}
        <div className="px-8 py-7 space-y-6 text-slate-700 text-sm leading-relaxed">
          <p>
            Esta política describe qué cookies utiliza la plataforma de onboarding de Payefy,
            S.A.P.I. de C.V. ("Payefy") disponible en payefy.com.mx, para qué sirven y qué
            opciones tienes sobre ellas.
          </p>

          <section>
            <h2 className="font-semibold text-slate-900 mb-1.5">¿Qué es una cookie?</h2>
            <p>
              Una cookie es un pequeño archivo de texto que un sitio web guarda en tu navegador
              para recordar información entre visitas, por ejemplo, que ya iniciaste sesión.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-slate-900 mb-1.5">
              Cookies que utiliza esta plataforma
            </h2>
            <p className="mb-3">
              La plataforma utiliza únicamente <strong>cookies estrictamente necesarias</strong>{" "}
              para su funcionamiento. No utilizamos cookies de analítica, de publicidad ni de
              redes sociales, ni tecnologías de rastreo de terceros.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-left border border-slate-200 rounded-lg text-xs">
                <caption className="sr-only">Cookies utilizadas por la plataforma</caption>
                <thead>
                  <tr className="bg-slate-50 text-slate-600">
                    <th scope="col" className="px-3 py-2 font-semibold">Cookie</th>
                    <th scope="col" className="px-3 py-2 font-semibold">Propósito</th>
                    <th scope="col" className="px-3 py-2 font-semibold">Duración</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="px-3 py-2 font-mono">sb-*-auth-token</td>
                    <td className="px-3 py-2">
                      Mantener tu sesión iniciada de forma segura (autenticación). Emitida por
                      nuestro proveedor de infraestructura Supabase.
                    </td>
                    <td className="px-3 py-2">Mientras dure tu sesión</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-3">
              Al ser esenciales para que puedas iniciar sesión y usar el portal, estas cookies
              no requieren consentimiento previo y no pueden desactivarse desde la plataforma.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-slate-900 mb-1.5">Cómo eliminarlas</h2>
            <p>
              Puedes eliminar o bloquear cookies desde la configuración de tu navegador
              (Chrome, Safari, Firefox, Edge). Si bloqueas las cookies de esta plataforma, no
              podrás mantener una sesión iniciada.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-slate-900 mb-1.5">Cambios a esta política</h2>
            <p>
              Si en el futuro incorporamos cookies adicionales (por ejemplo, de analítica),
              actualizaremos esta política y, cuando la ley lo requiera, solicitaremos tu
              consentimiento antes de activarlas.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-slate-900 mb-1.5">Contacto</h2>
            <p>
              Para cualquier duda sobre esta política o sobre el tratamiento de tus datos,
              escríbenos a{" "}
              <a href="mailto:contacto@payefy.me" className="text-emerald-700 hover:underline font-medium">
                contacto@payefy.me
              </a>{" "}
              o consulta nuestro{" "}
              <Link href="/aviso-de-privacidad" className="text-emerald-700 hover:underline font-medium">
                Aviso de Privacidad
              </Link>.
            </p>
          </section>
        </div>
      </main>
      <SiteFooter variant="light" className="mt-8" />
    </div>
  )
}
