/**
 * import-merchant.ts — Importador GENÉRICO y consolidado de expedientes Tarjetas.
 * 6 comercios embebidos y VALIDADOS contra disco (rutas + sin huérfanos).
 *
 * - 100% additive (no borra nada). Anti-duplicados por RFC.
 * - Tolerante a normalización Unicode (NFC/NFD) en nombres de archivo (acentos).
 * - DRY_RUN muestra el ruteo y un resumen por destino, sin escribir nada.
 * - Imprime CONFIG_VERSION para confirmar SIEMPRE que se corre el archivo correcto.
 * - Contratos y archivos no-documento se APARTAN (no se importan).
 *
 * Uso (uno por uno):
 *   CLIENTS_DIR="/ruta/a/Documentos Clientes Tarjetas 2" MERCHANT=ballano DRY_RUN=1 npx tsx scripts/import-merchant.ts
 *   CLIENTS_DIR="/ruta/a/Documentos Clientes Tarjetas 2" MERCHANT=ballano          npx tsx scripts/import-merchant.ts
 * Comercios: ballano, monarca, gastronomica, laverson, altix, procova
 *
 * Rollback (si hiciera falta, usando el company_id que imprime al final):
 *   delete from documents where application_id in (select id from applications where company_id='<ID>');
 *   delete from application_contracts where application_id in (select id from applications where company_id='<ID>');
 *   delete from applications where company_id='<ID>';
 *   delete from companies where id='<ID>';
 *   -- y borra del storage los objetos bajo el prefijo <ID>/
 */

import { createClient } from '@supabase/supabase-js';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, extname } from 'node:path';
import { randomUUID } from 'node:crypto';

const CONFIG_VERSION = 'merchants-2026-06-28-v1';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const DRY_RUN      = process.env.DRY_RUN === '1';
const MERCHANT     = process.env.MERCHANT ?? '';
const CLIENTS_DIR  = process.env.CLIENTS_DIR ?? './Documentos Clientes Tarjetas 2';

const BUCKET           = 'kyc-documents';
const CARDS_PRODUCT_ID = '0335e6a0-f4bc-4243-8b5e-f1dce581e5ee';
const CREATED_BY       = 'fafed1ee-8517-4309-bca2-c4aaa9beb152';

const COMPANY_STATUS    = 'active';
const APP_STATUS        = 'activated';
const DOC_STATUS_FILLED = 'approved';

const MIME: Record<string, string> = {
  '.pdf': 'application/pdf', '.jpeg': 'image/jpeg', '.jpg': 'image/jpeg', '.png': 'image/png',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.zip': 'application/zip',
};

type Dest = { code: string } | { skip: string };
interface MerchantConfig {
  dir: string;
  company: { legal_name: string; tax_id: string; person_type: 'persona_moral'; terminal_type: 'card_present' | 'ecommerce' | 'both'; };
  files: Record<string, Dest>;
}
interface Manifest { version: string; merchants: Record<string, MerchantConfig>; }

