// scripts/fix-yerlaw.ts — mueve las 2 fotos del INE de legal_rep_selfie -> annex (solo metadata)
import { createClient } from '@supabase/supabase-js';

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

const APP   = '910b8aa3-1166-47bb-a0bf-e1096e0eddcb';
const CARDS = '0335e6a0-f4bc-4243-8b5e-f1dce581e5ee';
const INE = [
  'WhatsApp Image 2026-05-11 at 11.17.59 (2).jpeg',
  'WhatsApp Image 2026-05-11 at 11.17.59 (3).jpeg',
];
const SELFIE = 'WhatsApp Image 2026-05-11 at 11.49.27.jpeg';

async function main() {
  const { data: annex, error: te } = await db.from('document_templates')
    .select('id').eq('product_id', CARDS).eq('code', 'annex').single();
  if (te) throw te;

  // 1) mover las 2 fotos del INE a annex
  const { data: moved, error: e1 } = await db.from('documents')
    .update({ template_id: annex!.id, version: 1 })
    .eq('application_id', APP).in('file_name', INE).select('file_name');
  if (e1) throw e1;

  // 2) dejar el selfie real como v1
  const { error: e2 } = await db.from('documents')
    .update({ version: 1 })
    .eq('application_id', APP).eq('file_name', SELFIE);
  if (e2) throw e2;

  console.log('Movidas a annex:', moved?.map(m => m.file_name));

  // 3) verificacion
  const { data: check } = await db.from('documents')
    .select('file_name, version, template:document_templates(code)')
    .eq('application_id', APP);
  const rows = (check ?? [])
    .map((d: any) => ({ code: d.template?.code, file: d.file_name, v: d.version }))
    .filter((r: any) => r.code === 'legal_rep_selfie' || r.code === 'annex')
    .sort((a: any, b: any) => a.code.localeCompare(b.code));
  console.table(rows);
}
main().catch(e => { console.error('ERROR:', e.message ?? e); process.exit(1); });
