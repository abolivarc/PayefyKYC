// ── Shared header/footer helpers ───────────────────────
const G = "#004238" // verde principal Payefy
const A = "#AEFF99" // verde acento

function header(title?: string) {
  return `
  <div style="background:${G};padding:20px 24px;border-radius:8px 8px 0 0;display:flex;align-items:center;gap:12px;">
    <span style="font-weight:800;font-size:18px;color:${A};letter-spacing:-.5px;font-family:Georgia,serif;">payefy</span>
    ${title ? `<span style="color:rgba(255,255,255,.7);font-size:13px;margin-left:4px;">· ${title}</span>` : ""}
  </div>`
}
function footer(note?: string) {
  return `<p style="color:#9ca3af;font-size:11px;margin-bottom:0;">${note ?? "Payefy · Este correo es generado automáticamente."}</p>`
}
function btn(href: string, label: string) {
  return `<a href="${href}" style="background:${G};color:${A};padding:13px 26px;border-radius:6px;text-decoration:none;font-weight:700;font-size:14px;display:inline-block;">${label} &rarr;</a>`
}
function wrap(body: string) {
  return `<!DOCTYPE html><html lang="es"><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#111827;">${body}</body></html>`
}

export function emailCronReminder({
  companyName,
  clientName,
  productName,
  applicationUrl,
  daysSinceUpdate,
}: {
  companyName: string
  clientName: string
  productName: string
  applicationUrl: string
  daysSinceUpdate: number
}): string {
  return wrap(`
  ${header()}
  <div style="border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 8px 8px;">
    <h2 style="color:${G};margin-top:0;">Tu expediente KYC está esperándote</h2>
    <p>Hola <strong>${clientName}</strong>,</p>
    <p>Notamos que tu expediente de <strong>${companyName}</strong> para el producto <strong>${productName}</strong> lleva <strong>${daysSinceUpdate} días</strong> sin actividad.</p>
    <p>Para no perder tu lugar en el proceso, ingresa y completa o actualiza tu información:</p>
    <div style="margin:28px 0;">${btn(applicationUrl, "Continuar mi expediente")}</div>
    <p style="color:#6b7280;font-size:13px;">Si ya lo enviaste recientemente, ignora este mensaje. Si tienes dudas, responde este correo.</p>
    ${footer()}
  </div>`)
}

export function emailCronInternalAlert({
  companyName,
  productName,
  applicationStatus,
  applicationUrl,
  daysSinceUpdate,
}: {
  companyName: string
  productName: string
  applicationStatus: string
  applicationUrl: string
  daysSinceUpdate: number
}): string {
  return wrap(`
  ${header("Alerta interna")}
  <div style="border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 8px 8px;">
    <h2 style="color:#b45309;margin-top:0;">Solicitud sin avance — ${daysSinceUpdate} días</h2>
    <p>La siguiente solicitud lleva <strong>${daysSinceUpdate} días</strong> sin actualización:</p>
    <table style="border-collapse:collapse;width:100%;margin:16px 0;">
      <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:bold;background:#f9fafb;width:40%;">Empresa</td><td style="padding:8px;border:1px solid #e5e7eb;">${companyName}</td></tr>
      <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:bold;background:#f9fafb;">Producto</td><td style="padding:8px;border:1px solid #e5e7eb;">${productName}</td></tr>
      <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:bold;background:#f9fafb;">Estado actual</td><td style="padding:8px;border:1px solid #e5e7eb;">${applicationStatus}</td></tr>
    </table>
    <p>Si no se registra actividad en los próximos 16 días, la solicitud será archivada automáticamente.</p>
    <div style="margin:24px 0;">${btn(applicationUrl, "Revisar expediente")}</div>
    ${footer("PayefyKYC · Alerta automática del sistema de recordatorios.")}
  </div>`)
}