const MANIFEST: Manifest = {
  "version": "merchants-2026-06-28-v1",
  "merchants": {
    "ballano": {
      "dir": "Comercializadora Ballano S.A. de C.V. ",
      "company": {
        "legal_name": "COMERCIALIZADORA BALLANO S.A. DE C.V.",
        "tax_id": "CBA190806TY7",
        "person_type": "persona_moral",
        "terminal_type": "card_present"
      },
      "files": {
        "32D BALLANO .pdf": {
          "code": "sat_compliance"
        },
        "Acuse_GeneracionSellos_260512_184714.pdf": {
          "code": "efirma"
        },
        "CBA190806TY7.36.2025.pdf": {
          "code": "tax_declaration"
        },
        "CURP_AECK770704MDFRMT03 (3).pdf": {
          "code": "annex"
        },
        "Carnet de indentidad 26 may 2026.pdf": {
          "code": "annex"
        },
        "Constancia_Beneficiario_Controlador (1).pdf": {
          "code": "beneficial_owner"
        },
        "INE KATY ARELLANO  (2)(4).pdf": {
          "code": "legal_rep_id"
        },
        "Información complementaria (1) (2).xlsx": {
          "code": "complementary_info"
        },
        "RPP Ballano.pdf": {
          "code": "inscription_rpc"
        },
        "WhatsApp Image 2026-05-13 at 13.31.23.jpeg": {
          "code": "legal_rep_selfie"
        },
        "ac-ballano.pdf": {
          "code": "incorporation_act"
        },
        "certificado-domicilio.pdf": {
          "code": "company_address_proof"
        },
        "csf-ballano-060426.pdf": {
          "code": "cif"
        },
        "curp (1).pdf": {
          "code": "annex"
        },
        "datos-ballano.txt": {
          "skip": "nota"
        },
        "proto-ballano.pdf": {
          "code": "annex"
        }
      }
    },
    "monarca": {
      "dir": "Constructora Arrendadora e Inmobiliaria Monarca, S.A. de C.V.",
      "company": {
        "legal_name": "CONSTRUCTORA ARRENDADORA E INMOBILIARIA MONARCA, S.A. DE C.V.",
        "tax_id": "CAI050425VD2",
        "person_type": "persona_moral",
        "terminal_type": "card_present"
      },
      "files": {
        "Caratula_Credito_Revolvente_MATCH_CONTRATO.docx (4).pdf": {
          "skip": "contract"
        },
        "Complete_con_Docusign_Caratula_Credito_Revol.zip": {
          "skip": "contract"
        },
        "Constancia_Beneficiario_Controlador.pdf": {
          "code": "beneficial_owner"
        },
        "Contrato Crédito Revolvente Payefy + Bitfin + Monarcas.docx.pdf": {
          "skip": "contract"
        },
        "ac_monarcas.pdf": {
          "code": "incorporation_act"
        },
        "ac_monarcas_proto.pdf": {
          "code": "annex"
        },
        "comprobante_domicilio.pdf": {
          "code": "company_address_proof"
        },
        "csf_CAI050425VD2.pdf": {
          "code": "cif"
        },
        "csf_MOFF470109D71.pdf": {
          "code": "annex"
        },
        "csf_katya.pdf": {
          "code": "annex"
        },
        "csf_leticia.pdf": {
          "code": "annex"
        },
        "csf_monarcas.pdf": {
          "code": "annex"
        },
        "ine_FMDO.pdf": {
          "code": "shareholder_id"
        },
        "ine_fernando.pdf": {
          "code": "shareholder_id"
        },
        "ine_jorge.pdf": {
          "code": "shareholder_id"
        },
        "ine_katya.pdf": {
          "code": "shareholder_id"
        },
        "ine_leticia.pdf": {
          "code": "shareholder_id"
        },
        "ine_magali.pdf": {
          "code": "shareholder_id"
        },
        "payefy_info_complementaria_v2 3.pdf": {
          "code": "complementary_info"
        },
        "rfc_fernando.pdf": {
          "code": "annex"
        },
        "rfc_jorge.pdf": {
          "code": "annex"
        },
        "rfc_magali.pdf": {
          "code": "annex"
        },
        "rfc_monarcas.pdf": {
          "code": "annex"
        }
      }
    },
    "gastronomica": {
      "dir": "Gastronomica Esmeralda, S.A. de C.V.",
      "company": {
        "legal_name": "GASTRONOMICA ESMERALDA, S.A. DE C.V.",
        "tax_id": "GES090313FV9",
        "person_type": "persona_moral",
        "terminal_type": "card_present"
      },
      "files": {
        "1.-G ESMERALDA (Acta Constitutiva ).pdf": {
          "code": "incorporation_act"
        },
        "10.1-INE SOCIO NABOR.pdf": {
          "code": "shareholder_id"
        },
        "13. DECLARACION ANUAL GASTRONOMICA.pdf": {
          "code": "annex"
        },
        "2.-ASAMBLEA G. ESMERALDA (1).pdf": {
          "code": "annex"
        },
        "2026-03-09_040063.pdf": {
          "code": "annex"
        },
        "32D GASTRONOMICA MAR26.pdf": {
          "code": "sat_compliance"
        },
        "4. CONSTANCIA E FIRMA- GASTRONOMICA ESMERALDA.pdf": {
          "code": "efirma"
        },
        "ANUAL GASTRO 2025.pdf": {
          "code": "annex"
        },
        "CSF GASTRONOMICA 25MAY26.pdf": {
          "code": "cif"
        },
        "Complete_con_Docusign_Carátula_Contrato_Cre/Carátula_Contrato_Crédito_Revolvente.docx.pdf": {
          "skip": "contract"
        },
        "Complete_con_Docusign_Carátula_Contrato_Cre/Contrato_Crédito_Revolvente_Payefy_+_Bitfin.docx.pdf": {
          "skip": "contract"
        },
        "Complete_con_Docusign_Carátula_Contrato_Cre/Summary.pdf": {
          "skip": "contract"
        },
        "Csf_CAEM580929CT2_MIGUEL.pdf": {
          "code": "annex"
        },
        "GES090313FV9.36.2025.pdf": {
          "code": "tax_declaration"
        },
        "INE Anverso.jpeg": {
          "code": "legal_rep_id"
        },
        "INE Reverso.jpeg": {
          "code": "legal_rep_id"
        },
        "IZZI GASTRO MAR.pdf": {
          "code": "company_address_proof"
        },
        "TP_EdoctaResidencial4V2_B1-444729699T1-1.pdf": {
          "code": "annex"
        },
        "WhatsApp Image 2026-04-10 at 13.33.48.jpeg": {
          "code": "legal_rep_selfie"
        },
        "informacion complementaria gastronomica.pdf": {
          "code": "complementary_info"
        },
        "términos y condiciones gastro.pdf": {
          "code": "terms_and_conditions"
        }
      }
    },
    "laverson": {
      "dir": "Laverson Consultores",
      "company": {
        "legal_name": "LAVERSON CONSULTORES EMPRESARIALES S.A. DE C.V.",
        "tax_id": "LCE240605B19",
        "person_type": "persona_moral",
        "terminal_type": "card_present"
      },
      "files": {
        "10. Declaracion anual (Válido)/DECLARACION .LCE240605B19.36.2025 (1).pdf": {
          "code": "annex"
        },
        "10. Declaracion anual (Válido)/DECLARACION LCE240605B19.36.2025.pdf": {
          "code": "tax_declaration"
        },
        "13. Información complementaria (Válido)/Información complementaria-1755623748 LAVERSON2026.xlsx": {
          "code": "complementary_info"
        },
        "3. Identificación oficial del representante legal (Válido)/ine 2.jpeg": {
          "code": "legal_rep_id"
        },
        "3. Identificación oficial del representante legal (Válido)/ine1.jpeg": {
          "code": "legal_rep_id"
        },
        "5. Constancia de Firma electrónica avanzada vigente (Válido)/COMPROBANTE DE GENERACIÓN DE EFIRMA - LAVERSON CONSULTORES.pdf": {
          "code": "efirma"
        },
        "9. Prueba de vida con una fotografia sosteniendo la identificacion (Válido)/prueba de vida .jpeg": {
          "code": "legal_rep_selfie"
        },
        "Acta constitutiva inscrita en el Registro Público (Válido)/POLIZA 629 - ACTA CONSTITUTIVA - LAVERSON.pdf": {
          "code": "incorporation_act"
        },
        "Acta constitutiva inscrita en el Registro Público (Válido)/RPC 620 - LAVERSON.pdf": {
          "code": "inscription_rpc"
        },
        "CSF SARA LOZANO JUNIO.pdf": {
          "code": "annex"
        },
        "CURP Representante Legal (Válido)/CURP_VEBR730309MJCLJC01 2026.pdf": {
          "code": "annex"
        },
        "CURP_SARA LOZANO.pdf": {
          "code": "annex"
        },
        "Comprobante de domicilio (Válido)/COMPROBANTE DOM LAVERSON.pdf (1).pdf": {
          "code": "company_address_proof"
        },
        "Constancia de Situación Fiscal de la empresa (Válido)/csf laverson.pdf": {
          "code": "cif"
        },
        "LAVERSON CONSULTORES EMPRESARIALES S.A. DE C.V. Terminos y condiciones clientes de integradores (2).pdf": {
          "code": "terms_and_conditions"
        },
        "Opinión de cumplimiento (Válido)/32d l.pdf": {
          "code": "sat_compliance"
        },
        "RFC de Representante Legal (Válido)/CSF RL.pdf": {
          "code": "annex"
        }
      }
    },
    "altix": {
      "dir": "Materiales y Suministros Altix, S. de R.L. de C.V.",
      "company": {
        "legal_name": "MATERIALES Y SUMINISTROS ALTIX S. DE R.L. DE C.V.",
        "tax_id": "MSA180716GP0",
        "person_type": "persona_moral",
        "terminal_type": "card_present"
      },
      "files": {
        "01 Acuse Anual Altix 2024.pdf": {
          "code": "annex"
        },
        "01 Acuse Anual Altix 2025.pdf": {
          "code": "tax_declaration"
        },
        "01 Ene Acuse Altix 2026.pdf": {
          "code": "annex"
        },
        "01 INE Jorge Anastasio Ramírez Sánchez.pdf": {
          "code": "legal_rep_id"
        },
        "01 Inst 26,511 Acta Const. Segundo Instrumento .pdf": {
          "code": "incorporation_act"
        },
        "02 Constancia de FIEL Altix.pdf": {
          "code": "efirma"
        },
        "02 Detalle Anual Altix 2024.pdf": {
          "code": "annex"
        },
        "02 Detalle Anual Altix 2025.pdf": {
          "code": "annex"
        },
        "02 Ene Acuse Altix 2026 ISR Ret.pdf": {
          "code": "annex"
        },
        "02 Inst 7312 Segundo Inst. Cambio de socios.pdf": {
          "code": "incorporation_act_update"
        },
        "03 Ene Detalle Altix 2026.pdf": {
          "code": "annex"
        },
        "03 Inst. 8287 Cambio de socios.pdf": {
          "code": "annex"
        },
        "03 Mar CIF Altix al 01-Mar-2026.pdf": {
          "code": "cif"
        },
        "03 Mar Opinión IMSS Altix al 02-Mar-2026.pdf": {
          "code": "annex"
        },
        "03 Mar Opinión INFONAVIT Altix al 02-Mar-2026.pdf": {
          "code": "annex"
        },
        "03 Mar Opinión Positiva Altix al 01-Mar-2026.pdf": {
          "code": "sat_compliance"
        },
        "04 Ene Detalle Altix 2026 ISR Ret.pdf": {
          "code": "annex"
        },
        "04 Inst 14,065 Cambio socio min.pdf": {
          "code": "annex"
        },
        "05 Ene Acuse Altix 2026 ISR PM.pdf": {
          "code": "annex"
        },
        "06 Ene Detalle Altix 2026 ISR PM.pdf": {
          "code": "annex"
        },
        "ALTIX TELMEX ABR.pdf": {
          "code": "company_address_proof"
        },
        "Recibo-May.pdf": {
          "code": "annex"
        },
        "WhatsApp Image 2026-05-07 at 18.18.45 (1).jpeg": {
          "code": "legal_rep_selfie"
        },
        "WhatsApp Image 2026-05-07 at 18.36.24.jpeg": {
          "code": "legal_rep_selfie"
        },
        "doc02886520260326114927.pdf": {
          "code": "annex"
        },
        "docusign/Caratula_Credito_Revolvente_MATCH_CONTRATO.docx (1).pdf": {
          "skip": "contract"
        },
        "docusign/Contrato Crédito Revolvente Payefy   Bitfin   Altix.docx.pdf": {
          "skip": "contract"
        }
      }
    },
    "procova": {
      "dir": "Procova Capital S.A de C.V. ",
      "company": {
        "legal_name": "PROCOVA CAPITAL S.A. DE C.V.",
        "tax_id": "PCA241011ML0",
        "person_type": "persona_moral",
        "terminal_type": "card_present"
      },
      "files": {
        "05MAYO.pdf": {
          "code": "annex"
        },
        "ACTA PODER PROCOVA.pdf": {
          "code": "incorporation_act"
        },
        "BENEFICIARIO CONTROLADOR .pdf": {
          "code": "beneficial_owner"
        },
        "CARTA PP.pdf": {
          "code": "annex"
        },
        "COMPROBANTE  FIEL-PROCOVA.pdf": {
          "code": "efirma"
        },
        "Constancia.pdf": {
          "code": "cif"
        },
        "Csf_EIMA951125E94 ANGEL.pdf": {
          "code": "annex"
        },
        "Csf_EIMJ990325KH8 ELIAS.pdf": {
          "code": "annex"
        },
        "Csf_GAGD990627EZ4 DANIEL.pdf": {
          "code": "annex"
        },
        "INE ANGEL ENCISO.pdf": {
          "code": "shareholder_id"
        },
        "INE DANIEL GARCIA SOCIO.pdf": {
          "code": "shareholder_id"
        },
        "INE DANIEL GUZMAN.pdf": {
          "code": "shareholder_id"
        },
        "INE ELIAS APODERADO.pdf": {
          "code": "legal_rep_id"
        },
        "INFO COMPLEMENTARIA PROCOVA.pdf": {
          "code": "complementary_info"
        },
        "Información complementaria (1) (1).xlsx": {
          "code": "annex"
        },
        "OPINION PROCOVA SAT.pdf": {
          "code": "sat_compliance"
        },
        "ORGANIGRAMA PROCOVA .pdf": {
          "code": "organigrama"
        },
        "PCA241011ML0.36.2025.pdf": {
          "code": "tax_declaration"
        },
        "REGISTRO PUBLICO.pdf": {
          "code": "inscription_rpc"
        },
        "TERMINOS Y CONDICIONES .pdf": {
          "code": "terms_and_conditions"
        },
        "TP_EdoctaResidencial4V2_B1-453202130T1-1.pdf": {
          "code": "company_address_proof"
        },
        "WhatsApp Image 2026-05-19 at 13.00.50.jpeg": {
          "code": "legal_rep_selfie"
        }
      }
    }
  }
};

