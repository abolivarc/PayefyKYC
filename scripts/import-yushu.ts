/**
 * import-yushu.ts — Importador PILOTO de Yushu Group al expediente de Tarjetas.
 *
 * Qué hace (todo additive; no borra nada):
 *   1. Crea la empresa YUSHU GROUP S.A. de C.V. (status active).
 *   2. Crea su application (status activated -> comercio ya activo).
 *   3. Crea los 18 slots del checklist de Tarjetas (pending_upload).
 *   4. Sube los 27 archivos a kyc-documents y llena slots / anexos / contratos.
 *
 * NO sube binarios desde el chat: esto corre EN TU MÁQUINA con el service role.
 *
 * Requisitos:
 *   - npm i @supabase/supabase-js
 *   - Correr antes la migración 20260622000000_add_cards_annex_templates.sql
 *     (añade plantillas bank_statement + annex y permite .docx en el bucket).
 *   - .env con NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.
 *
 * Uso:
 *   DRY_RUN=1  npx tsx scripts/import-yushu.ts   # simula, no escribe nada
 *   npx tsx scripts/import-yushu.ts              # ejecuta de verdad
 *
 * Rollback (si algo sale mal): borra por company_id (lo imprime al final):
 *   delete from documents where application_id in (select id from applications where company_id='<ID>');
 *   delete from application_contracts where application_id in (select id from applications where company_id='<ID>');
 *   delete from applications where company_id='<ID>';
 *   delete from companies where id='<ID>';
 *   -- y los objetos del storage bajo el prefijo <ID>/
 */

import { createClient } from '@supabase/supabase-js';
import { readdirSync, readFileSync } from 'node:fs';
import { join, extname } from 'node:path';

// ─────────────────────────────── CONFIG (ajústalo) ───────────────────────────
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const DRY_RUN      = process.env.DRY_RUN === '1';

// Carpeta local de Yushu (la del ZIP que subiste). Cámbiala a tu ruta real:
const YUSHU_DIR = process.env.YUSHU_DIR
  ?? './Documentos Clientes Tarjetas/Yushu Group S.A. de C.V. ';

const BUCKET     = 'kyc-documents';
const CARDS_PRODUCT_ID = '0335e6a0-f4bc-4243-8b5e-f1dce581e5ee';
const CREATED_BY = 'fafed1ee-8517-4309-bca2-c4aaa9beb152'; // a.santibanez (super_admin)

// Estados (Yushu YA está activo). Overridea si prefieres re-revisar todo.
const COMPANY_STATUS   = 'active';
const APP_STATUS       = 'activated';
const DOC_STATUS_FILLED= 'approved';   // ya pasó compliance+proveedor en la realidad
const SET_IS_CHECKED   = false;        // false => tu check personal queda pendiente

// Datos fiscales reales (extraídos de CSFYUSHUABR26.pdf):
const COMPANY = {
  legal_name : 'YUSHU GROUP S.A. DE C.V.',
  tax_id     : 'YGR250813SL8',
  tax_regime : 'Régimen General de Ley Personas Morales',
  person_type: 'persona_moral',
  tax_address: {
    calle: 'CALLE', numero_interior: '801', colonia: 'ANZURES',
    cp: '11590', municipio: 'MIGUEL HIDALGO', entidad: 'CIUDAD DE MEXICO',
  },
  operator_email: 'group.yushu@gmail.com',
  operator_name : 'Juan Carlos Lorenzo Relloso', // contacto/accionista (RL: Félix Bautista Ramos)
  terminal_type : 'card_present',
};

// ─────────────────── MAPEO archivo -> destino (orden importa) ─────────────────
type Dest =
  | { kind: 'slot';     code: string }
  | { kind: 'annex' }
  | { kind: 'bank' }
  | { kind: 'contract'; contract: string };

