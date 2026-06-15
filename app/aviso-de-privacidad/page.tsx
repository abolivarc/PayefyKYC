import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Aviso de Privacidad | Payefy",
  description: "Aviso de Privacidad de Payefy, S.A.P.I. de C.V. conforme a la LFPDPPP.",
}

export default function AvisoPrivacidadPage() {
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
            Aviso de Privacidad
          </h1>
          <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.6)" }}>
            Espacio Santa Fe, Carretera México–Toluca 5420, 701-B,
            Col. El Yaqui, Cuajimalpa de Morelos, C.P. 05320, CDMX
          </p>
        </div>

        {/* Body */}
        <div className="px-8 py-7 space-y-7 text-slate-700 text-sm leading-relaxed">

          {/* PDF download */}
          <a
            href="/aviso-de-privacidad.pdf"
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
            Descargar Aviso de Privacidad completo (PDF)
          </a>

          <p>
            En términos de lo establecido por la Ley Federal de Protección de Datos Personales
            en Posesión de los Particulares y su Reglamento (conjuntamente como "LFPDPPP"), se
            identifica como responsable del tratamiento de datos personales recabados a los
            titulares de los datos personales de los mismos (en adelante como "Titular"), a
            Payefy, S.A.P.I. de C.V. (en adelante como "Payefy"), con domicilio en Espacio
            Santa Fe Carretera México-Toluca 5420, 701-B, Col. El Yaqui, Cuajimalpa de Morelos,
            C.P. 05320, Ciudad de México, que ofrece o proporciona los servicios que el Titular
            solicitó y contrató conforme a los Términos y Condiciones, en específico para ofrecer
            el servicio de aceptación de pagos con tarjetas y, en su caso, proveer la
            infraestructura de terminales puntos de venta conectadas a las redes de medios de pago.
          </p>

          <Section title="Datos Personales Proporcionados por el Titular">
            <p className="mb-3">
              Los datos personales proporcionados por el Titular se dividen en datos generales
              y datos sensibles. Los datos generales proporcionados por el Titular a Payefy son:
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-600 mb-4">
              {[
                "Nombre completo",
                "Fecha y lugar de nacimiento",
                "Clave Única de Registro de Población",
                "Registro Federal de Contribuyentes o su equivalente",
                "Nacionalidad y datos migratorios",
                "Identificaciones o credenciales de identidad",
                "Sexo", "Estado civil", "Correo electrónico", "Domicilio",
                "Número de teléfono fijo y celular", "Ocupación",
                "Salario o remuneración",
                "Datos de identificación, académicos, patrimoniales y de contacto",
                "Referencias laborales, patrimoniales y comerciales",
                "Dirección I.P.", "Información de beneficiarios",
                "Códigos de restablecimientos de factores de doble autenticación",
                "Información de representantes legales",
                "Información de proveedores de recursos",
                "Versión del navegador y sistema operativo",
                "Geolocalización o ubicación del dispositivo",
                "Duración de las sesiones",
              ].map((item) => <li key={item}>{item}</li>)}
            </ul>
            <p className="mb-3">Por lo que se refiere a los datos sensibles, el Titular puede proporcionar:</p>
            <ul className="list-disc list-inside space-y-1 text-slate-600">
              <li>Biométricos (rasgos faciales, huellas dactilares, patrón de voz, iris, entre otros)</li>
              <li>Información financiera (transacciones, actividad, número de cuentas, origen y destino de activos virtuales, abonos, cargos, entre otros)</li>
              <li>Información sobre familiares (cónyuge, concubina, concubinario, hijos, padres, beneficiarios e intermediarios) y cualquier otro tercero cuya información sea requerida en cumplimiento con las disposiciones legales y las políticas internas vigentes</li>
            </ul>
          </Section>

          <Section title="Finalidades Necesarias">
            <p className="mb-3">Los datos expuestos anteriormente serán utilizados por Payefy con las siguientes finalidades:</p>
            <ol className="list-[upper-roman] list-inside space-y-2 text-slate-600">
              {[
                "Dar cumplimiento a las obligaciones derivadas de la relación jurídica que se establezca entre el Titular y Payefy.",
                "Actualizar los registros y programas de sistemas de Payefy.",
                "Utilizarlos en los casos de fusión, escisión o adquisición de Payefy, filiales y/o subsidiarias.",
                "Dar cumplimiento a los requerimientos hechos por las autoridades, conforme a la normativa aplicable.",
                "Para fines de auditoría interna o externa.",
                "Otorgar cualquier reporte o aviso que requiera proporcionarse ante las autoridades en virtud de las obligaciones de Payefy conforme al marco jurídico aplicable.",
                "Monitoreo mediante llamadas telefónicas, correo electrónico y/o cualquier otro medio de contacto respecto de cualquier actividad que se relacione directa o indirectamente con los servicios que ofrece Payefy.",
                "Cumplir con las obligaciones relativas con los Adquirentes y demás Participantes en las Redes de Medios de Pago.",
                "Envío por parte de Payefy de toda clase de avisos, notificaciones, estados de cuentas, comprobantes de operaciones, encuestas de servicio e información adicional relacionada con los servicios contratados.",
                "Entendimiento de las necesidades del Titular para evaluar la conveniencia de ofrecer los servicios de Payefy.",
                "Compartir la información personal, que no está sujeta a disposiciones de secrecía, con socios comerciales y/o proveedores de servicios.",
                "Utilizar los datos biométricos para determinar la validez de la identidad de clientes de Payefy.",
                "Monitorear operaciones de los servicios de Payefy, incluyendo el empleo de sistemas de vigilancia para detectar actividades u operaciones ilegales.",
                "Cumplir con regulaciones, políticas y medidas de seguridad física, digital y cibernética.",
                "Realizar análisis estadísticos, de generación de modelos de información y/o perfiles de comportamiento actual y predictivo.",
                "Originar, operar, gestionar, procesar y administrar los servicios contratados con Payefy, pudiendo llevar a cabo la verificación y/o validación de los datos personales proporcionados contra bases de datos públicas.",
                "Para realizar cumplir con las obligaciones que se desprenden de la Ley Federal para la Prevención e Identificación de Recursos de Procedencia Ilícita.",
              ].map((item, i) => <li key={i}>{item}</li>)}
            </ol>
          </Section>

          <Section title="Finalidades Secundarias">
            <p>
              Asimismo, Payefy podrá utilizar los datos personales para los siguientes fines
              secundarios para el cumplimiento de la relación jurídica que dio origen al servicio
              contratado o solicitado, los cuales son la oferta directa de productos y/o servicios,
              así como contactar al Titular con fines mercadotécnicos o de prospección comercial
              relacionados con productos y/o servicios mencionados.
            </p>
            <p className="mt-3">
              En caso de que el Titular quiera oponerse al tratamiento de sus datos personales
              para las finalidades secundarias, puede contactar a Payefy a través del servicio
              de atención al cliente disponible en la página de Internet y en la aplicación móvil,
              a efecto de poder ejercer los Derechos ARCO.
            </p>
          </Section>

          <Section title="Remisiones y Transferencias de Datos Personales">
            <p className="mb-3">
              Payefy podrá remitir los datos personales de los Titulares a proveedores externos,
              nacionales o extranjeros, quienes tendrán el carácter de "Encargados" conforme a
              la LFPDPPP, y deberán actuar con apego a las medidas ya establecidas para continuar
              garantizando el buen uso, la protección y la confidencialidad de los datos personales.
            </p>
            <p>
              Asimismo, Payefy podrá transferir los datos personales en territorio nacional o en
              el extranjero sin necesidad del consentimiento del Titular en los supuestos
              establecidos en la LFPDPPP (ley o tratado, sociedades controladoras/subsidiarias,
              interés del Titular, interés público, proceso judicial o mantenimiento de la relación
              jurídica). Cualquier transferencia fuera de dichos supuestos estará sujeta al
              consentimiento del Titular.
            </p>
          </Section>

          <Section title="Ejercicio de Derechos ARCO">
            <p>
              De conformidad con la LFPDPPP, los Titulares o su representante legal podrán
              solicitar a Payefy, en cualquier momento, el acceso, rectificación, cancelación u
              oposición (Derechos ARCO) respecto de los datos personales que le conciernen,
              enviando un correo electrónico a{" "}
              <a href="mailto:contacto@payefy.me" className="text-emerald-700 hover:underline">
                contacto@payefy.me
              </a>{" "}
              con la información requerida. Payefy comunicará la determinación adoptada en un
              plazo máximo de 20 días.
            </p>
          </Section>

          <Section title="Uso de Tecnologías de Rastreo">
            <p>
              Payefy utiliza tecnologías de rastreo como <em>cookies</em> y <em>web beacons</em>{" "}
              en su página de Internet, aplicaciones y plataformas tecnológicas para monitorear
              el comportamiento del usuario y brindar un mejor servicio y experiencia. El usuario
              puede ajustar las preferencias de su navegador para aceptar o rechazar las cookies.
            </p>
          </Section>

          <Section title="Autoridad Competente">
            <p>
              En cualquier momento, el Titular tiene derecho de acudir ante el Instituto Nacional
              de Transparencia, Acceso a la Información y Protección de Datos Personales (INAI),
              en caso de que considere que sus derechos a la protección de datos personales han
              sido vulnerados.
            </p>
          </Section>

          <Section title="Modificaciones">
            <p>
              El Aviso de Privacidad podrá sufrir modificaciones, cambios o actualizaciones
              derivado de nuevos requerimientos legales, las necesidades de Payefy o por cualquier
              otra causa. Cualquier cambio se hará del conocimiento del público en{" "}
              <a href="https://payefy.me/aviso-de-privacidad" target="_blank" rel="noopener noreferrer"
                className="text-emerald-700 hover:underline">
                payefy.me/aviso-de-privacidad
              </a>.
            </p>
          </Section>

          <Section title="Responsable de Payefy">
            <p>
              La Dirección de Atención al Cliente será el responsable de atender cualquier
              solicitud, comentario o duda respecto a los datos personales y el presente Aviso
              de Privacidad. Puede contactarnos en{" "}
              <a href="mailto:contacto@payefy.me" className="text-emerald-700 hover:underline">
                contacto@payefy.me
              </a>.
            </p>
          </Section>

          <div className="border-t border-slate-100 pt-5">
            <Link href="/dashboard"
              className="text-sm text-emerald-700 hover:underline font-medium">
              ← Volver al portal
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="font-semibold text-slate-900 mb-2">{title}</h2>
      <div className="text-slate-700 leading-relaxed">{children}</div>
    </div>
  )
}