// ── helpers ──
function assertServiceRole(key: string) {
  if (key.startsWith('sb_secret_')) return;                 // formato nuevo de Supabase: no es JWT
  if (key.startsWith('sb_publishable_') || key.startsWith('eyJ') === false)
    {/* sigue al check de JWT abajo */}
  try {
    const role = JSON.parse(Buffer.from(key.split('.')[1], 'base64').toString()).role;
    if (role !== 'service_role')
      throw new Error(`La key tiene role="${role}", se esperaba service_role. ¿Pegaste el anon/publishable key?`);
  } catch {
    throw new Error('La key no parece service_role (ni sb_secret_ ni un JWT con role=service_role).');
  }
}
const sanitize = (n: string) => n.normalize('NFC').replace(/[^\w.\-() ]/g, '_');

// índice {NFC(relpath) -> relpath real en disco} para tolerar NFC/NFD y basura mac
function diskIndex(baseDir: string): Map<string, string> {
  const out = new Map<string, string>();
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      if (name === '__MACOSX' || name === '.DS_Store' || name === 'desktop.ini' || name.startsWith('._')) continue;
      const full = join(dir, name);
      const st = statSync(full);
      if (st.isDirectory()) walk(full);
      else if (st.size > 0) {
        const rel = relative(baseDir, full);
        out.set(rel.normalize('NFC'), rel);
      }
    }
  };
  walk(baseDir);
  return out;
}

