import fs from "fs"
import path from "path"
import {
  AlignmentType,
  BorderStyle,
  Document,
  FootnoteReferenceRun,
  ImageRun,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  convertMillimetersToTwip,
} from "docx"
import type { BeneficialOwnerValues } from "@/lib/validations/beneficial-owner"

const LOGO_PATH = path.join(process.cwd(), "public", "images", "payefy-logo.png")
const mmToPx = (mm: number) => Math.round(mm * 96 / 25.4)
const LOGO_W_PX = mmToPx(30)
const LOGO_H_PX = Math.round(LOGO_W_PX * (440 / 826))

function v(value: string | undefined, len = 20): string {
  return value?.trim() ? value.trim() : "_".repeat(len)
}

function checkbox(checked: boolean): string {
  return checked ? "( X )" : "(    )"
}

function idCheckbox(
  field: BeneficialOwnerValues["id_type"],
  match: BeneficialOwnerValues["id_type"]
): string {
  return checkbox(field === match)
}

function run(text: string, bold = false): TextRun {
  return new TextRun({ text, bold, font: "Tahoma", size: 24 })
}

function para(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  children: any[],
  align: (typeof AlignmentType)[keyof typeof AlignmentType] = AlignmentType.BOTH
): Paragraph {
  return new Paragraph({ alignment: align, children })
}

function emptyLine(): Paragraph {
  return new Paragraph({ children: [new TextRun({ text: "", font: "Tahoma", size: 24 })] })
}

const SECTION_BORDERS = {
  top:    { style: BorderStyle.SINGLE, size: 4, color: "000000" },
  bottom: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
  left:   { style: BorderStyle.SINGLE, size: 4, color: "000000" },
  right:  { style: BorderStyle.SINGLE, size: 4, color: "000000" },
}

// Section header is bold per document format
function sectionTable(header: string, bodyParagraphs: Paragraph[]): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top:              { style: BorderStyle.SINGLE, size: 4, color: "000000" },
      bottom:           { style: BorderStyle.SINGLE, size: 4, color: "000000" },
      left:             { style: BorderStyle.SINGLE, size: 4, color: "000000" },
      right:            { style: BorderStyle.SINGLE, size: 4, color: "000000" },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
      insideVertical:   { style: BorderStyle.NONE,   size: 0, color: "000000" },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            shading: { fill: "BFBFBF", type: ShadingType.CLEAR, color: "auto" },
            borders: SECTION_BORDERS,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [run(header, true)],
              }),
            ],
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            borders: SECTION_BORDERS,
            children: bodyParagraphs,
          }),
        ],
      }),
    ],
  })
}

const FOOTNOTE_ID = 1
const FOOTNOTE_TEXT =
  "Se entiende por Beneficiario Controlador a la persona física o grupo de personas físicas que: " +
  "(a) directamente o por medio de alguna persona obtiene, en última instancia, el beneficio de goce, uso, " +
  "disfrute, aprovechamiento o disposición del servicio a contratar, o (b) ejerce el control efectivo en última " +
  "instancia de aquella persona moral que lleve a cabo los actos, así como las personas por cuenta de quienes " +
  "celebra el contrato. Se entiende que una persona o grupo de personas controla de manera efectiva una persona " +
  "moral cuando: (i) impone, directa o indirecta, decisiones en las asambleas de accionistas o nombra o destituye " +
  "a los miembros del consejo, (ii) mantiene la titularidad de los derechos que permiten, directa o indirectamente, " +
  "ejercer el voto respecto de más del 25% del capital social, o (iii) dirige, directa o indirectamente, la " +
  "administración, estrategia o las principales políticas de la misma."