export function emailLeadInvite({
  companyName,
  agentName,
  productName,
  inviteUrl,
}: {
  companyName: string
  agentName: string
  productName: string
  inviteUrl: string
}): string {
  return wrap(`
  ${header()}
  <div style="border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 8px 8px;">
    <h2 style="color:${G};margin-top:0;">Tu proceso KYC con Payefy está listo</h2>
    <p>Hola,</p>
    <p>${agentName} de Payefy ha iniciado tu expediente para el producto <strong>${productName}</strong> a nombre de <strong>${companyName}</strong>.</p>
    <p>Para continuar, crea tu cuenta y completa tu información haciendo clic en el siguiente enlace:</p>
    <div style="margin:28px 0;">${btn(inviteUrl, "Completar mi registro")}</div>
    <p style="color:#6b7280;font-size:13px;">Este enlace es válido por 24 horas y es de uso único. Si no esperabas este correo, ignóralo.</p>
    ${footer("Payefy · onboarding@payefy.com.mx")}
  </div>`)
}

export function emailDocsSubmitted({
  companyName,
  productName,
  reviewerName,
  applicationUrl,
}: {
  companyName: string
  productName: string
  reviewerName: string
  applicationUrl: string
}): string {
  return wrap(`
  ${header("Revisión")}
  <div style="border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 8px 8px;">
    <h2 style="color:${G};">Nueva solicitud lista para revisión</h2>
    <p>Hola ${reviewerName},</p>
    <p>La empresa <strong>${companyName}</strong> ha enviado su expediente completo para el producto <strong>${productName}</strong> y está lista para revisión.</p>
    <div style="margin:24px 0;">${btn(applicationUrl, "Revisar expediente")}</div>
    ${footer()}
  </div>`)
}

// Correo único para el reviewer de Tarjetas: aviso + botón a la plataforma
// + expediente ZIP adjunto (sustituye a los dos correos separados).
export function emailExpedienteCompleto({
  companyName,
  productName,
  reviewerName,
  applicationUrl,
  zipAttached,
}: {
  companyName: string
  productName: string
  reviewerName: string
  applicationUrl: string
  zipAttached: boolean
}): string {
  return wrap(`
  ${header("Revisión")}
  <div style="border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 8px 8px;">
    <h2 style="color:${G};margin-top:0;">Nueva solicitud lista para revisión</h2>
    <p>Hola ${reviewerName},</p>
    <p>La empresa <strong>${companyName}</strong> ha enviado su expediente completo para el producto <strong>${productName}</strong> y está lista para revisión.</p>
    <div style="margin:24px 0;">${btn(applicationUrl, "Revisar en la plataforma")}</div>
    ${zipAttached
      ? `<p style="color:#6b7280;font-size:13px;">O si lo prefieres, el expediente completo viene adjunto a este correo como archivo ZIP.</p>`
      : `<p style="color:#6b7280;font-size:13px;">No fue posible adjuntar el ZIP del expediente; los documentos están disponibles en la plataforma.</p>`}
    ${footer()}
  </div>`)
}

export function emailChangesRequested({
  companyName,
  clientName,
  notes,
  applicationUrl,
  imagesHtml,
}: {
  companyName: string
  clientName: string
  notes: string
  applicationUrl: string
  /** Bloque <img> con las capturas adjuntas (imagesEmailBlock) */
  imagesHtml?: string
}): string {
  return wrap(`
  ${header()}
  <div style="border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 8px 8px;">
    <h2 style="color:#b45309;">Tu expediente requiere cambios</h2>
    <p>Hola ${clientName},</p>
    <p>Revisamos el expediente de <strong>${companyName}</strong> y necesitamos que corrijas o complementes algunos documentos:</p>
    <div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:12px 16px;margin:16px 0;border-radius:0 6px 6px 0;">
      <p style="margin:0;white-space:pre-wrap;">${notes}</p>
    </div>
    ${imagesHtml ?? ""}
    <div style="margin:24px 0;">${btn(applicationUrl, "Ver mi expediente")}</div>
    ${footer()}
  </div>`)
}

