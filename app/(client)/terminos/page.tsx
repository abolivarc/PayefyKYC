/* eslint-disable react/no-unescaped-entities */
import type { Metadata } from "next"
import Image from "next/image"
import { TermsAcceptanceForm } from "./terms-form"

export const metadata: Metadata = {
  title: "Términos y Condiciones | Payefy",
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-start justify-center py-10 px-4">
      <div className="w-full max-w-3xl bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

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
          <h1 className="text-2xl font-bold text-white leading-snug">
            Términos y Condiciones
          </h1>
          <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.6)" }}>
            Espacio Santa Fe, Carretera México–Toluca 5420, 701-B,
            Col. El Yaqui, Cuajimalpa de Morelos, C.P. 05320, CDMX
          </p>
        </div>

        {/* Body */}
        <div className="px-8 py-7 space-y-7 text-slate-700 text-sm leading-relaxed">

          {/* PDF download links */}
          <div className="flex flex-wrap gap-3">
            <PdfLink href="/terminos-payefy.pdf" label="Descargar Términos y Condiciones (PDF)" />
            <PdfLink href="/aviso-de-privacidad.pdf" label="Aviso de Privacidad (PDF)" />
          </div>

          <Section title="De la Plataforma">
            Mediante la utilización de la plataforma, página web o cualquier otro aplicativo
            (en adelante como "Plataforma"), propiedad de Payefy, por parte del Usuario expresa
            la adhesión plena y sin reservas de éste a los presentes Términos y Condiciones. Para
            el uso de esta Plataforma, el Usuario declara, bajo protesta de decir verdad, que
            cuenta con mayoría de edad en términos de lo dispuesto por la normativa mexicana.
            <br /><br />
            A través de la Plataforma, el Usuario tendrá acceso y/o utilizará diversos servicios
            y contenidos (en adelante como "Servicios") como: monitoreo de transacciones,
            activación y bloqueo de tarjetas, soporte al usuario, bloqueo y activación de
            funciones, consulta de movimientos, entre otros. El usuario reconoce que no todos
            los Servicios están disponibles en todas las áreas geográficas y que algunos
            Servicios pueden ser utilizados solamente con posterioridad al registro previo por
            el Usuario.
            <br /><br />
            Con el fin de que el Usuario pueda acceder a los Servicios de la Plataforma, se
            solicitará el registro a la misma, en la cual deberá proporcionar toda la información
            requerida por Payefy que deberá ser veraz, precisa y actual.
            <br /><br />
            Al acceder, utilizar o participar en la Plataforma, el Usuario afirma haber revisado
            y entendido estos Términos y Condiciones, y acepta que por el simple hecho de (i)
            hacer uso de la Plataforma, (ii) registrarse en la Plataforma, o (iii) interactuar
            en la Plataforma, queda vinculado por los presentes Términos y Condiciones.
            <br /><br />
            Payefy tendrá el derecho a negar, restringir o condicionar al Usuario el acceso a la
            Plataforma, total o parcialmente, a su entera discreción, así como a modificar los
            Servicios de la Plataforma, en cualquier momento y sin necesidad de previo aviso.
          </Section>

          <Section title="Propiedad Intelectual">
            Los derechos de propiedad intelectual respecto de los Servicios y los signos
            distintivos y dominios de la Plataforma, así como los derechos de uso y explotación
            de los mismos, incluyendo su divulgación, publicación, reproducción, distribución
            y transformación, son propiedad exclusiva de Payefy. El usuario no adquiere ningún
            derecho de propiedad intelectual por el simple uso de los Servicios de la Plataforma
            y en ningún momento dicho uso será considerado como una autorización ni licencia para
            utilizar los Servicios con fines distintos a los que se contemplan en los presentes
            Términos y Condiciones.
            <br /><br />
            La reimpresión, publicación, distribución, asignación, sublicencia, venta,
            reproducción electrónica o por cualquier otro medio de cualquier información,
            documento o gráfico de la Plataforma, en todo o en parte, para cualquier uso distinto
            al personal no comercial le está expresamente prohibido al Usuario, a menos que se le
            haya otorgado autorización previamente por escrito.
          </Section>

          <Section title="Usos Permitidos">
            El aprovechamiento de los Servicios de la Plataforma es exclusiva responsabilidad del
            Usuario, quien en todo caso deberá servirse de ellos acorde a las funcionalidades
            permitidas en la propia Plataforma y a los usos autorizados en los presentes Términos
            y Condiciones, por lo que el Usuario se obliga a utilizarlos de modo tal que no
            atenten contra el uso autorizado y la legislación vigente.
          </Section>

          <Section title="Prohibiciones">
            El Usuario no tiene derecho de colocar o utilizar los Servicios de la Plataforma en
            sitios o páginas propias o de terceros sin autorización previa y por escrito de
            Payefy. Cualquier violación a los presentes Términos y Condiciones otorgan el derecho
            a Payefy para poder restringir, negar o cancelar cualquiera de los Servicios y/o el
            acceso a la Plataforma. Dicho ejercicio será sin responsabilidad alguna para Payefy,
            por lo que el Usuario no tendrá derecho de reclamación alguno sobre cualquier
            accionista, empleado, funcionario o cualquier persona afín a Payefy.
          </Section>

          <Section title="Confidencialidad">
            Payefy se obliga a mantener confidencial la información que reciba del Usuario que
            tenga dicho carácter conforme a las disposiciones legales aplicables en los Estados
            Unidos Mexicanos y conforme al Aviso de Privacidad, el cual podrá encontrar en{" "}
            <a href="/aviso-de-privacidad" className="text-emerald-700 hover:underline font-medium">
              payefy.me/aviso-de-privacidad
            </a>.
            <br /><br />
            En virtud de que la seguridad de la información personal del Usuario es una prioridad
            para Payefy, se tiene un especial cuidado en proteger el manejo de la información
            mediante el establecimiento de distintos controles, así como la capacitación a los
            empleados en el manejo adecuado de esta información.
          </Section>

          <Section title="Clave de Acceso y Números Confidenciales">
            En todo momento, el Usuario es el único responsable y final de mantener en secreto
            las claves de acceso y números confidenciales con los cuales tenga acceso a los
            Servicios de la Plataforma, siendo el usuario el responsable del manejo de la
            Plataforma, liberando expresamente a Payefy de cualquier responsabilidad.
            <br /><br />
            En virtud de lo anterior, el Usuario se obliga, expresa e irrevocablemente, tanto
            solidaria, individual y mancomunadamente, y de la manera más amplia que conforme a
            derecho corresponda, a indemnizar y mantener en paz y a salvo a Payefy, a sus
            consejeros, directivos, funcionarios y empleados, de y contra cualesquiera acciones,
            quejas, pérdidas o reclamaciones que se deriven, se relacionen con o resulten de
            cualquier daño o pérdida relativo a su actuar al manejar la Plataforma y del uso de
            los Servicios.
          </Section>

          <Section title="Modificaciones">
            Payefy tendrá el derecho de modificar en cualquier momento los Términos y
            Condiciones. En consecuencia, el Usuario debe leer atentamente los Términos y
            Condiciones cada vez que pretenda utilizar la Plataforma.
          </Section>

          <Section title="Leyes Aplicables y Jurisdicción">
            Las Partes se someten de manera expresa a las leyes aplicables y a la jurisdicción
            de los tribunales competentes de la Ciudad de México, que serán los únicos competentes
            para conocer de todo lo relativo a la interpretación, cumplimiento, incumplimiento,
            rescisión, así como cualquier controversia relacionada con el mismo, y expresa e
            irrevocablemente renuncian en este acto a cualquiera otra jurisdicción que pudiese
            corresponderles en razón de su domicilio presente o futuro por cualquier otro motivo.
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
      <p className="text-slate-700 leading-relaxed">{children}</p>
    </div>
  )
}

function PdfLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50
        hover:bg-slate-100 transition-colors px-3 py-2 text-sm text-slate-600 hover:text-slate-800"
    >
      <svg className="h-4 w-4 text-slate-400 shrink-0" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14,2 14,8 20,8"/>
        <line x1="12" y1="11" x2="12" y2="17"/>
        <polyline points="9,14 12,17 15,14"/>
      </svg>
      {label}
    </a>
  )
}
