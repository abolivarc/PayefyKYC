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
  return `
<!DOCTYPE html>
<html lang="es">
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#1a1a1a;">
  <div style="background:#065f2e;padding:20px;border-radius:8px 8px 0 0;">
    <h1 style="color:white;margin:0;font-size:20px;">PayefyKYC</h1>
  </div>
  <div style="border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 8px 8px;">
    <h2 style="color:#065f2e;">Nueva solicitud lista para revisión</h2>
    <p>Hola ${reviewerName},</p>
    <p>La empresa <strong>${companyName}</strong> ha enviado su expediente completo para el producto <strong>${productName}</strong> y está lista para revisión.</p>
    <div style="margin:24px 0;">
      <a href="${applicationUrl}" style="background:#065f2e;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;">
        Revisar expediente
      </a>
    </div>
    <p style="color:#6b7280;font-size:12px;">PayefyKYC · Este correo es generado automáticamente.</p>
  </div>
</body>
</html>`
}

export function emailChangesRequested({
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
  return `
<!DOCTYPE html>
<html lang="es">
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#1a1a1a;">
  <div style="background:#065f2e;padding:20px;border-radius:8px 8px 0 0;">
    <h1 style="color:white;margin:0;font-size:20px;">PayefyKYC</h1>
  </div>
  <div style="border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 8px 8px;">
    <h2 style="color:#b45309;">Tu expediente requiere cambios</h2>
    <p>Hola ${clientName},</p>
    <p>Revisamos el expediente de <strong>${companyName}</strong> y necesitamos que corrijas o complementes algunos documentos:</p>
    <div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:12px 16px;margin:16px 0;border-radius:0 6px 6px 0;">
      <p style="margin:0;white-space:pre-wrap;">${notes}</p>
    </div>
    <div style="margin:24px 0;">
      <a href="${applicationUrl}" style="background:#065f2e;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;">
        Ver mi expediente
      </a>
    </div>
    <p style="color:#6b7280;font-size:12px;">PayefyKYC · Este correo es generado automáticamente.</p>
  </div>
</body>
</html>`
}

export function emailApproved({
  companyName,
  clientName,
  productName,
}: {
  companyName: string
  clientName: string
  productName: string
}): string {
  return `
<!DOCTYPE html>
<html lang="es">
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#1a1a1a;">
  <div style="background:#065f2e;padding:20px;border-radius:8px 8px 0 0;">
    <h1 style="color:white;margin:0;font-size:20px;">PayefyKYC</h1>
  </div>
  <div style="border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 8px 8px;">
    <h2 style="color:#065f2e;">¡Tu solicitud ha sido activada! 🎉</h2>
    <p>Hola ${clientName},</p>
    <p>Nos complace informarte que el proceso KYC de <strong>${companyName}</strong> para el producto <strong>${productName}</strong> ha sido completado exitosamente.</p>
    <p>En breve nuestro equipo se pondrá en contacto contigo para los siguientes pasos de activación.</p>
    <p style="color:#6b7280;font-size:12px;">PayefyKYC · Este correo es generado automáticamente.</p>
  </div>
</body>
</html>`
}