const RULES: { re: RegExp; dest: Dest }[] = [
  { re: /caratula_credito/i,                         dest: { kind: 'contract', contract: 'transfer_increase_letter' } },
  { re: /contrato.*revolvente/i,                     dest: { kind: 'contract', contract: 'transfer_contract' } },
  { re: /contrato de arrendamiento/i,                dest: { kind: 'slot', code: 'company_address_proof' } },
  { re: /acta constitutiva/i,                        dest: { kind: 'slot', code: 'incorporation_act' } },
  { re: /^rppc|^rppyc|rpp ?y ?c|registro publico/i,  dest: { kind: 'slot', code: 'inscription_rpc' } },
  { re: /vigencia firma|fiel /i,                     dest: { kind: 'slot', code: 'efirma' } },
  { re: /csfyushu|csf yushu/i,                        dest: { kind: 'slot', code: 'cif' } },
  { re: /ine felix/i,                                dest: { kind: 'slot', code: 'legal_rep_id' } },
  { re: /ine .*relloso|copia de ine/i,               dest: { kind: 'slot', code: 'shareholder_id' } },
  { re: /21\.01\.17 \(1\)/i,                          dest: { kind: 'slot', code: 'legal_rep_selfie' } },
  { re: /21\.01\.17\.jpeg/i,                          dest: { kind: 'annex' } }, // 2ª prueba de vida (accionista)
  { re: /\.36\.2025/i,                               dest: { kind: 'slot', code: 'tax_declaration' } },
  { re: /opinionyushu|opinion .*cumplimiento/i,      dest: { kind: 'slot', code: 'sat_compliance' } },
  { re: /beneficiario.controlador|constancia_benef/i,dest: { kind: 'slot', code: 'beneficial_owner' } },
  { re: /info.?complementaria/i,                     dest: { kind: 'slot', code: 'complementary_info' } },
  { re: /estadodecuenta|estado de cuenta/i,          dest: { kind: 'bank' } },
  { re: /subcuenta_?albo/i,                          dest: { kind: 'annex' } },
  { re: /anexo 3|kyg/i,                              dest: { kind: 'annex' } },
  { re: /csf felix/i,                                dest: { kind: 'annex' } },
  { re: /constancia relloso/i,                       dest: { kind: 'annex' } },
  { re: /membretada/i,                               dest: { kind: 'annex' } }, // carta de aumento de límite
];

