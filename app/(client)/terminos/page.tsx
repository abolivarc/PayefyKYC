import type { Metadata } from "next"
import { TermsAcceptanceForm } from "./terms-form"

export const metadata: Metadata = {
  title: "Términos y Condiciones | PayefyKYC",
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-start justify-center py-10 px-4">
      <div className="w-full max-w-3xl bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="bg-[#065f2e] px-8 py-6">
          <p className="text-xs text-emerald-200 uppercase tracking-widest font-medium mb-1">
            Payefy, S.A.P.I. de C.V.
          </p>
          <h1 className="text-2xl font-bold text-white leading-snug">
            Términos y Condiciones de la Plataforma
          </h1>
          <p className="text-emerald-200 text-sm mt-1">
            Espacio Santa Fe, Carretera México–Toluca 5420, 701-B, Col. El Yaqui,
            Cuajimalpa de Morelos, C.P. 05320, CDMX
          </p>
        </div>

        {/* Body */}
        <div className="px-8 py-7 space-y-7 text-slate-700 text-sm leading-relaxed">
          {/* Download link */}
          <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <svg className="h-5 w-5 text-slate-400 shrink-0" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14,2 14,8 20,8"/>
              <line x1="12" y1="11" x2="12" y2="17"/>
              <polyline points="9,14 12,17 15,14"/>
            </svg>
            <span className="text-slate-600 text-sm">
              Puedes descargar el documento completo en PDF:{" "}
              <a href="/terminos-payefy.pdf" target="_blank" rel="noopener"
                className="text-emerald-700 font-medium hover:underline">
                terminos-payefy.pdf
              </a>
            </span>
          </div>

          <Section title="1. De la Plataforma">
            Payefy, S.A.P.I. de C.V. pone a disposición del usuario la plataforma digital
            PayefyKYC para gestionar el proceso de alta y verificación de identidad (KYC)
            requerido para la contratación de productos financieros. El acceso y uso de la
            plataforma implica la aceptación plena de estos términos.
          </Section>

          <Section title="2. Propiedad Intelectual">
            Todos los contenidos, marcas, logotipos, interfaces, diseños, código y demás
            elementos de la plataforma son propiedad exclusiva de Payefy, S.A.P.I. de C.V.
            o de sus licenciantes. Queda prohibida su reproducción, distribución o uso no
            autorizado sin consentimiento expreso y por escrito de Payefy.
          </Section>

          <Section title="3. Usos Permitidos">
            El usuario podrá usar la plataforma exclusivamente para: (a) cargar y gestionar
            la documentación requerida por Payefy para el proceso KYC de su empresa;
            (b) recibir notificaciones y comunicaciones del equipo de Payefy; y (c) dar
            seguimiento al estatus de su solicitud de alta.
          </Section>

          <Section title="4. Prohibiciones">
            Está prohibido: (a) intentar acceder a cuentas de terceros; (b) realizar
            ingeniería inversa o descompilar el software; (c) cargar documentos falsos,
            alterados o que induzcan a error; (d) usar la plataforma para cualquier fin
            ilícito o que contravenga la normativa aplicable; y (e) ceder el acceso a
            personas no autorizadas.
          </Section>

          <Section title="5. Confidencialidad">
            El usuario se obliga a mantener la confidencialidad de toda información que
            Payefy le comparta a través de la plataforma, incluyendo formatos, procesos
            internos y datos de contacto del equipo. Esta obligación subsiste tras la
            terminación de la relación contractual.
          </Section>

          <Section title="6. Clave de Acceso y Números Confidenciales">
            El usuario es responsable de la custodia de sus credenciales de acceso
            (usuario y contraseña). Payefy no será responsable por accesos no autorizados
            derivados del descuido o negligencia del usuario en la protección de sus datos
            de acceso. Ante cualquier sospecha de compromiso, el usuario debe notificar
            de inmediato a Payefy.
          </Section>

          <Section title="7. Modificaciones">
            Payefy se reserva el derecho de modificar estos Términos y Condiciones en
            cualquier momento. Las modificaciones sustanciales serán notificadas con al
            menos 5 días hábiles de anticipación. El uso continuado de la plataforma tras
            la notificación implica la aceptación de los cambios.
          </Section>

          <Section title="8. Leyes Aplicables y Jurisdicción">
            Estos términos se rigen por las leyes de los Estados Unidos Mexicanos. Para
            la resolución de cualquier controversia, las partes se someten expresamente
            a la jurisdicción de los tribunales competentes de la Ciudad de México,
            renunciando a cualquier otro fuero que pudiera corresponderles.
          </Section>
        </div>

        {/* Acceptance form */}
        <div className="px-8 pb-8">
          <TermsAcceptanceForm />
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="font-semibold text-slate-900 mb-1.5">{title}</h2>
      <p>{children}</p>
    </div>
  )
}
