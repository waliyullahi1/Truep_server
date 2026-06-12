
export const inspectionRequestTemplate = (
  sellerName,
  requesterName,
  requesterEmail,
  requesterPhone,
  propertyTitle,
  inspectionDate,
  inspectionTime,
  message,
  propertyUrl
) => {
  return `
  <!doctype html>
  <html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Property Inspection Request</title>
    <style>
      @media only screen and (max-width:480px){
        .container { width:100% !important; padding:16px !important; }
        .hero { font-size:20px !important; }
      }
    </style>
  </head>

  <body style="margin:0;padding:0;background-color:#f4f6f8;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;">

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8;">
      <tr>
        <td align="center" style="padding:32px 16px;">

          <table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0"
            style="width:600px;max-width:600px;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 6px 18px rgba(10,20,30,0.08);">

            <!-- Header -->
            <tr>
              <td style="padding:22px 28px;background:linear-gradient(90deg,#a66804,#FFC059);color:white;">
                <h1 style="margin:0;font-size:20px;font-weight:700;">
                  New Property Inspection Request
                </h1>
              </td>
            </tr>

            <!-- Content -->
            <tr>
              <td style="padding:28px;">

                <p class="hero" style="margin:0 0 16px;font-size:18px;color:#0f1724;">
                  Hello ${sellerName},
                </p>

                <p style="margin:0 0 24px;color:#475569;line-height:1.6;">
                  A prospective buyer/tenant has requested an inspection for your property.
                </p>

                <!-- Property Details -->
                <div style="background:#f8fafc;padding:20px;border-radius:10px;margin-bottom:20px;">
                  <h3 style="margin-top:0;color:#0f1724;">
                    Property Information
                  </h3>

                  <p style="margin:8px 0;color:#475569;">
                    <strong>Property:</strong> ${propertyTitle}
                  </p>

                  <p style="margin:8px 0;color:#475569;">
                    <strong>Inspection Date:</strong> ${inspectionDate}
                  </p>

                  <p style="margin:8px 0;color:#475569;">
                    <strong>Inspection Time:</strong> ${inspectionTime}
                  </p>
                </div>

                <!-- Requester Details -->
                <div style="background:#f8fafc;padding:20px;border-radius:10px;margin-bottom:20px;">
                  <h3 style="margin-top:0;color:#0f1724;">
                    Requester Information
                  </h3>

                  <p style="margin:8px 0;color:#475569;">
                    <strong>Name:</strong> ${requesterName}
                  </p>

                  <p style="margin:8px 0;color:#475569;">
                    <strong>Email:</strong> ${requesterEmail}
                  </p>

                  <p style="margin:8px 0;color:#475569;">
                    <strong>Phone:</strong> ${requesterPhone}
                  </p>

                  ${
                    message
                      ? `
                  <p style="margin:12px 0 0;color:#475569;">
                    <strong>Message:</strong><br>
                    ${message}
                  </p>
                  `
                      : ''
                  }
                </div>

                <!-- Button -->
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td align="center">
                      <a href="${propertyUrl}"
                        style="display:inline-block;padding:12px 22px;background:#FFC059;color:white;text-decoration:none;border-radius:8px;font-weight:600;">
                        View Property
                      </a>
                    </td>
                  </tr>
                </table>

                <hr style="border:none;border-top:1px solid #eef2f7;margin:24px 0;" />

                <p style="margin:0;color:#94a3b8;font-size:13px;">
                  Please contact the requester to confirm or reschedule the inspection if necessary.
                </p>

              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="padding:18px 28px;background:#fbfdff;color:#9aa7bb;font-size:12px;">
                <p style="margin:0;">
                  © ${new Date().getFullYear()} Virexcode. All rights reserved.
                </p>
              </td>
            </tr>

          </table>

        </td>
      </tr>
    </table>

  </body>
  </html>
  `;
};
