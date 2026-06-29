/**
 * import-merchant-2.ts — Importador del LOTE 2 (7 comercios), additive.
 * Mismas reglas que el lote 1, con dos mejoras de robustez:
 *   - Empareja nombres colapsando espacios raros (NBSP) + normalización Unicode.
 *   - Resuelve carpetas con acentos (NFC/NFD) y omite la copia duplicada de clinic shops.
 * Validado contra disco antes de entregarse (rutas + sin huérfanos).
 *
 * Uso (uno por uno):
 *   CLIENTS_DIR="/ruta/a/Documentos Clientes Tarjetas" MERCHANT=alfeobe DRY_RUN=1 npx tsx scripts/import-merchant-2.ts
 *   CLIENTS_DIR="/ruta/a/Documentos Clientes Tarjetas" MERCHANT=alfeobe          npx tsx scripts/import-merchant-2.ts
 * Comercios: alfeobe, arindi, atencion, industria, itanosbea, kingnik, clinic_shops
 */
import { createClient } from '@supabase/supabase-js';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, extname } from 'node:path';
import { randomUUID } from 'node:crypto';

const CONFIG_VERSION = 'merchants-2026-06-28-v2';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const DRY_RUN      = process.env.DRY_RUN === '1';
const MERCHANT     = process.env.MERCHANT ?? '';
const CLIENTS_DIR  = process.env.CLIENTS_DIR ?? './Documentos Clientes Tarjetas';
const BUCKET='kyc-documents';
const CARDS_PRODUCT_ID='0335e6a0-f4bc-4243-8b5e-f1dce581e5ee';
const CREATED_BY='fafed1ee-8517-4309-bca2-c4aaa9beb152';
const COMPANY_STATUS='active', APP_STATUS='activated', DOC_STATUS_FILLED='approved';
const MIME: Record<string,string> = { '.pdf':'application/pdf','.jpeg':'image/jpeg','.jpg':'image/jpeg','.png':'image/png','.xlsx':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','.docx':'application/vnd.openxmlformats-officedocument.wordprocessingml.document' };

type Dest = { code: string } | { skip: string };
interface MerchantConfig { dir: string; company: { legal_name:string; tax_id:string; person_type:'persona_moral'; terminal_type:'card_present'|'ecommerce'|'both'; }; files: Record<string,Dest>; }
interface Manifest { version:string; merchants: Record<string,MerchantConfig>; }
const MANIFEST: Manifest = {
  "version": "merchants-2026-06-28-v2",
  "merchants": {
    "alfeobe": {
      "dir": "ALFEOBE ",
      "company": {
        "legal_name": "ALFEOBE ALUMINIO Y COMPLEMENTOS, S.A. DE C.V.",
        "tax_id": "AAC240527369",
        "person_type": "persona_moral",
        "terminal_type": "card_present"
      },
      "files": {
        "ESCRITURA 24,175 ALFEOBE ALUMIONIO Y COMPLEMENTOS SA DE CV.pdf": {
          "code": "incorporation_act"
        },
        "ACTA DE ASAMBLEA ALFEOBE  (ESCRITURA 7,150).pdf": {
          "code": "annex"
        },
        "BOLETA REGISTRO ALFEOBE ALUMINIO Y COMPLEMENTOS SA DE CV.pdf": {
          "code": "inscription_rpc"
        },
        "CSF ALFEOBE MAYO 2026.pdf": {
          "code": "cif"
        },
        "Acuse_FIEL-1.pdf": {
          "code": "efirma"
        },
        "Acuse Declaración Anual Alfeobe 2025.pdf": {
          "code": "tax_declaration"
        },
        "Declaración Anual Alfeobe 2025.pdf": {
          "code": "annex"
        },
        "OP POSITIVA ALFEOBE.pdf": {
          "code": "sat_compliance"
        },
        "ALFEOBE ALUMINIO Y COMPLEMENTOS Constancia_Beneficiario_Controlador   1 (1).pdf": {
          "code": "beneficial_owner"
        },
        "ALFEOBE ALUMINIO Y COMPLEMENTOS Declaración Beneficiario Controlador.pdf": {
          "code": "beneficial_owner"
        },
        "COMPROBANTE ALFEOBE ABRIL (1).pdf": {
          "code": "company_address_proof"
        },
        "COMPROBANTE ALFEOBE MAR.pdf": {
          "code": "annex"
        },
        "CSF EDITH LIZVED MARTÍNEZ MUÑOZ MARZO 2026.pdf": {
          "code": "annex"
        },
        "CSF JULIETA HERNANDEZ ZERTUCHE MAYO 26.pdf": {
          "code": "annex"
        },
        "Document_260604_005357.pdf": {
          "code": "annex"
        },
        "INE MARTINEZ MUÑOZ EDITH LIZVED - FRENTE.jpeg": {
          "code": "legal_rep_id"
        },
        "INE MARTINEZ MUÑOZ EDITH LIZVED - REVERSO.jpeg": {
          "code": "legal_rep_id"
        },
        "Información complementaria-1755623748 (3) ALFEOBE.xlsx": {
          "code": "complementary_info"
        },
        "WhatsApp Image 2026-05-20 at 12.23.40 PM.jpeg": {
          "code": "legal_rep_selfie"
        }
      }
    },
    "arindi": {
      "dir": "Arindi Qro S.A. de C.V.",
      "company": {
        "legal_name": "ARINDI QRO, S.A. DE C.V.",
        "tax_id": "AQR1501156B0",
        "person_type": "persona_moral",
        "terminal_type": "card_present"
      },
      "files": {
        "1. ACTA CONSTITUTIVA ARINDI SERVICIOS .pdf": {
          "code": "incorporation_act"
        },
        "2. ASAMBLEA ARINDI SERVICIOS .pdf": {
          "code": "annex"
        },
        "ARINDI QRO BUENA asamblea.pdf": {
          "code": "annex"
        },
        "3.-E.FIRMA ARINDI SERVICIOS.pdf": {
          "code": "efirma"
        },
        "CSF ARINDI QRO ABR26.pdf": {
          "code": "cif"
        },
        "AQR1501156B0.36.2025.pdf": {
          "code": "tax_declaration"
        },
        "ACUSE ANUAL 2025 ARINDI QRO.pdf": {
          "code": "annex"
        },
        "8. INE RL ARINDI SERV.pdf": {
          "code": "legal_rep_id"
        },
        "7. INE ACCIONISTAS-MIGUEL 2025.pdf": {
          "code": "shareholder_id"
        },
        "Csf_HEHS8209214E5_SYLVIA HH.pdf": {
          "code": "annex"
        },
        "DEL VALLE INT. 604A MAYO 2026 (2).pdf": {
          "code": "company_address_proof"
        },
        "CARATULA_ARINDI QRO_BANKAOOL.pdf": {
          "code": "bank_statement"
        },
        "Info para-to ALBO ARINDI QRO.xlsx": {
          "code": "complementary_info"
        },
        "2026-06-01_013814.pdf": {
          "code": "annex"
        },
        "términos y condiciones arindi qro.pdf": {
          "code": "terms_and_conditions"
        },
        "WhatsApp Image 2026-04-23 at 16.10.23.jpeg": {
          "code": "legal_rep_selfie"
        }
      }
    },
    "atencion": {
      "dir": "Atención a la salud palace sa de cv ",
      "company": {
        "legal_name": "ATENCION A LA SALUD PALACE, S.A. DE C.V.",
        "tax_id": "ASP210819IC2",
        "person_type": "persona_moral",
        "terminal_type": "card_present"
      },
      "files": {
        "AC- 260 ATENCION A LA SALUD PALACE SA DE CV (1) (1).pdf": {
          "code": "incorporation_act"
        },
        "52,408 - ATENCION A LA SALUD (1) (1).pdf": {
          "code": "annex"
        },
        "CSF ATENCION A LA SALUD.pdf": {
          "code": "cif"
        },
        "Constancia ASP 12-06-26.pdf": {
          "code": "annex"
        },
        "Acuse_renovacion ATENCION A LA SALUD.pdf": {
          "code": "efirma"
        },
        "Reporte Opinion ASP 12-06-26.pdf": {
          "code": "sat_compliance"
        },
        "Constancia_Beneficiario_Controlador (1).docx": {
          "code": "beneficial_owner"
        },
        "declaración beneficiario controlador.pdf": {
          "code": "beneficial_owner"
        },
        "ESTADO_CUENTA_MAYO_2026_MOVIMIENTOS_TAPADOS.pdf": {
          "code": "bank_statement"
        },
        "INE DANIEL ABSALON.pdf": {
          "code": "legal_rep_id"
        },
        "Información complementaria (3).xlsx": {
          "code": "complementary_info"
        },
        "02 Declaracion ASP Mayo 26.pdf": {
          "code": "annex"
        },
        "Documento_2026-06-17_144554.pdf": {
          "code": "annex"
        },
        "WhatsApp Image 2026-06-16 at 17.09.21.jpeg": {
          "code": "legal_rep_selfie"
        }
      }
    },
    "industria": {
      "dir": "Industria MX Sruns S.A. de C.V. ",
      "company": {
        "legal_name": "INDUSTRIA MX SRUNS, S.A. DE C.V.",
        "tax_id": "ISR240809JQA",
        "person_type": "persona_moral",
        "terminal_type": "card_present"
      },
      "files": {
        "Acta constitutiva y RPPyC.pdf": {
          "code": "incorporation_act"
        },
        "2. ASAMBLEA 51,448 INDUSTRIAS MX SRUNS - AGU.pdf": {
          "code": "annex"
        },
        "2. RPP 51,448.pdf": {
          "code": "inscription_rpc"
        },
        "Csf_ISR240809JQA (1).pdf": {
          "code": "cif"
        },
        "Csf_ISR240809JQA.pdf": {
          "code": "annex"
        },
        "Acuse Anual Ejercicio 2025.pdf": {
          "code": "tax_declaration"
        },
        "Declaracion ejercicio 2025.pdf": {
          "code": "annex"
        },
        "OP INDUSTRIAS MX SRUNS ABRIL.pdf": {
          "code": "sat_compliance"
        },
        "INDUSTRIA MX SRUNS S.A. DE C.V. Declaración de beneficiario (1).pdf": {
          "code": "beneficial_owner"
        },
        "508200202515 ABRIL.pdf": {
          "code": "company_address_proof"
        },
        "INE LUIS JORGE.pdf": {
          "code": "legal_rep_id"
        },
        "CURP_MAEL990409HJCRSS03.pdf": {
          "code": "annex"
        },
        "Información complementaria-1755623748 (2).xlsx": {
          "code": "complementary_info"
        },
        "TÉRMINOS Y CONDICIONES Industrias SRUNS.pdf": {
          "code": "terms_and_conditions"
        },
        "Document_260604_005357 (1).pdf": {
          "code": "annex"
        },
        "noresponder@gmail.com_20260415_121826.pdf": {
          "code": "annex"
        },
        "noresponder@gmail.com_20260420_133343.pdf": {
          "code": "annex"
        },
        "WhatsApp Image 2026-04-13 at 2.12.41 PM.jpeg": {
          "code": "annex"
        },
        "WhatsApp Image 2026-04-13 at 2.12.53 PM.jpeg": {
          "code": "annex"
        },
        "WhatsApp Image 2026-04-15 at 9.35.13 AM (1).jpeg": {
          "code": "legal_rep_selfie"
        },
        "WhatsApp Image 2026-04-15 at 9.35.13 AM.jpeg": {
          "code": "legal_rep_selfie"
        },
        "WhatsApp Image 2026-04-15 at 9.37.27 AM.jpeg": {
          "code": "legal_rep_selfie"
        },
        "WhatsApp Image 2026-04-22 at 1.42.07 PM.jpeg": {
          "code": "shareholder_id"
        },
        "WhatsApp Image 2026-04-22 at 1.42.11 PM.jpeg": {
          "code": "shareholder_id"
        }
      }
    },
    "itanosbea": {
      "dir": "Itanosbea S.A.P.I. de C.V.",
      "company": {
        "legal_name": "ITANOSBEA CORPORATIVO DE APOYO ADMINISTRATIVO, S.A.P.I. DE C.V.",
        "tax_id": "ICA250226Q67",
        "person_type": "persona_moral",
        "terminal_type": "card_present"
      },
      "files": {
        "1. POLIZA NUMERO 3,752 ITANOSBEA CORPORATIVO DE APOYO ADMINISTRATIVO SAPI DE CV.pdf": {
          "code": "incorporation_act"
        },
        "1. ACTA ASAMBLEA FORMALIZACION ITANOSBEA (1).pdf": {
          "code": "annex"
        },
        "2. M4- Registro publico Itanosbea.pdf": {
          "code": "inscription_rpc"
        },
        "2. Reg. Pub. de Com._2025002604800043-BOLETA (1).pdf": {
          "code": "annex"
        },
        "CSF Itanosbea 02-Mayo-2026.pdf": {
          "code": "cif"
        },
        "ACUSE EFIRMA SAT ITANOSBEA CORPORATIVO DE APOYO ADMINISTRATIVO SAPI DE CV.pdf": {
          "code": "efirma"
        },
        "ICA250226Q67.36.2025.pdf": {
          "code": "tax_declaration"
        },
        "32 D Opinión Itanosbea 03-Abr-2024.pdf": {
          "code": "sat_compliance"
        },
        "Constancia Beneficiario Controlador (3).pdf": {
          "code": "beneficial_owner"
        },
        "6. INE RL.pdf": {
          "code": "legal_rep_id"
        },
        "7. Csf_CEAM671215N62-RL.pdf": {
          "code": "annex"
        },
        "payefy_info_complementaria_ITANOSBEA.xlsx": {
          "code": "complementary_info"
        },
        "payefy_info_complementaria2 (1).pdf": {
          "code": "annex"
        },
        "Acuse.pdf": {
          "code": "annex"
        },
        "FIRMA- MA.pdf": {
          "code": "annex"
        },
        "tanosbea Corporativo De Apoyo Administrativo.PDF": {
          "code": "annex"
        },
        "WhatsApp Image 2026-04-13 at 10.26.25.jpeg": {
          "code": "legal_rep_selfie"
        }
      }
    },
    "kingnik": {
      "dir": "Kingnik, S.A. de C.V. ",
      "company": {
        "legal_name": "KINGNIK, S.A. DE C.V.",
        "tax_id": "KIN231204DW0",
        "person_type": "persona_moral",
        "terminal_type": "card_present"
      },
      "files": {
        "Acta Consitutiva 57,765 Kingnik.pdf": {
          "code": "incorporation_act"
        },
        "Acta Constitutiva 59,250 Kingnik.pdf": {
          "code": "incorporation_act_update"
        },
        "RPP CONST KINGNIK_1er testimonio.pdf": {
          "code": "inscription_rpc"
        },
        "RPP CONST KINGNIK_2o testimonio.pdf": {
          "code": "annex"
        },
        "CSF Kingnik Marzo 2026.pdf": {
          "code": "cif"
        },
        "Fiel Vigente_KINGNIK.pdf": {
          "code": "efirma"
        },
        "Anual 2025.pdf": {
          "code": "tax_declaration"
        },
        "Opinion Cumplimiento Dic 2026.pdf": {
          "code": "sat_compliance"
        },
        "Constancia_Beneficiario_Controlador..pdf": {
          "code": "beneficial_owner"
        },
        "Comprobante domicilio KINGNIK.pdf": {
          "code": "company_address_proof"
        },
        "141120300311 - 2026-05-28T091409.158.pdf": {
          "code": "annex"
        },
        "Comprobante domicilio Diego Armando.pdf": {
          "code": "annex"
        },
        "INE Armando Islas.pdf": {
          "code": "legal_rep_id"
        },
        "INE Raquel Gonzalez Lopez .pdf": {
          "code": "shareholder_id"
        },
        "CSF Armando Islas 2026.pdf": {
          "code": "annex"
        },
        "CSF_GOLR851020GX1_Raquel Gonzalez Lopez.pdf": {
          "code": "annex"
        },
        "CURP_IAJD811113HDFSRG00.pdf": {
          "code": "annex"
        },
        "Informacion extra kingnik.pdf": {
          "code": "complementary_info"
        },
        "Medios de contacto.pdf": {
          "code": "annex"
        },
        "Carta PLD.pdf": {
          "code": "annex"
        },
        "signal-2026-04-15-130232.jpeg": {
          "code": "legal_rep_selfie"
        },
        "Caratula_Credito_Revolvente_MATCH_CONTRATO.docx (3).pdf": {
          "skip": "contract"
        },
        "Contrato Crédito Revolvente Payefy + Bitfin + Kingnik.docx (1).pdf": {
          "skip": "contract"
        },
        "Contrato_Arrendamiento(1).pdf": {
          "skip": "contract"
        },
        "Docusign/Caratula_Credito_Revolvente_MATCH_CONTRATO.docx.pdf": {
          "skip": "contract"
        },
        "Docusign/Contrato Crédito Revolvente Payefy + Bitfin + Kingnik.docx.pdf": {
          "skip": "contract"
        }
      }
    },
    "clinic_shops": {
      "dir": "clinic shops ",
      "company": {
        "legal_name": "CLINIC SHOPS, S.A. DE C.V.",
        "tax_id": "CSH2404166LA",
        "person_type": "persona_moral",
        "terminal_type": "card_present"
      },
      "files": {
        "AGOA 92,482 CLINIC SHOPS_compressed.pdf": {
          "code": "incorporation_act"
        },
        "CONSTITUTIVA 82411 CLINIC SHOPS_compressed.pdf": {
          "code": "annex"
        },
        "RPPC_AGOA 92,482 CLINIC SHOPS.pdf": {
          "code": "inscription_rpc"
        },
        "CIF CLINIC ABRIL 2026.pdf": {
          "code": "cif"
        },
        "COMPROBANTE DE GENERACIÓN DE FIEL.pdf": {
          "code": "efirma"
        },
        "CLINIC SHOPS - ANUAL 2025 RECIBO (1).pdf": {
          "code": "tax_declaration"
        },
        "CLINIC SHOPS - TOTAL PLAY MARZO 26.PDF": {
          "code": "company_address_proof"
        },
        "Información complementaria- answered.xlsx": {
          "code": "complementary_info"
        },
        "WhatsApp Image 2026-06-09 at 16.47.12 (1).jpeg": {
          "code": "legal_rep_selfie"
        },
        "Prueba de vida Geovana.jpeg": {
          "code": "legal_rep_selfie"
        },
        "WhatsApp Image 2026-06-09 at 16.47.12.jpeg": {
          "code": "legal_rep_id"
        },
        "WhatsApp Image 2026-06-09 at 16.47.13.jpeg": {
          "code": "legal_rep_id"
        },
        "KARIN FRENTE.jpg": {
          "code": "shareholder_id"
        },
        "KARIN REVERSO.jpg": {
          "code": "shareholder_id"
        },
        "SARAI ALFATO FRENTE.jpg": {
          "code": "shareholder_id"
        },
        "SARAI ALFARO REVERSO.jpg": {
          "code": "shareholder_id"
        },
        "ACUSE CLINIC ENERO 2025.pdf": {
          "code": "annex"
        },
        "ACUSE CLINIC FEBRERO 2025.pdf": {
          "code": "annex"
        },
        "ACUSE CLINIC MARZO 2025.pdf": {
          "code": "annex"
        },
        "ACUSE CLINIC ABRIL 2025.pdf": {
          "code": "annex"
        },
        "ACUSE CLINIC MAYO 2025.pdf": {
          "code": "annex"
        },
        "ACUSE CLINIC JUNIO 2025.pdf": {
          "code": "annex"
        },
        "ACUSE CLINIC JULIO 2025.pdf": {
          "code": "annex"
        },
        "ACUSE CLINIC AGOSTO 2025.pdf": {
          "code": "annex"
        },
        "ACUSE CLINIC SEPTIEMBRE 2025.pdf": {
          "code": "annex"
        },
        "CLINIC OCTUBRE 2025 ACUSE.pdf": {
          "code": "annex"
        },
        "CLINIC NOVIEMBRE 2025 ACUSE.pdf": {
          "code": "annex"
        },
        "CLINIC DICIEMBRE 2025 ACUSE.pdf": {
          "code": "annex"
        },
        "CLINIC SHOPS - ACUSE ENERO 2026.pdf": {
          "code": "annex"
        },
        "CLINIC SHOPS - ACUSE FEBRERO 2026.pdf": {
          "code": "annex"
        },
        "CLINIC SHOPS - ACUSE MARZO 2026.pdf": {
          "code": "annex"
        },
        "scan_20260610222256.pdf": {
          "code": "annex"
        },
        "scan_20260610222338.pdf": {
          "code": "annex"
        },
        "solicitud_informacion_subcuenta_albo (3) (1).pdf": {
          "code": "annex"
        }
      }
    }
  }
};

const norm = (s:string) => s.normalize('NFC').replace(/\s+/g,' ').trim();
function assertServiceRole(key:string){
  if (key.startsWith('sb_secret_')) return;
  try { const role=JSON.parse(Buffer.from(key.split('.')[1],'base64').toString()).role;
    if (role!=='service_role') throw new Error(`role="${role}", se esperaba service_role`); }
  catch { throw new Error('La key no parece service_role (ni sb_secret_ ni JWT service_role).'); }
}
const sanitize = (n:string)=>n.normalize('NFC').replace(/[^\w.\-() ]/g,'_');
const SKIP_DIRS = new Set(['__MACOSX','Clinic shops_extracted']);
function resolveDir(clientsDir:string, dir:string):string{
  const direct=join(clientsDir,dir); if (existsSync(direct)) return direct;
  for (const name of readdirSync(clientsDir))
    if (norm(name)===norm(dir) && statSync(join(clientsDir,name)).isDirectory()) return join(clientsDir,name);
  throw new Error(`No encuentro la carpeta del comercio: ${dir}`);
}
function diskIndex(baseDir:string):Map<string,string>{
  const out=new Map<string,string>();
  const walk=(dir:string)=>{ for(const name of readdirSync(dir)){
    if (SKIP_DIRS.has(name)||name==='.DS_Store'||name==='desktop.ini'||name.startsWith('._')) continue;
    const full=join(dir,name); const st=statSync(full);
    if (st.isDirectory()) walk(full);
    else if (st.size>0 && !name.toLowerCase().endsWith('.zip')) out.set(norm(relative(baseDir,full)), relative(baseDir,full));
  }};
  walk(baseDir); return out;
}

async function main(){
  console.log(`\n=== import-merchant-2 · CONFIG_VERSION=${CONFIG_VERSION} ===`);
  if (!SUPABASE_URL||!SERVICE_KEY) throw new Error('Faltan envs de Supabase.');
  assertServiceRole(SERVICE_KEY);
  const cfg=MANIFEST.merchants[MERCHANT];
  if (!cfg) throw new Error(`MERCHANT="${MERCHANT}" inválido. Opciones: ${Object.keys(MANIFEST.merchants).join(', ')}`);
  const baseDir=resolveDir(CLIENTS_DIR,cfg.dir);
  console.log(`Comercio: ${MERCHANT} ${DRY_RUN?'(DRY RUN)':'(REAL)'}\nCarpeta: ${baseDir}`);
  const idx=diskIndex(baseDir);
  const cfgKeys=new Set(Object.keys(cfg.files).map(norm));
  for (const [k,real] of idx) if (!cfgKeys.has(k)) console.warn(`  ⚠️ SIN MATCH: ${real}`);
  for (const rel of Object.keys(cfg.files)) if (!idx.has(norm(rel))) console.warn(`  ⚠️ NO en disco: ${rel}`);

  const db=createClient(SUPABASE_URL,SERVICE_KEY,{auth:{persistSession:false}});
  const { data: existing } = await db.from('companies').select('id').eq('tax_id',cfg.company.tax_id);
  if (existing?.length) throw new Error(`Ya existe empresa con RFC ${cfg.company.tax_id} (${existing[0].id}). Aborto.`);
  const { data: tpls, error: te } = await db.from('document_templates').select('id, code').eq('product_id',CARDS_PRODUCT_ID);
  if (te) throw te;
  const tpl=new Map(tpls!.map(t=>[t.code as string,t.id as string]));
  for (const d of Object.values(cfg.files)) if ('code' in d && !tpl.has(d.code)) throw new Error(`Template inexistente: ${d.code}`);

  if (DRY_RUN){
    console.log('\nRuteo:'); const tally:Record<string,number>={};
    for (const [rel,dest] of Object.entries(cfg.files)){
      const label='skip' in dest?`APARTADO (${dest.skip})`:dest.code; tally[label]=(tally[label]??0)+1;
      console.log(`  ${('skip' in dest?'⏭️ ':'→ ')+label}`.padEnd(34)+`  ${rel}`);
    }
    console.log('\nResumen por destino:'); Object.entries(tally).sort().forEach(([k,v])=>console.log(`  ${k.padEnd(24)} ${v}`));
    console.log(`\nSlots del checklist que se crearían: ${[...tpl.keys()].filter(c=>c!=='annex').length}`);
    console.log('DRY RUN: no se escribió nada.'); return;
  }

  const { data: company, error: ce } = await db.from('companies').insert({ ...cfg.company, status:COMPANY_STATUS, created_by:CREATED_BY }).select('id').single();
  if (ce) throw ce; const companyId=company!.id as string;
  const { data: app, error: ae } = await db.from('applications').insert({ company_id:companyId, product_id:CARDS_PRODUCT_ID, status:APP_STATUS, activated_at:new Date().toISOString() }).select('id').single();
  if (ae) throw ae; const appId=app!.id as string;
  console.log(`\nEmpresa ${companyId} · expediente ${appId}`);

  const slotId=new Map<string,string>();
  for (const [code,id] of tpl){ if (code==='annex') continue;
    const { data:d, error } = await db.from('documents').insert({ application_id:appId, template_id:id, status:'pending_upload' }).select('id').single();
    if (error) throw error; slotId.set(code,d!.id as string);
  }
  const usedSlot=new Set<string>(); let apartados=0;
  for (const [rel,dest] of Object.entries(cfg.files)){
    const real=idx.get(norm(rel)); if (!real){ console.warn(`  ⚠️ no resuelto: ${rel}`); continue; }
    if ('skip' in dest){ console.log(`  ⏭️  apartado (${dest.skip})  <-  ${real}`); apartados++; continue; }
    const code=dest.code; const full=join(baseDir,real); const ext=extname(real).toLowerCase();
    const buf=readFileSync(full); const contentType=MIME[ext]??'application/octet-stream'; const fileName=real.split('/').pop()!;
    let docId:string, version=1; const isSlot=code!=='annex';
    if (isSlot && !usedSlot.has(code)){ docId=slotId.get(code)!; usedSlot.add(code); } else { docId=randomUUID(); if (isSlot) version=2; }
    const path=`${companyId}/${appId}/${docId}/${sanitize(fileName)}`;
    const up=await db.storage.from(BUCKET).upload(path,buf,{contentType,upsert:false}); if (up.error) throw up.error;
    const row={ file_name:fileName, storage_path:path, mime_type:contentType, file_size:buf.length, status:DOC_STATUS_FILLED, is_checked:false, version, uploaded_by:CREATED_BY, uploaded_at:new Date().toISOString() };
    const fillsExistingSlot=isSlot && version===1;
    const { error } = fillsExistingSlot ? await db.from('documents').update(row).eq('id',docId)
      : await db.from('documents').insert({ ...row, id:docId, application_id:appId, template_id:tpl.get(code)! });
    if (error) throw error; console.log(`  ✓ ${code}${version>1?' (v2)':''}  <-  ${fileName}`);
  }
  console.log(`\n✅ ${MERCHANT}: company_id=${companyId}  application_id=${appId}  (apartados: ${apartados})`);
}
main().catch(e=>{ console.error('\n❌ ERROR:', e.message??e); process.exit(1); });