const MIME: Record<string, string> = {
  '.pdf': 'application/pdf', '.jpeg': 'image/jpeg', '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

// ─────────────────────────────────── helpers ─────────────────────────────────
function assertServiceRole(key: string) {
  if (key.startsWith('sb_secret_')) return; // new non-JWT format
  const parts = key.split('.');
  if (parts.length !== 3) throw new Error('Key no reconocida. ¿Pegaste el anon key?');
  const role = JSON.parse(Buffer.from(parts[1], 'base64').toString()).role;
  if (role !== 'service_role')
    throw new Error(`La key tiene role="${role}", se esperaba service_role. ¿Pegaste el anon key?`);
}
const sanitize = (n: string) => n.normalize('NFC').replace(/[^\w.\-() ]/g, '_');

async function main() {
  if (!SUPABASE_URL || !SERVICE_KEY) throw new Error('Faltan envs de Supabase.');
  assertServiceRole(SERVICE_KEY);
  const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

  console.log(`\n=== Import Yushu ${DRY_RUN ? '(DRY RUN)' : '(REAL)'} ===`);

  // 0) Idempotencia: abortar si ya existe esa empresa
  const { data: existing } = await db.from('companies').select('id').eq('tax_id', COMPANY.tax_id);
  if (existing?.length) throw new Error(`Ya existe una empresa con RFC ${COMPANY.tax_id} (${existing[0].id}). Aborto para no duplicar.`);

  // 1) Cargar plantillas de Tarjetas (incluye bank_statement + annex de la migración)
  const { data: tpls, error: te } = await db.from('document_templates')
    .select('id, code').eq('product_id', CARDS_PRODUCT_ID);
  if (te) throw te;
  const tpl = new Map(tpls!.map(t => [t.code, t.id]));
  for (const code of ['bank_statement', 'annex'])
    if (!tpl.has(code)) throw new Error(`Falta plantilla "${code}". Corre primero la migración.`);

  // Listar archivos reales
  const files = readdirSync(YUSHU_DIR).filter(f => !f.startsWith('.') && extname(f));
  console.log(`Archivos a procesar: ${files.length}`);

  if (DRY_RUN) {
    // Solo mostrar el ruteo y detectar archivos sin match
    for (const f of files) {
      const r = RULES.find(r => r.re.test(f));
      console.log(`  ${r ? JSON.stringify(r.dest) : '❌ SIN MATCH'}  <-  ${f}`);
    }
    console.log('\nDRY RUN: no se escribió nada.');
    return;
  }

  // 2) Empresa + application
  const { data: company, error: ce } = await db.from('companies')
    .insert({ ...COMPANY, status: COMPANY_STATUS, created_by: CREATED_BY }).select('id').single();
  if (ce) throw ce;
  const companyId = company!.id;

  const { data: app, error: ae } = await db.from('applications')
    .insert({ company_id: companyId, product_id: CARDS_PRODUCT_ID,
              status: APP_STATUS, activated_at: new Date().toISOString() }).select('id').single();
  if (ae) throw ae;
  const appId = app!.id;
  console.log(`Empresa ${companyId} · expediente ${appId}`);

  // 3) Crear los 18 slots (pending_upload) y quedarnos el doc_id por code
  const slotId = new Map<string, string>();
  for (const [code, id] of tpl) {
    if (code === 'annex') continue; // annex no necesita slot vacío
    const { data: d, error } = await db.from('documents')
      .insert({ application_id: appId, template_id: id, status: 'pending_upload' })
      .select('id').single();
    if (error) throw error;
    slotId.set(code, d!.id);
  }

  // helper de subida + escritura de fila documents
  const usedSlot = new Set<string>();
  async function place(file: string, dest: Dest) {
    const ext = extname(file).toLowerCase();
    const buf = readFileSync(join(YUSHU_DIR, file));
    const contentType = MIME[ext] ?? 'application/octet-stream';

    if (dest.kind === 'contract') {
      const docId = crypto.randomUUID();
      const path = `${companyId}/${appId}/contracts/${docId}/${sanitize(file)}`;
      const up = await db.storage.from(BUCKET).upload(path, buf, { contentType, upsert: false });
      if (up.error) throw up.error;
      const { error } = await db.from('application_contracts').insert({
        application_id: appId, kind: dest.contract, status: 'signed',
        sign_method: 'docusign', signed_doc_path: path,           // <-- revisa sign_method/fecha
        note: 'Importado de expediente histórico (Yushu, comercio activo).',
      });
      if (error) throw error;
      console.log(`  📄 contrato ${dest.contract}  <-  ${file}`);
      return;
    }

    // slot / annex / bank -> fila en documents
    const code = dest.kind === 'slot' ? dest.code : dest.kind === 'bank' ? 'bank_statement' : 'annex';
    const templateId = tpl.get(code)!;
    let docId: string, version = 1;

    if (dest.kind === 'slot' && !usedSlot.has(code)) {
      docId = slotId.get(code)!; usedSlot.add(code);            // primer archivo: llena el slot existente
    } else {
      docId = crypto.randomUUID();                              // extra (v2) o annex/bank: fila nueva
      if (dest.kind === 'slot') version = 2;
    }

    const path = `${companyId}/${appId}/${docId}/${sanitize(file)}`;
    const up = await db.storage.from(BUCKET).upload(path, buf, { contentType, upsert: false });
    if (up.error) throw up.error;

    const row = {
      file_name: file, storage_path: path, mime_type: contentType, file_size: buf.length,
      status: DOC_STATUS_FILLED, is_checked: SET_IS_CHECKED, version, uploaded_by: CREATED_BY,
      uploaded_at: new Date().toISOString(),
    };
    const isExistingSlot = dest.kind === 'slot' && version === 1;
    const { error } = isExistingSlot
      ? await db.from('documents').update(row).eq('id', docId)
      : await db.from('documents').insert({ ...row, id: docId, application_id: appId, template_id: templateId });
    if (error) throw error;
    console.log(`  ✓ ${code}${version > 1 ? ' (v2)' : ''}  <-  ${file}`);
  }

  // 4) Procesar todos los archivos
  const unmatched: string[] = [];
  for (const f of files) {
    const r = RULES.find(r => r.re.test(f));
    if (!r) { unmatched.push(f); continue; }
    await place(f, r.dest);
  }
  if (unmatched.length) console.warn('\n⚠️ Sin match (revisar):', unmatched);

  console.log(`\n✅ Listo. company_id=${companyId}  application_id=${appId}`);
  console.log('   (Guarda el company_id por si necesitas rollback.)');
}

main().catch(e => { console.error('\n❌ ERROR:', e.message ?? e); process.exit(1); });
