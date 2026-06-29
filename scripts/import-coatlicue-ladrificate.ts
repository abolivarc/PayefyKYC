/**
 * import-coatlicue-ladrificate.ts — Par des-cruzado (additive).
 * Coatlicue y Ladrificate tenían archivos intercambiados entre carpetas
 * (incluido el acuse anual .36.2025, confirmado por el RFC DENTRO del PDF).
 * Cada archivo se asigna a su empresa por su RFC/etiqueta; rutas relativas a la
 * carpeta padre para poder jalar de ambas carpetas. Validado contra disco.
 *
 * Uso:
 *   CLIENTS_DIR="/ruta/a/Documentos Clientes Tarjetas" MERCHANT=coatlicue   DRY_RUN=1 npx tsx scripts/import-coatlicue-ladrificate.ts
 *   CLIENTS_DIR="/ruta/a/Documentos Clientes Tarjetas" MERCHANT=coatlicue             npx tsx scripts/import-coatlicue-ladrificate.ts
 * Comercios: coatlicue, ladrificate
 */
import { createClient } from '@supabase/supabase-js';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, extname } from 'node:path';
import { randomUUID } from 'node:crypto';

const CONFIG_VERSION = 'coa-ladri-2026-06-28-v1';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const DRY_RUN      = process.env.DRY_RUN === '1';
const MERCHANT     = process.env.MERCHANT ?? '';
const CLIENTS_DIR  = process.env.CLIENTS_DIR ?? './Documentos Clientes Tarjetas';
const BUCKET='kyc-documents';
const CARDS_PRODUCT_ID='0335e6a0-f4bc-4243-8b5e-f1dce581e5ee';
const CREATED_BY='fafed1ee-8517-4309-bca2-c4aaa9beb152';
const COMPANY_STATUS='active', APP_STATUS='activated', DOC_STATUS_FILLED='approved';
const MIME: Record<string,string> = { '.pdf':'application/pdf','.jpeg':'image/jpeg','.jpg':'image/jpeg','.png':'image/png','.xlsx':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','.docx':'application/vnd.openxmlformats-officedocument.wordprocessingml.document','.txt':'text/plain' };

type Dest = { code: string } | { skip: string };
interface MerchantConfig { dir: string; company: { legal_name:string; tax_id:string; person_type:'persona_moral'; terminal_type:'card_present'|'ecommerce'|'both'; }; files: Record<string,Dest>; }
interface Manifest { version:string; scan_dirs:string[]; merchants: Record<string,MerchantConfig>; }
const MANIFEST: Manifest = {
  "version": "coa-ladri-2026-06-28-v1",
  "scan_dirs": [
    "COATLICUE",
    "LADRIFICATE"
  ],
  "merchants": {
    "coatlicue": {
      "dir": "",
      "company": {
        "legal_name": "COATLICUE COMERCIO DE JALISCO, S.A. DE C.V.",
        "tax_id": "IAA170522D32",
        "person_type": "persona_moral",
        "terminal_type": "card_present"
      },
      "files": {
        "COATLICUE/2 - 3.- ACTA CONSTITUTIVA COATLICUE (ANTES INHOUSE)_compressed.pdf": {
          "code": "incorporation_act"
        },
        "COATLICUE/1.- ACTA CAMBIO DENOMINACION Y SOCIOS COATLICUE_compressed.pdf": {
          "code": "incorporation_act_update"
        },
        "COATLICUE/5.- Csf_COATLICUE.pdf": {
          "code": "cif"
        },
        "COATLICUE/4.- ACUSE FIEL COATLICUE.jpeg": {
          "code": "efirma"
        },
        "COATLICUE/11.- 32D_COATLICUE.pdf": {
          "code": "sat_compliance"
        },
        "COATLICUE/6.- COATLICUE IZZI MAYO.pdf": {
          "code": "company_address_proof"
        },
        "COATLICUE/8.- INE REPRESENTANTE LEGAL/INE DAVNADI ANVERSO.jpeg": {
          "code": "legal_rep_id"
        },
        "COATLICUE/8.- INE REPRESENTANTE LEGAL/INE DAVNADI REVERSO.jpeg": {
          "code": "legal_rep_id"
        },
        "COATLICUE/12.- INE ADMINISTRADORA/INE DAVNADI ANVERSO.jpeg": {
          "code": "administrator_id"
        },
        "COATLICUE/12.- INE ADMINISTRADORA/INE DAVNADI REVERSO.jpeg": {
          "code": "administrator_id"
        },
        "COATLICUE/7.- INE ACCIONISTAS/INE DAVNADI ANVERSO.jpeg": {
          "code": "shareholder_id"
        },
        "COATLICUE/7.- INE ACCIONISTAS/INE DAVNADI REVERSO.jpeg": {
          "code": "shareholder_id"
        },
        "COATLICUE/7.- INE ACCIONISTAS/INE NADIA ANVERSO.jpeg": {
          "code": "shareholder_id"
        },
        "COATLICUE/7.- INE ACCIONISTAS/INE NADIA REVERSO.jpeg": {
          "code": "shareholder_id"
        },
        "COATLICUE/9 .- PRUEBA DE VIDA REPRESENTANTE LEGAL.jpeg": {
          "code": "legal_rep_selfie"
        },
        "COATLICUE/10.- ANUAL COATLICUE 2025/COATLICUE-PAGO SAT ANUAL $25,205.pdf": {
          "code": "annex"
        },
        "COATLICUE/10.- ANUAL COATLICUE 2025/Dec Anual ISR 2025 Coatlicue.pdf": {
          "code": "annex"
        },
        "COATLICUE/13.- DATOS ACCIONISTAS Y REPRESENTANTES LEGALES COA..txt": {
          "skip": "nota"
        },
        "LADRIFICATE/DECLARACION BENEFICIARIO CONTROLADOR - COATLICUE.pdf": {
          "code": "beneficial_owner"
        },
        "LADRIFICATE/Información complementaria - COATLICUE.xlsx": {
          "code": "complementary_info"
        },
        "LADRIFICATE/TERMINOS Y CONDICIONES DE CLIENTES DE INTEGRADORES - COATLICUE.pdf": {
          "code": "terms_and_conditions"
        },
        "LADRIFICATE/10.- ANUAL LADRIFICATE 2025/IAA170522D32.36.2025.pdf": {
          "code": "tax_declaration"
        },
        "LADRIFICATE/10.- ANUAL LADRIFICATE 2025/IAA170522D32.36.2025.xlsx": {
          "code": "annex"
        }
      }
    },
    "ladrificate": {
      "dir": "",
      "company": {
        "legal_name": "LADRIFICATE MATERIALES DE CONSTRUCCION, S.A. DE C.V.",
        "tax_id": "ISA230623EG8",
        "person_type": "persona_moral",
        "terminal_type": "card_present"
      },
      "files": {
        "LADRIFICATE/1.- ACTA CONSTITUTIVA STARE (LADRIFICATE).pdf": {
          "code": "incorporation_act"
        },
        "LADRIFICATE/2- 3 .- ACTA LADRIFICATE MATERIALES PARA LA CONSTRUCCION CAMBIO DENOMINACIÓN .pdf": {
          "code": "incorporation_act_update"
        },
        "LADRIFICATE/5.- Csf_LADRIFICATE.pdf": {
          "code": "cif"
        },
        "LADRIFICATE/4.- ACUSE FIEL LADRIFICATE.jpeg": {
          "code": "efirma"
        },
        "LADRIFICATE/11.- 32D_LADRIFICATE.pdf": {
          "code": "sat_compliance"
        },
        "LADRIFICATE/6.- LADRIFICATE TOTALPLAY JUNIO.pdf": {
          "code": "company_address_proof"
        },
        "LADRIFICATE/8.- INE REPRESENTANTE LEGAL/INE GLORIA ANVERSO.jpeg": {
          "code": "legal_rep_id"
        },
        "LADRIFICATE/8.- INE REPRESENTANTE LEGAL/INE GLORIA REVERSO.jpeg": {
          "code": "legal_rep_id"
        },
        "LADRIFICATE/12.- INE ADMINISTRADORA/INE GLORIA ANVERSO.jpeg": {
          "code": "administrator_id"
        },
        "LADRIFICATE/12.- INE ADMINISTRADORA/INE GLORIA REVERSO.jpeg": {
          "code": "administrator_id"
        },
        "LADRIFICATE/7.- INE ACCIONISTAS/INE GLORIA ANVERSO.jpeg": {
          "code": "shareholder_id"
        },
        "LADRIFICATE/7.- INE ACCIONISTAS/INE GLORIA REVERSO.jpeg": {
          "code": "shareholder_id"
        },
        "LADRIFICATE/7.- INE ACCIONISTAS/INE MAGDALENA ANVERSO.jpeg": {
          "code": "shareholder_id"
        },
        "LADRIFICATE/7.- INE ACCIONISTAS/INE MAGDALENA REVERSO.jpeg": {
          "code": "shareholder_id"
        },
        "LADRIFICATE/9.- PRUEBA DE VIDA REPRESENTANTE LEGAL LADRIFICATE.jpeg": {
          "code": "legal_rep_selfie"
        },
        "LADRIFICATE/DECLARACION BENEFICIARIO CONTROLADOR - LADRIFICATE.pdf": {
          "code": "beneficial_owner"
        },
        "LADRIFICATE/Información complementaria - LADRIFICATE.xlsx": {
          "code": "complementary_info"
        },
        "LADRIFICATE/TERMINOS Y CONDICIONES - LADRIFICATE.pdf": {
          "code": "terms_and_conditions"
        },
        "LADRIFICATE/10.- ANUAL LADRIFICATE 2025/Dec Anual ISR 2025 Ladrificate.pdf": {
          "code": "annex"
        },
        "LADRIFICATE/10.- ANUAL LADRIFICATE 2025/LADRIFICATE-PAGO SAT 26,174.pdf": {
          "code": "annex"
        },
        "LADRIFICATE/13.- DATOS DE LOS ACCIONISTAS.txt": {
          "skip": "nota"
        },
        "COATLICUE/10.- ANUAL COATLICUE 2025/ISA230623EG8.36.2025.pdf": {
          "code": "tax_declaration"
        },
        "COATLICUE/10.- ANUAL COATLICUE 2025/ISA230623EG8.36.2025.xlsx": {
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
const SKIP_DIRS = new Set(['__MACOSX']);
// índice de las carpetas scan_dirs; claves relativas al padre (CLIENTS_DIR)
function diskIndex(baseDir:string, scanDirs:string[]):Map<string,string>{
  const out=new Map<string,string>();
  const walk=(dir:string)=>{ for(const name of readdirSync(dir)){
    if (SKIP_DIRS.has(name)||name==='.DS_Store'||name==='desktop.ini'||name.startsWith('._')) continue;
    const full=join(dir,name); const st=statSync(full);
    if (st.isDirectory()) walk(full);
    else if (st.size>0 && !name.toLowerCase().endsWith('.zip')) out.set(norm(relative(baseDir,full)), relative(baseDir,full));
  }};
  for (const sd of scanDirs){ const p=join(baseDir,sd); if (existsSync(p)) walk(p); else console.warn(`  ⚠️ scan_dir no existe: ${sd}`); }
  return out;
}

async function main(){
  console.log(`\n=== import-coatlicue-ladrificate · CONFIG_VERSION=${CONFIG_VERSION} ===`);
  if (!SUPABASE_URL||!SERVICE_KEY) throw new Error('Faltan envs de Supabase.');
  assertServiceRole(SERVICE_KEY);
  const cfg=MANIFEST.merchants[MERCHANT];
  if (!cfg) throw new Error(`MERCHANT="${MERCHANT}" inválido. Opciones: ${Object.keys(MANIFEST.merchants).join(', ')}`);
  const baseDir=CLIENTS_DIR;
  if (!existsSync(baseDir)) throw new Error(`No existe CLIENTS_DIR: ${baseDir}`);
  console.log(`Comercio: ${MERCHANT} ${DRY_RUN?'(DRY RUN)':'(REAL)'}\nPadre: ${baseDir}`);
  const idx=diskIndex(baseDir, MANIFEST.scan_dirs);
  // SIN MATCH contra la UNIÓN de ambos comercios (cada archivo pertenece a uno)
  const union=new Set<string>();
  for (const mc of Object.values(MANIFEST.merchants)) for (const rel of Object.keys(mc.files)) union.add(norm(rel));
  for (const [k,real] of idx) if (!union.has(k)) console.warn(`  ⚠️ SIN MATCH (ningún comercio): ${real}`);
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
