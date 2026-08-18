import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const a = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const BASE = '/private/tmp/claude-501/-Users-alejandrosantibanez8-projects-PayefyKYC/c9ba033d-abc7-48e2-bdb8-d8c6e02bbd89/scratchpad/q5'
const DL = '/Users/alejandrosantibanez8/Downloads'

const MIME = { pdf: 'application/pdf', jpeg: 'image/jpeg', jpg: 'image/jpeg', png: 'image/png', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
const mime = (f) => MIME[f.split('.').pop().toLowerCase()] ?? 'application/octet-stream'
const clean = (s) => s.replace(/[^a-zA-Z0-9._-]+/g, '-').slice(-80)

// código de plantilla → archivo del expediente
const ARCHIVOS = {
  incorporation_act:        `${BASE}/1. Documentos constitutivos y legales/1. Acta Constitutiva _  43,993_RPPC.pdf_1.pdf`,
  incorporation_act_update: `${BASE}/1. Documentos constitutivos y legales/2. Acta de Asambrea_ 46,999_RPPC.pdf`,
  legal_rep_id:             `${BASE}/2. Identificación y representación/2.1JSVC-INE_RL.pdf`,
  legal_rep_selfie:         `${BASE}/2. Identificación y representación/2.6 PRUEBA DE VIDA RL.jpeg`,
  shareholder_id:           `${BASE}/2. Identificación y representación/2.2LRG-INE.pdf`,
  administrator_id:         `${DL}/INE Luis Alberto.pdf`,
  cif:                      `${BASE}/3. Documentos fiscales y financieros/3.1 Csf_QCR240221V16.pdf`,
  efirma:                   `${BASE}/3. Documentos fiscales y financieros/3. CONSTANCIA DE FIEL - JUL 26.pdf`,
  sat_compliance:           `${BASE}/3. Documentos fiscales y financieros/3.5Q5R-13JUL26-OC.pdf`,
  tax_declaration:          `${BASE}/5. Documentos adicionales/Declaracion Anual Q5R-2025-.pdf`,
  company_address_proof:    `${BASE}/4. Datos de domicilio y contacto/4.1 Comprobante de Domicilio.pdf`,
  beneficial_owner:         `${BASE}/5. Documentos adicionales/5.1 Constancia_Beneficiario_Controlador.pdf`,
  terms_opm:                `${BASE}/5. Documentos adicionales/5.2 Terminos y condiciones clientes de integradores.pdf`,
  organigrama:              `${BASE}/5. Documentos adicionales/Organigrama Empresarial.pdf`,
  complementary_info:       `${BASE}/5. Documentos adicionales/5.3 Información complementaria.xlsx`,
}
// data_check: valor extraído de los propios documentos
const DATOS = {
  contact_email:    'admin@quiero5.com',
  contact_phone:    '55 5181 2037',
  legal_reps_rfc:   'VECJ971015PD9',
  legal_reps_curp:  'VECJ971015HQRRRN19',
  shareholders_rfc: 'RAGL810723S93',
  shareholders_curp:'RAGL810723HPLMNS03',
}
// documentos adicionales (sin plantilla)
const EXTRAS = [
  ['Carta de aumentos',                    `${DL}/Q5_CARTA DE AUMENTOS1.pdf`],
  ['Estado de cuenta bancario JUN-2026',   `${BASE}/3. Documentos fiscales y financieros/3.6 ESTADO DE CUENTA JUNIO26.pdf`],
  ['Opinión complementaria 05-MAY-26',     `${BASE}/3. Documentos fiscales y financieros/3.4Q5R-05MAY26-COMPLEMENTARIA.pdf`],
  ['Declaración 05-MAY-26',                `${BASE}/3. Documentos fiscales y financieros/3.4Q5R-05MAY26-DECLARACION.pdf`],
  ['CIF (cédula corta)',                   `${BASE}/3. Documentos fiscales y financieros/3.3Q5R-CIF.pdf`],
  ['CSF del representante legal',          `${BASE}/2. Identificación y representación/2.4Csf_VECJ971015PD9_RL.pdf`],
  ['CSF del accionista (Luis Alberto)',    `${BASE}/2. Identificación y representación/2.4.1 LRG-14JUN26-CSF.pdf`],
  ['Constancia CURP — representante legal',`${BASE}/2. Identificación y representación/2.5JSVC-CURP.pdf`],
  ['Constancia CURP — accionista',         `${BASE}/2. Identificación y representación/2.5LRG-CURP.pdf`],
  ['Datos de contacto (documento)',        `${BASE}/4. Datos de domicilio y contacto/4.2 Número de telefono y correo.pdf`],
]

const run = async () => {
  // 1. empresa
  const { data: co, error: coErr } = await a.from('companies').insert({
    legal_name: 'QUIERO 5 EN RENTA',
    tax_id: 'QCR240221V16',
    person_type: 'persona_moral',
    contact_email: 'admin@quiero5.com',
  }).select('id').single()
  if (coErr) throw new Error('empresa: ' + coErr.message)

  // 2. solicitud de tarjetas
  const { data: prod } = await a.from('products').select('id').eq('code', 'cards').single()
  const { data: app, error: appErr } = await a.from('applications').insert({
    company_id: co.id, product_id: prod.id, status: 'documents_pending',
    submitted_at: new Date().toISOString(),
  }).select('id').single()
  if (appErr) throw new Error('solicitud: ' + appErr.message)

  // 3. una fila por plantilla
  const { data: tmpls } = await a.from('document_templates').select('id, code, field_type').eq('product_id', prod.id)
  const porCodigo = {}
  for (const t of tmpls) {
    const { data: doc, error } = await a.from('documents').insert({
      application_id: app.id, template_id: t.id,
      status: t.field_type === 'data_check' ? 'pending_review' : 'pending_upload',
    }).select('id').single()
    if (error) throw new Error(t.code + ': ' + error.message)
    porCodigo[t.code] = { id: doc.id, field_type: t.field_type }
  }

  // 4. subir archivos a sus casilleros
  let subidos = 0
  for (const [code, ruta] of Object.entries(ARCHIVOS)) {
    const doc = porCodigo[code]
    const buf = readFileSync(ruta)
    const nombre = ruta.split('/').pop()
    const path = `${co.id}/${app.id}/${doc.id}/${Date.now()}-${clean(nombre)}`
    const { error: upErr } = await a.storage.from('kyc-documents').upload(path, buf, { contentType: mime(nombre) })
    if (upErr) throw new Error('storage ' + code + ': ' + upErr.message)
    const { error: dbErr } = await a.from('documents').update({
      storage_path: path, file_name: nombre, file_size: buf.byteLength,
      mime_type: mime(nombre), status: 'pending_review',
      uploaded_at: new Date().toISOString(),
    }).eq('id', doc.id)
    if (dbErr) throw new Error('doc ' + code + ': ' + dbErr.message)
    subidos++
  }

  // 5. datos data_check
  for (const [code, valor] of Object.entries(DATOS)) {
    await a.from('documents').update({ file_name: valor, status: 'pending_review' }).eq('id', porCodigo[code].id)
  }

  // 6. inscripción RPC: viene dentro de las actas (los nombres traen folio RPPC)
  await a.from('documents').update({ is_checked: true, status: 'pending_review' }).eq('id', porCodigo['inscription_rpc'].id)

  // 7. extras
  let extras = 0
  for (const [titulo, ruta] of EXTRAS) {
    const buf = readFileSync(ruta)
    const nombre = ruta.split('/').pop()
    const { data: doc, error } = await a.from('documents').insert({
      application_id: app.id, template_id: null, title: titulo, status: 'pending_review',
    }).select('id').single()
    if (error) throw new Error('extra: ' + error.message)
    const path = `${co.id}/${app.id}/${doc.id}/${Date.now()}-${clean(nombre)}`
    const { error: upErr } = await a.storage.from('kyc-documents').upload(path, buf, { contentType: mime(nombre) })
    if (upErr) throw new Error('storage extra: ' + upErr.message)
    await a.from('documents').update({
      storage_path: path, file_name: nombre, file_size: buf.byteLength,
      mime_type: mime(nombre), uploaded_at: new Date().toISOString(),
    }).eq('id', doc.id)
    extras++
  }

  console.log(JSON.stringify({ empresa: co.id, solicitud: app.id, plantillas: tmpls.length, archivos: subidos, datos: Object.keys(DATOS).length, extras }))
}
run().catch((e) => { console.error('ERROR:', e.message); process.exit(1) })
