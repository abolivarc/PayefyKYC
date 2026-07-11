export function emailPasswordReset({
  resetUrl,
  isAdmin = false,
}: {
  resetUrl: string
  isAdmin?: boolean
}): string {
  const portalLabel = isAdmin ? "Portal interno" : "Portal de onboarding"

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Recupera tu contraseña · Payefy</title>
</head>
<body style="margin:0;padding:0;background:#F3F7F4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">

  <!-- Wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F3F7F4;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

          <!-- Logo header -->
          <tr>
            <td align="center" style="padding-bottom:28px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#004238;border-radius:16px;padding:14px 24px;display:inline-block;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td>
                          <!-- F mark SVG inline -->
                          <svg width="28" height="28" viewBox="0 0 500 500" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:block;margin-right:10px;vertical-align:middle;">
                            <rect width="500" height="500" fill="transparent"/>
                            <path d="M100 80 C100 80 100 420 100 420 L200 420 L200 290 L360 290 L360 210 L200 210 L200 160 L380 160 L380 80 Z" fill="#AEFF99"/>
                          </svg>
                        </td>
                        <td style="padding-left:10px;vertical-align:middle;">
                          <span style="font-size:20px;font-weight:800;color:#AEFF99;letter-spacing:-0.5px;">Payefy</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main card -->
          <tr>
            <td style="background:#ffffff;border-radius:20px;box-shadow:0 4px 24px rgba(0,66,56,0.08);overflow:hidden;">

              <!-- Green top bar -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#004238;padding:36px 40px 32px;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="background:rgba(174,255,153,0.15);border-radius:50px;padding:6px 14px;margin-bottom:16px;display:inline-block;">
                          <span style="font-size:12px;font-weight:600;color:#AEFF99;letter-spacing:0.05em;text-transform:uppercase;">${portalLabel}</span>
                        </td>
                      </tr>
                    </table>
                    <p style="margin:12px 0 0;font-size:26px;font-weight:800;color:#ffffff;line-height:1.2;letter-spacing:-0.5px;">
                      Recupera tu<br/>contraseña
                    </p>
                    <p style="margin:10px 0 0;font-size:15px;color:rgba(255,255,255,0.6);line-height:1.5;">
                      Recibimos una solicitud para restablecer<br/>el acceso a tu cuenta.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Body -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:36px 40px;">

                    <p style="margin:0 0 24px;font-size:15px;color:#3D5147;line-height:1.6;">
                      Haz clic en el botón de abajo para crear una nueva contraseña. Este enlace es válido por <strong style="color:#004238;">60 minutos</strong> y solo puede usarse una vez.
                    </p>

                    <!-- CTA Button -->
                    <table cellpadding="0" cellspacing="0" style="margin:0 auto 32px;">
                      <tr>
                        <td align="center" style="background:#004238;border-radius:12px;">
                          <a href="${resetUrl}"
                             style="display:inline-block;padding:16px 40px;font-size:16px;font-weight:700;color:#AEFF99;text-decoration:none;letter-spacing:-0.2px;">
                            Restablecer contraseña →
                          </a>
                        </td>
                      </tr>
                    </table>

                    <!-- Divider -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                      <tr>
                        <td style="border-top:1px solid #E4ECE7;"></td>
                      </tr>
                    </table>

                    <!-- Fallback URL -->
                    <p style="margin:0 0 6px;font-size:12px;font-weight:600;color:#8AA396;text-transform:uppercase;letter-spacing:0.06em;">
                      ¿El botón no funciona?
                    </p>
                    <p style="margin:0 0 24px;font-size:12px;color:#8AA396;line-height:1.6;word-break:break-all;">
                      Copia y pega este enlace en tu navegador:<br/>
                      <a href="${resetUrl}" style="color:#004238;text-decoration:underline;">${resetUrl}</a>
                    </p>

                    <!-- Security notice -->
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="background:#F3F7F4;border-radius:12px;padding:16px 20px;">
                          <table cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="vertical-align:top;padding-right:12px;">
                                <span style="font-size:18px;">🔒</span>
                              </td>
                              <td>
                                <p style="margin:0;font-size:13px;font-weight:600;color:#004238;">Aviso de seguridad</p>
                                <p style="margin:4px 0 0;font-size:12px;color:#5B7168;line-height:1.5;">
                                  Si no solicitaste este cambio, ignora este correo. Tu contraseña actual seguirá siendo la misma.
                                </p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:28px;padding-bottom:8px;">
              <p style="margin:0;font-size:12px;color:#8AA396;line-height:1.8;">
                © ${new Date().getFullYear()} Payefy · Todos los derechos reservados<br/>
                Este correo fue enviado de forma automática, por favor no respondas a este mensaje.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`
}