export function emailApproved({
  companyName,
  clientName,
  productName,
  manualUrl,
  videoUrl,
}: {
  companyName: string
  clientName: string
  productName: string
  manualUrl?: string
  videoUrl?: string
}): string {
  const hasResources = manualUrl || videoUrl

  return wrap(`
  ${header()}
  <div style="border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 8px 8px;">
    <h2 style="color:${G};margin-top:0;">¡Tu solicitud ha sido activada!</h2>
    <p>Hola <strong>${clientName}</strong>,</p>
    <p>Nos complace informarte que el proceso KYC de <strong>${companyName}</strong> para el producto <strong>${productName}</strong> ha sido completado exitosamente.</p>
    <p>Ya puedes comenzar a operar. A continuación encontrarás los recursos que necesitas para tu onboarding:</p>

    ${hasResources ? `
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:20px;margin:24px 0;">
      <p style="margin:0 0 16px 0;font-weight:bold;color:${G};font-size:15px;">Recursos de onboarding</p>
      <div style="display:flex;flex-direction:column;gap:12px;">
        ${manualUrl ? btn(manualUrl, "Manual de onboarding") : ""}
        ${videoUrl ? `<a href="${videoUrl}" target="_blank" style="background:#0f766e;color:white;padding:13px 26px;border-radius:6px;text-decoration:none;font-weight:700;font-size:14px;display:inline-block;">Video tutorial &rarr;</a>` : ""}
      </div>
    </div>` : ""}

    <p>Si tienes alguna duda, responde este correo o contacta a tu ejecutivo Payefy.</p>
    ${footer()}
  </div>`)
}

export function emailDocumentApproved({
  companyName,
  clientName,
  documentName,
  applicationUrl,
}: {
  companyName: string
  clientName: string
  documentName: string
  applicationUrl: string
}): string {
  return wrap(`
  ${header()}
  <div style="border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 8px 8px;">
    <h2 style="color:${G};margin-top:0;">Documento aprobado ✓</h2>
    <p>Hola <strong>${clientName}</strong>,</p>
    <p>Tu documento <strong>${documentName}</strong> del expediente de <strong>${companyName}</strong> ha sido revisado y aprobado.</p>
    <p>Sigue subiendo los documentos restantes para completar tu proceso.</p>
    <div style="margin:24px 0;">${btn(applicationUrl, "Ver mi expediente")}</div>
    ${footer()}
  </div>`)
}

// ── Nuevas plantillas P3 ────────────────────────────────

export function emailExpedienteToTransfer({
  companyName,
  productName,
  transferRecipientName,
  customMessage,
}: {
  companyName: string
  productName: string
  transferRecipientName?: string
  customMessage?: string
}): string {
  // Sin nombre del destinatario se abre con "Buen día" — antes salía
  // "Estimado," con la coma colgando.
  const saludo = transferRecipientName
    ? `Estimado ${transferRecipientName},`
    : "Buen día,"

  return wrap(`
  ${header("Apertura de centro de costos")}
  <div style="border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 8px 8px;">
    <h2 style="color:${G};margin-top:0;">Apertura de centro de costos</h2>
    <p>${saludo}</p>
    <p>Solicito la apertura de un centro de costos para <strong>${companyName}</strong>, cliente de Payefy.</p>
    <p>Adjunto la documentación de la empresa para el proceso de conocimiento del cliente.</p>
    ${customMessage ? `
    <div style="background:#f8faf9;border-left:4px solid ${G};padding:12px 16px;margin:16px 0;border-radius:0 6px 6px 0;">
      <p style="margin:0;white-space:pre-wrap;font-size:13px;color:#374151;">${customMessage}</p>
    </div>` : ""}
    <p style="color:#6b7280;font-size:13px;">La documentación se incluye como archivo ZIP adjunto a este correo.</p>
    ${footer("Payefy · a.santibanez@payefy.me")}
  </div>`)
}

