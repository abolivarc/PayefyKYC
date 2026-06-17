import fs from "fs"
import path from "path"
import {
  AlignmentType,
  BorderStyle,
  Document,
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

// Logo path
const LOGO_PATH = path.join(process.cwd(), "public", "images", "payefy-logo.png")
// ImageRun transformation expects pixels at 96 dpi (1mm = 96/25.4 ≈ 3.78 px)
// Render logo at 30 mm wide, proportional height (original: 826 × 440 px)
const mmToPx = (mm: number) => Math.round(mm * 96 / 25.4)
const LOGO_W_PX = mmToPx(30)
const LOGO_H_PX = Math.round(LOGO_W_PX * (440 / 826))

// Fill value or underscores when blank
function v(value: string | undefined, len = 20): string {
  return value?.trim() ? value.trim() : "_".repeat(len)
}

function checkbox(checked: boolean): string {
  return checked ? "( X )" : "(    )"
}

function idCheckbox(field: BeneficialOwnerValues["id_type"], match: BeneficialOwnerValues["id_type"]): string {
  return checkbox(field === match)
}

function run(text: string, bold = false): TextRun {
  return new TextRun({ text, bold, font: "Tahoma", size: 24 })
}

function para(
  children: TextRun[],
  align: (typeof AlignmentType)[keyof typeof AlignmentType] = AlignmentType.BOTH
): Paragraph {
  return new Paragraph({ alignment: align, children })
}

function emptyLine(): Paragraph {
  return new Paragraph({ children: [new TextRun({ text: "", font: "Tahoma", size: 24 })] })
}

const SECTION_BORDERS = {
  top: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
  bottom: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
  left: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
  right: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
}

function sectionTable(header: string, bodyParagraphs: Paragraph[]): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
      left: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
      right: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
      insideVertical: { style: BorderStyle.NONE, size: 0, color: "000000" },
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

export async function generateBeneficialOwnerDocx(data: BeneficialOwnerValues): Promise<Buffer> {
  const hasBc = data.has_beneficial_owner

  // Load logo — fall back gracefully if file is missing in some envs
  let logoParagraph: Paragraph | null = null
  if (fs.existsSync(LOGO_PATH)) {
    const logoData = fs.readFileSync(LOGO_PATH)
    logoParagraph = new Paragraph({
      alignment: AlignmentType.LEFT,
      children: [
        new ImageRun({
          data: logoData,
          transformation: {
            width: LOGO_W_PX,
            height: LOGO_H_PX,
          },
          type: "png",
        }),
      ],
    })
  }

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
          // ── Logo ─────────────────────────────────────────────────────────────
          ...(logoParagraph ? [logoParagraph, emptyLine()] : []),

          // ── Título ──────────────────────────────────────────────────────────
          para([run("CONSTANCIA DE BENEFICIARIO CONTROLADOR", true)], AlignmentType.CENTER),

          emptyLine(),

          // ── Párrafo introductorio ────────────────────────────────────────────
          para([
            run(
              `En el acto u operación consistente en la emisión y comercialización de una tarjeta de crédito por parte de Payefy, S.A.P.I. de C.V. en favor de ${v(data.company_legal_name, 30)}, quien suscribe, en mi carácter de representante legal, declaro lo siguiente:`
            ),
          ]),

          emptyLine(),

          // ── Pregunta 1 ───────────────────────────────────────────────────────
          para([
            run(
              `¿Existe un Beneficiario Controlador?  Sí ${checkbox(hasBc)}      No ${checkbox(!hasBc)}`,
              true
            ),
          ]),

          para([
            run(
              'En caso de seleccionar la opción "No", no es necesario continuar con el resto del cuestionario, salvo la obligación de firme del presente documento'
            ),
          ]),

          emptyLine(),

          // ── Pregunta 2 ───────────────────────────────────────────────────────
          para([
            run(
              `¿Cuenta con información y documentación que permita identificar al Beneficiario Controlador?  Sí ${checkbox(hasBc)}      No ${checkbox(!hasBc)}`,
              true
            ),
          ]),

          emptyLine(),

          // ── Tabla 1: Datos Generales ─────────────────────────────────────────
          sectionTable("Datos Generales del Beneficiario Controlador", [
            para([run(`Nombre completo: ${v(data.owner_full_name, 55)}`)]),
            para([
              run(
                `Fecha de nacimiento: ${v(data.owner_birth_date, 18)}      País de nacimiento: ${v(data.owner_birth_country, 18)}`
              ),
            ]),
            para([
              run(
                `País de nacionalidad: ${v(data.owner_nationality, 18)}     Ocupación: ${v(data.owner_occupation, 24)}`
              ),
            ]),
            para([run(`Domicilio completo: ${v(data.owner_address, 55)}`)]),
            para([run("_".repeat(71))]),
            para([
              run(
                `Número telefónico: ${v(data.owner_phone, 19)}   Correo electrónico: ${v(data.owner_email, 40)}`
              ),
            ]),
            para([run(`Clave Única de Registro de Población (CURP): ${v(data.owner_curp, 33)}`)]),
            para([run(`Clave del Registro Federal de Contribuyentes (RFC): ${v(data.owner_rfc, 29)}`)]),
          ]),

          emptyLine(),

          // ── Tabla 2: Datos de la identificación ─────────────────────────────
          sectionTable("Datos de la identificación", [
            para([
              run(
                `Documento:    Credencial para votar ${idCheckbox(data.id_type, "credencial")}        Pasaporte ${idCheckbox(data.id_type, "pasaporte")}       Forma Migratoria ${idCheckbox(data.id_type, "migratorio")}`,
                true
              ),
            ]),
            para([run(`Autoridad que la emite: ${v(data.id_authority, 25)}`)]),
            para([run(`Número de identificación: ${v(data.id_number, 23)}`)]),
          ]),

          emptyLine(),

          // ── Tabla 3: Documentos ──────────────────────────────────────────────
          sectionTable("Documentos Beneficiario Controlador", [
            para([run("Identificación.", true)]),
            para([run("CURP.", true)]),
            para([run("Constancia Situación Fiscal.", true)]),
            para([run("Comprobante de domicilio con antigüedad menor a 3 meses.", true)]),
          ]),

          emptyLine(),
          emptyLine(),

          // ── Declaración final ────────────────────────────────────────────────
          para([run("Lo anterior, se declara bajo protesta de decir verdad.")]),

          emptyLine(),
          emptyLine(),
          emptyLine(),

          // ── Firma ────────────────────────────────────────────────────────────
          para([run("_____________________________")], AlignmentType.CENTER),
          para(
            [run(`Nombre: ${v(data.signer_full_name, 30)}`, true)],
            AlignmentType.CENTER
          ),
          para(
            [run(`Fecha: ${v(data.signing_date, 20)}`, true)],
            AlignmentType.CENTER
          ),
        ],
      },
    ],
  })

  return Packer.toBuffer(doc)
}