export async function generateBeneficialOwnerDocx(data: BeneficialOwnerValues): Promise<Buffer> {
  const hasBc = data.has_beneficial_owner

  // When hasBc=true and field has a value: render the value underlined (visually "over the line").
  // When hasBc=false or field is empty: render blank underscores.
  function field(value: string | undefined, len: number): TextRun {
    if (hasBc && value?.trim()) {
      return new TextRun({ text: value.trim(), font: "Tahoma", size: 24, underline: {} })
    }
    return new TextRun({ text: "_".repeat(len), font: "Tahoma", size: 24 })
  }

  let logoParagraph: Paragraph | null = null
  if (fs.existsSync(LOGO_PATH)) {
    const logoData = fs.readFileSync(LOGO_PATH)
    logoParagraph = new Paragraph({
      alignment: AlignmentType.LEFT,
      children: [
        new ImageRun({
          data: logoData,
          transformation: { width: LOGO_W_PX, height: LOGO_H_PX },
          type: "png",
        }),
      ],
    })
  }

  const doc = new Document({
    footnotes: {
      [FOOTNOTE_ID]: {
        children: [
          new Paragraph({
            children: [
              new TextRun({ text: FOOTNOTE_TEXT, font: "Tahoma", size: 18 }),
            ],
          }),
        ],
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: {
              width:  convertMillimetersToTwip(216),
              height: convertMillimetersToTwip(279),
            },
            margin: {
              top:    convertMillimetersToTwip(25),
              right:  convertMillimetersToTwip(25),
              bottom: convertMillimetersToTwip(25),
              left:   convertMillimetersToTwip(25),
            },
          },
        },
        children: [
          // ── Logo ─────────────────────────────────────────────────────────
          ...(logoParagraph ? [logoParagraph, emptyLine()] : []),

          // ── Título (negrita) ─────────────────────────────────────────────
          para([run("CONSTANCIA DE BENEFICIARIO CONTROLADOR", true)], AlignmentType.CENTER),

          emptyLine(),

          // ── Párrafo introductorio (normal) ───────────────────────────────
          para([
            run(
              `En el acto u operación consistente en la emisión y comercialización de una tarjeta de crédito por parte de Payefy, S.A.P.I. de C.V. en favor de ${v(data.company_legal_name, 30)}, quien suscribe, en mi carácter de representante legal, declaro lo siguiente:`
            ),
          ]),

          emptyLine(),

          // ── Pregunta 1: texto normal, Sí/No en negrita, nota al pie ──────
          para([
            run("¿Existe un Beneficiario Controlador?  "),
            run(`Sí ${checkbox(hasBc)}`, true),
            run("      "),
            run(`No ${checkbox(!hasBc)}`, true),
            new FootnoteReferenceRun(FOOTNOTE_ID),
          ]),

          // Nota aclaratoria en itálica
          para([
            new TextRun({
              text: 'En caso de seleccionar la opción "No", no es necesario continuar con el resto del cuestionario, salvo la obligación de firme del presente documento',
              font: "Tahoma",
              size: 24,
              italics: true,
            }),
          ]),

          emptyLine(),

          // ── Pregunta 2: texto normal, Sí/No en negrita ───────────────────
          para([
            run("¿Cuenta con información y documentación que permita identificar al Beneficiario Controlador?  "),
            run(`Sí ${checkbox(hasBc)}`, true),
            run("      "),
            run(`No ${checkbox(!hasBc)}`, true),
          ]),

          emptyLine(),

          // ── Tabla 1: Datos Generales ─────────────────────────────────────
          sectionTable("Datos Generales del Beneficiario Controlador", [
            para([run("Nombre completo: "), field(data.owner_full_name, 55)]),
            para([
              run("Fecha de nacimiento: "),
              field(data.owner_birth_date, 18),
              run("      País de nacimiento: "),
              field(data.owner_birth_country, 18),
            ]),
            para([
              run("País de nacionalidad: "),
              field(data.owner_nationality, 18),
              run("     Ocupación: "),
              field(data.owner_occupation, 24),
            ]),
            para([run("Domicilio completo: "), field(data.owner_address, 55)]),
            para([run("_".repeat(71))]),
            para([
              run("Número telefónico: "),
              field(data.owner_phone, 19),
              run("   Correo electrónico: "),
              field(data.owner_email, 40),
            ]),
            para([run("Clave Única de Registro de Población (CURP): "), field(data.owner_curp, 33)]),
            para([run("Clave del Registro Federal de Contribuyentes (RFC): "), field(data.owner_rfc, 29)]),
          ]),

          emptyLine(),

          // ── Tabla 2: Datos de la identificación ─────────────────────────
          sectionTable("Datos de la identificación", [
            // Document type line: label normal, options in negrita
            para([
              run("Documento:    "),
              run(
                `Credencial para votar ${idCheckbox(data.id_type, "credencial")}        Pasaporte ${idCheckbox(data.id_type, "pasaporte")}       Forma Migratoria ${idCheckbox(data.id_type, "migratorio")}`,
                true
              ),
            ]),
            para([run("Autoridad que la emite: "), field(data.id_authority, 25)]),
            para([run("Número de identificación: "), field(data.id_number, 23)]),
          ]),

          emptyLine(),

          // ── Tabla 3: Documentos ──────────────────────────────────────────
          sectionTable("Documentos Beneficiario Controlador", [
            para([run("Identificación.")]),
            para([run("CURP.")]),
            para([run("Constancia Situación Fiscal.")]),
            para([run("Comprobante de domicilio con antigüedad menor a 3 meses.")]),
          ]),

          emptyLine(),
          emptyLine(),

          // ── Declaración final ────────────────────────────────────────────
          para([run("Lo anterior, se declara bajo protesta de decir verdad.")]),

          emptyLine(),
          emptyLine(),
          emptyLine(),

          // ── Firma ────────────────────────────────────────────────────────
          para([run("_____________________________")], AlignmentType.CENTER),
          // "Nombre:" y "Fecha:" en negrita; valores en normal
          para(
            [run("Nombre: ", true), run(v(data.signer_full_name, 30))],
            AlignmentType.CENTER
          ),
          para(
            [run("Fecha: ", true), run(v(data.signing_date, 20))],
            AlignmentType.CENTER
          ),
        ],
      },
    ],
  })

  return Packer.toBuffer(doc)
}