async function main() {
  console.log(`\n=== import-merchant  ·  CONFIG_VERSION=${CONFIG_VERSION} ===`);
  if (!SUPABASE_URL || !SERVICE_KEY) throw new Error('Faltan envs de Supabase.');
  assertServiceRole(SERVICE_KEY);

  const cfg = MANIFEST.merchants[MERCHANT];
  if (!cfg) throw new Error(`MERCHANT="${MERCHANT}" inválido. Opciones: ${Object.keys(MANIFEST.merchants).join(', ')}`);

  const baseDir = join(CLIENTS_DIR, cfg.dir);
  if (!existsSync(baseDir)) throw new Error(`No encuentro la carpeta: ${baseDir}`);
  console.log(`Comercio: ${MERCHANT}  ${DRY_RUN ? '(DRY RUN)' : '(REAL)'}\nCarpeta: ${baseDir}`);

  const idx = diskIndex(baseDir);
  const cfgKeysNFC = new Set(Object.keys(cfg.files).map(k => k.normalize('NFC')));

  // archivos en disco sin mapear (no debería haber, ya validado)
  for (const [nfc, real] of idx) if (!cfgKeysNFC.has(nfc)) console.warn(`  ⚠️ SIN MATCH (revisar): ${real}`);
  // archivos del config que no estén en disco
  for (const rel of Object.keys(cfg.files)) if (!idx.has(rel.normalize('NFC'))) console.warn(`  ⚠️ NO está en disco: ${rel}`);

  // anti-duplicados
  const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  const { data: existing } = await db.from('companies').select('id').eq('tax_id', cfg.company.tax_id);
  if (existing?.length) throw new Error(`Ya existe empresa con RFC ${cfg.company.tax_id} (${existing[0].id}). Aborto.`);

  // plantillas
  const { data: tpls, error: te } = await db.from('document_templates').select('id, code').eq('product_id', CARDS_PRODUCT_ID);
  if (te) throw te;
  const tpl = new Map(tpls!.map(t => [t.code as string, t.id as string]));
  for (const d of Object.values(cfg.files)) if ('code' in d && !tpl.has(d.code)) throw new Error(`Template inexistente: ${d.code}`);

  if (DRY_RUN) {
    console.log('\nRuteo:');
    const tally: Record<string, number> = {};
    for (const [rel, dest] of Object.entries(cfg.files)) {
      const label = 'skip' in dest ? `APARTADO (${dest.skip})` : dest.code;
      tally[label] = (tally[label] ?? 0) + 1;
      console.log(`  ${('skip' in dest ? '⏭️ ' : '→ ') + label}`.padEnd(34) + `  ${rel}`);
    }
    console.log('\nResumen por destino:');
    Object.entries(tally).sort().forEach(([k, v]) => console.log(`  ${k.padEnd(24)} ${v}`));
    console.log(`\nSlots del checklist que se crearían: ${[...tpl.keys()].filter(c => c !== 'annex').length}`);
    console.log('DRY RUN: no se escribió nada.');
    return;
  }

  // empresa + application
  const { data: company, error: ce } = await db.from('companies')
    .insert({ ...cfg.company, status: COMPANY_STATUS, created_by: CREATED_BY }).select('id').single();
  if (ce) throw ce;
  const companyId = company!.id as string;
  const { data: app, error: ae } = await db.from('applications')
    .insert({ company_id: companyId, product_id: CARDS_PRODUCT_ID, status: APP_STATUS, activated_at: new Date().toISOString() })
    .select('id').single();
  if (ae) throw ae;
  const appId = app!.id as string;
  console.log(`\nEmpresa ${companyId} · expediente ${appId}`);

  // slots
  const slotId = new Map<string, string>();
  for (const [code, id] of tpl) {
    if (code === 'annex') continue;
    const { data: d, error } = await db.from('documents')
      .insert({ application_id: appId, template_id: id, status: 'pending_upload' }).select('id').single();
    if (error) throw error;
    slotId.set(code, d!.id as string);
  }

  // colocar archivos
  const usedSlot = new Set<string>();
  let apartados = 0;
  for (const [rel, dest] of Object.entries(cfg.files)) {
    const real = idx.get(rel.normalize('NFC'));
    if (!real) { console.warn(`  ⚠️ no resuelto en disco: ${rel}`); continue; }
    if ('skip' in dest) { console.log(`  ⏭️  apartado (${dest.skip})  <-  ${real}`); apartados++; continue; }

    const code = dest.code;
    const full = join(baseDir, real);
    const ext = extname(real).toLowerCase();
    const buf = readFileSync(full);
    const contentType = MIME[ext] ?? 'application/octet-stream';
    const fileName = real.split('/').pop()!;

    let docId: string, version = 1;
    const isSlot = code !== 'annex';
    if (isSlot && !usedSlot.has(code)) { docId = slotId.get(code)!; usedSlot.add(code); }
    else { docId = randomUUID(); if (isSlot) version = 2; }

    const path = `${companyId}/${appId}/${docId}/${sanitize(fileName)}`;
    const up = await db.storage.from(BUCKET).upload(path, buf, { contentType, upsert: false });
    if (up.error) throw up.error;

    const row = { file_name: fileName, storage_path: path, mime_type: contentType, file_size: buf.length,
      status: DOC_STATUS_FILLED, is_checked: false, version, uploaded_by: CREATED_BY, uploaded_at: new Date().toISOString() };
    const fillsExistingSlot = isSlot && version === 1;
    const { error } = fillsExistingSlot
      ? await db.from('documents').update(row).eq('id', docId)
      : await db.from('documents').insert({ ...row, id: docId, application_id: appId, template_id: tpl.get(code)! });
    if (error) throw error;
    console.log(`  ✓ ${code}${version > 1 ? ' (v2)' : ''}  <-  ${fileName}`);
  }
  console.log(`\n✅ ${MERCHANT}: company_id=${companyId}  application_id=${appId}  (apartados: ${apartados})`);
}
main().catch(e => { console.error('\n❌ ERROR:', e.message ?? e); process.exit(1); });
