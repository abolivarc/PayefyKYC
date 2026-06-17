import {
  AlignmentType,
  Document,
  Packer,
  Paragraph,
  TextRun,
  convertMillimetersToTwip,
} from "docx"
import type { TermsOpmValues } from "@/lib/validations/terms-opm"

function r(text: string, bold = false): TextRun {
  return new TextRun({ text, bold, font: "Tahoma", size: 24 })
}

function p(
  children: TextRun[],
  align: (typeof AlignmentType)[keyof typeof AlignmentType] = AlignmentType.BOTH
): Paragraph {
  return new Paragraph({ alignment: align, children })
}

function empty(align?: (typeof AlignmentType)[keyof typeof AlignmentType]): Paragraph {
  return new Paragraph({ alignment: align, children: [r("")] })
}

function section(title: string, center = false): Paragraph {
  return p([r(title, true)], center ? AlignmentType.CENTER : AlignmentType.BOTH)
}

export async function generateTermsOpmDocx(data: TermsOpmValues): Promise<Buffer> {
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: {
              width: convertMillimetersToTwip(216),
              height: convertMillimetersToTwip(279),
            },
            margin: {
              top: convertMillimetersToTwip(25),
              right: convertMillimetersToTwip(25),
              bottom: convertMillimetersToTwip(25),
              left: convertMillimetersToTwip(25),
            },
          },
        },
        children: [
          // ── Título ──────────────────────────────────────────────────────────
          p([r("TÉRMINOS Y CONDICIONES DE CLIENTES DE INTEGRADORES", true)], AlignmentType.CENTER),
          empty(),

          // ── Presentación OPM ─────────────────────────────────────────────────
          p([r(
            'Operadora  de Pagos Móviles de México, S.A. de C.V. (en lo sucesivo "OPM"), es una sociedad anónima de capital variable, debidamente constituida de conformidad con las leyes de los Estados Unidos Mexicanos,  con domicilio en Lago Zúrich 245, Edificio Telcel, Piso 13, Plaza Carso, Colonia Ampliación Granada, Alcaldía Miguel Hidalgo, código postal 11529, Ciudad de México y tiene celebrado un contrato de prestación de servicios y licencia de API\'s con Payefy S.A.P.I. de C.V.  (en lo sucesivo el "Integrador") para que a usted como usuario se le permita integrarse con otros software o aplicaciones para la recepción de los servicios que en su caso llegue a contratar con Banco Inbursa, S.A., Institución de Banca Múltiple, Grupo Financiero Inbursa o cualquier Institución Financiera con la que OPM tenga convenio.'
          )]),
          empty(),

          // ── USO Y RESTRICCIONES ───────────────────────────────────────────────
          section("USO Y RESTRICCIONES", true),
          empty(),

          p([r(
            "Usted como usuario de las API's por medio del Integrador al momento de aceptar los presentes términos y condiciones acepta y reconoce que quien dará el servicio de las API's es OPM por medio del Integrador, sin embargo, en todo momento, la relación jurídica para el servicio del uso de las API's será con el Integrador, por lo que reconoce y acepta que cualquier reclamación, denuncia o queja deberá ser interpuesta por usted en contra del Integrador y no de OPM ni sus representantes, ni sus directivos, ni de sus subsidiarias, afiliadas , controladoras y/o partes relacionadas, ya que usted y OPM no tienen ninguna relación comercial, lo anterior a efecto de que el Integrador, en su caso, ejerza las acciones pertinentes."
          )]),
          empty(),

          p([r(
            "Usted reconoce y acepta que el uso de las API's será en todo momento para fines totalmente lícitos y por tal motivo se obliga a sacar en paz y a salvo a OPM, a sus representantes, sus directivos, sus subsidiarias, afiliadas, controladoras y/o partes relacionadas de cualquier reclamo, demanda o queja derivada del mal uso o acciones ilegales que se le llegue a dar a la API's interpuesta por cualquier tercero, obligándose a reembolsar a OPM todos los gastos incurridos por ese motivo."
          )]),
          empty(),

          p([r(
            "De la misma forma usted reconoce y acepta que el uso de las API's no sustituye, reemplaza y/o modifica la relación contractual entre usted y el Integrador, o bien con la institución financiera con quien abrió la cuenta correspondiente para hacer uso de las API's por lo que OPM no es responsable de cualquier situación que pudiera afectar a dichas personas morales incluyendo aquellas de tipo regulatorio o insolvencia. Asimismo, usted se obliga a utilizar las API's conforme a los documentos técnicos y especificaciones proporcionados por el Integrador y, en su caso, por OPM, y se abstendrá de: (a) realizar ingeniería inversa, descompilación, desensamblaje, extracción de código fuente o intentos de acceso no autorizado a las API's, su infraestructura, sus portales o sus sistemas; (b) ejecutar pruebas de carga, estrés, penetración o escaneo de vulnerabilidades sin autorización previa y por escrito de OPM; (c) generar tráfico automatizado abusivo, eludir límites de uso (rate limits), cuotas o mecanismos de control y monitoreo; (d) suplantar identidades, compartir credenciales, transferir llaves de acceso o utilizar credenciales emitidas a nombre de un tercero; (e) utilizar las API's con fines ilícitos o prohibidos por la legislación mexicana, incluyendo de manera enunciativa la Ley Federal para la Prevención e Identificación de Operaciones con Recursos de Procedencia Ilícita, las leyes y estándares anticorrupción aplicables y la regulación financiera vigente; y (f) ordenar, procesar o facilitar operaciones con recursos de procedencia ilícita, simular operaciones o lesionar el interés de terceros. El incumplimiento de cualquiera de las obligaciones anteriores facultará a OPM para suspender, bloquear o revocar de forma inmediata los accesos y credenciales asociados, sin responsabilidad alguna para OPM."
          )]),
          empty(),

          // ── ACLARACIONES ──────────────────────────────────────────────────────
          section("ACLARACIONES"),
          empty(),

          p([r(
            "Para solicitar cualquier aclaración con relación al uso de las API's usted deberá contactar directamente al Integrador para que sea por medio de éste que se lleve a cabo la aclaración correspondiente."
          )]),
          empty(),

          // ── PROPIEDAD INTELECTUAL ─────────────────────────────────────────────
          section("PROPIEDAD INTELECTUAL"),
          empty(),

          p([r(
            "Los derechos de propiedad intelectual respecto a las API's, signos distintivos y dominios de los mismos, así como los derechos de uso y explotación, incluyendo su divulgación, publicación, reproducción, distribución y transformación, son propiedad exclusiva y/o se encuentran debidamente licenciados y/o autorizados en favor de OPM. Usted al firmar los presentes términos y condiciones reconocer y acepta que no adquiere ningún derecho de propiedad intelectual por el simple uso de las API's y en ningún momento dicho uso será considerado como una autorización o licencia para usted."
          )]),
          empty(),

          // ── REGISTROS, TELEMETRÍA Y COOKIES ─────────────────────────────────
          section("REGISTROS, TELEMETRÍA Y COOKIES"),
          empty(),

          p([
            r("Registros y Telemetría. ", true),
            r(
              "Al consumir las API's, OPM registra, procesa y conserva metadatos operativos de las llamadas, incluyendo de manera enunciativa y no limitativa: identificadores de la llamada, fecha y hora, dirección IP de origen, versión de cliente, códigos de respuesta, tiempos de ejecución, identificadores de transacción y eventos relacionados con la seguridad, integridad y disponibilidad del servicio. Estos registros se utilizan para la operación, continuidad, monitoreo, detección de fraude y uso indebido, cumplimiento normativo aplicable, auditoría, respuesta a requerimientos de autoridad y conservación documental en los plazos exigidos por la legislación mexicana aplicable."
            ),
          ]),
          empty(),

          p([
            r("Cookies en portales y sitios web de OPM. ", true),
            r(
              "El acceso a portales, consolas, dashboards, documentación autenticada, widgets o sitios web administrados por OPM podrá utilizar cookies y tecnologías similares, clasificadas como: (i) estrictamente necesarias para el funcionamiento; (ii) de preferencias; (iii) analíticas; y (iv) en su caso, de terceros. Usted podrá aceptar, rechazar o configurar las cookies no estrictamente necesarias mediante el mecanismo de consentimiento que OPM ponga a disposición en dichos entornos. El detalle de las cookies, sus finalidades, duración y, en su caso, los terceros que participen en su tratamiento, se describe en el Aviso de Privacidad y en la Política de Cookies publicados por OPM."
            ),
          ]),
          empty(),

          p([
            r("Datos personales. ", true),
            r(
              "El tratamiento de datos personales que, en su caso, se derive del uso de las API's, de los registros técnicos o de las cookies en portales de OPM, se realizará conforme al Aviso de Privacidad de OPM publicado en su sitio oficial y en términos de la Ley Federal de Protección de Datos Personales en Posesión de los Particulares, su Reglamento y demás disposiciones aplicables."
            ),
          ]),
          empty(),

          // ── DISPONIBILIDAD ────────────────────────────────────────────────────
          section("DISPONIBILIDAD"),
          empty(),

          p([r(
            "Usted reconoce y acepta que las API's puede no estar disponibles en todas las áreas geográficas y que OPM no garantiza la disponibilidad y continuidad de la operación de las mismas."
          )]),
          empty(),

          p([r(
            "OPM no será responsable por daño o pérdida alguna de cualquier naturaleza que pueda ser causado debido a la falta de disponibilidad o continuidad de operación de las API's, incluyendo daños o pérdidas causados a usted por virus informáticos. OPM podrá llevar a cabo ventanas de mantenimiento programado, cambios de versión, actualizaciones de seguridad o suspensiones por emergencia, conforme a los procesos acordados con el Integrador en el Anexo de Niveles de Servicio aplicable. OPM se reserva la facultad de suspender o bloquear, parcial o totalmente, el acceso a las API's en caso de mal uso, abuso, actividad irregular, sospecha de fraude, compromiso de credenciales, instrucción de autoridad competente o incumplimiento a los presentes Términos y Condiciones, sin responsabilidad alguna para OPM."
          )]),
          empty(),

          // ── MODIFICACIONES ────────────────────────────────────────────────────
          section("MODIFICACIONES"),
          empty(),

          p([r(
            "OPM se reserva la facultad y el derecho de modificar unilateralmente estos Términos y Condiciones. La entrada en vigor de dichas modificaciones se producirá desde el momento en que se le envíen al Integrador; si usted no está de acuerdo con dichas modificaciones, deberá abstenerse de continuar utilizando las API's. Si usted continúa usando las API's, tal aceptación tácita será manifestación de su voluntad plena y sin reservas."
          )]),
          empty(),

          // ── LEY APLICABLE Y JURISDICCIÓN ─────────────────────────────────────
          section("LEY APLICABLE Y JURISDICCIÓN"),
          empty(),

          p([r(
            "Usted como apoderado de su representada acepta de manera expresa, someterse en caso de cualquier controversia, a la jurisdicción de los tribunales de la Ciudad de México, Estados Unidos Mexicanos, así como a las leyes aplicables vigentes en dicho lugar, renunciando expresamente a cualquier otra jurisdicción que por motivo de su nacionalidad o domicilio pudiera corresponder."
          )]),

          empty(),
          empty(),

          // ── Firma ─────────────────────────────────────────────────────────────
          p([r("FIRMA DE CONFORMIDAD Y ACEPTACIÓN ")], AlignmentType.CENTER),
          p([r(data.signing_date)], AlignmentType.CENTER),
          p([r(data.company_legal_name)], AlignmentType.CENTER),
          empty(AlignmentType.CENTER),
          empty(AlignmentType.CENTER),
          empty(AlignmentType.CENTER),
          empty(AlignmentType.CENTER),
          p([r("____________________________________________")], AlignmentType.CENTER),
          p([r(data.signer_full_name)], AlignmentType.CENTER),
        ],
      },
    ],
  })

  return Packer.toBuffer(doc)
}