export function emailRequestDocsToClient({
  companyName,
  clientName,
  notes,
  applicationUrl,
}: {
  companyName: string
  clientName: string
  notes: string
  applicationUrl: string
}): string {
  return wrap(`
  ${header()}
  <div style="border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 8px 8px;">
    <h2 style="color:${G};margin-top:0;">Acción requerida en tu expediente</h2>
    <p>Hola <strong>${clientName}</strong>,</p>
    <p>Necesitamos que completes o actualices información en el expediente de <strong>${companyName}</strong>:</p>
    <div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:12px 16px;margin:16px 0;border-radius:0 6px 6px 0;">
      <p style="margin:0;white-space:pre-wrap;font-size:13px;">${notes}</p>
    </div>
    <div style="margin:28px 0;">${btn(applicationUrl, "Actualizar mi expediente")}</div>
    <p style="color:#6b7280;font-size:13px;">Si tienes dudas sobre lo solicitado, responde este correo y con gusto te orientamos.</p>
    ${footer()}
  </div>`)
}

export function emailDocumentUploaded({
  companyName,
  documentName,
  applicationUrl,
}: {
  companyName: string
  documentName: string
  applicationUrl: string
}): string {
  return wrap(`
  ${header("Actividad")}
  <div style="border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 8px 8px;">
    <h2 style="color:${G};margin-top:0;">Nueva actividad de cliente</h2>
    <p><strong>${companyName}</strong> acaba de subir un documento a su expediente.</p>
    <table style="border-collapse:collapse;width:100%;margin:16px 0;">
      <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:bold;background:#f9fafb;width:40%;">Empresa</td><td style="padding:8px;border:1px solid #e5e7eb;">${companyName}</td></tr>
      <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:bold;background:#f9fafb;">Documento</td><td style="padding:8px;border:1px solid #e5e7eb;">${documentName}</td></tr>
    </table>
    <div style="margin:24px 0;">${btn(applicationUrl, "Revisar expediente")}</div>
    ${footer()}
  </div>`)
}

export function emailDocumentChangesUploaded({
  companyName,
  documentName,
  applicationUrl,
}: {
  companyName: string
  documentName: string
  applicationUrl: string
}): string {
  return wrap(`
  ${header("Cambios")}
  <div style="border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 8px 8px;">
    <h2 style="color:#0f766e;margin-top:0;">Cliente respondió a cambios solicitados</h2>
    <p><strong>${companyName}</strong> actualizó su expediente en respuesta a los cambios solicitados.</p>
    <table style="border-collapse:collapse;width:100%;margin:16px 0;">
      <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:bold;background:#f9fafb;width:40%;">Empresa</td><td style="padding:8px;border:1px solid #e5e7eb;">${companyName}</td></tr>
      <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:bold;background:#f9fafb;">Documento actualizado</td><td style="padding:8px;border:1px solid #e5e7eb;">${documentName}</td></tr>
    </table>
    <div style="margin:24px 0;">${btn(applicationUrl, "Revisar expediente")}</div>
    ${footer()}
  </div>`)
}

export function emailContractToClient({
  companyName,
  clientName,
  contractName,
  signingUrl,
  customMessage,
}: {
  companyName: string
  clientName: string
  contractName: string
  signingUrl?: string
  customMessage?: string
}): string {
  return wrap(`
  ${header("Firma de contrato")}
  <div style="border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 8px 8px;">
    <h2 style="color:${G};margin-top:0;">Tu contrato está listo para firmar</h2>
    <p>Hola <strong>${clientName}</strong>,</p>
    <p>El contrato <strong>${contractName}</strong> para <strong>${companyName}</strong> está listo para tu firma electrónica.</p>
    ${customMessage ? `
    <div style="background:#f8faf9;border-left:4px solid ${G};padding:12px 16px;margin:16px 0;border-radius:0 6px 6px 0;">
      <p style="margin:0;white-space:pre-wrap;font-size:13px;color:#374151;">${customMessage}</p>
    </div>` : ""}
    ${signingUrl ? `<div style="margin:28px 0;">${btn(signingUrl, "Firmar contrato")}</div>` : ""}
    <p style="color:#6b7280;font-size:13px;">Si tienes dudas sobre el contrato, responde este correo y con gusto te orientamos.</p>
    ${footer()}
  </div>`)
}
