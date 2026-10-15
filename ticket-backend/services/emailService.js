import nodemailer from 'nodemailer';

/**
 * Creates and returns a configured Nodemailer Transporter
 * Supports Gmail Service, Custom SMTP (Host/Port), or Dev simulation fallback.
 */
export const createTransporter = () => {
  // Option 1: Custom SMTP (SendGrid, Mailgun, Amazon SES, or custom mail server)
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true' || Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  // Option 2: Gmail with Google App Password
  const gmailUser = process.env.EMAIL_USER || process.env.GMAIL_USER;
  const gmailPass = process.env.EMAIL_APP_PASSWORD || process.env.EMAIL_PASS || process.env.GMAIL_PASS;

  if (gmailUser && gmailPass) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: gmailPass
      }
    });
  }

  return null;
};

/**
 * Generates a clean, random temporary password for newly created users
 */
export const generateTemporaryPassword = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  const digits = '23456789';
  const symbols = '@#$%!';
  
  let result = 'Kanavu@';
  for (let i = 0; i < 4; i++) {
    result += digits.charAt(Math.floor(Math.random() * digits.length));
  }
  return result;
};

/**
 * Sends a welcome email containing account details, role, and auto-generated password
 */
export const sendWelcomeEmail = async ({
  to,
  fullName,
  empId,
  role,
  department,
  password
}) => {
  const loginUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const fromUser = process.env.EMAIL_FROM || process.env.EMAIL_USER || 'no-reply@qasoftware.com';

  const transporter = createTransporter();

  const plainText = `
Welcome to QA Software Workspace!

Hello ${fullName},

Your workspace account has been created by the system administrator. Here are your account details:

- Employee ID: ${empId || 'Assigned'}
- Full Name: ${fullName}
- Email: ${to}
- Department: ${department || 'Quality Assurance'}
- Role: ${role || 'QA Member'}
- Temporary Password: ${password}

Please log in and change your password:
${loginUrl}

Security Notice:
Please change your temporary password immediately upon your first login. Do not share this password with anyone.

Best regards,
The QA Software Administration Team
`.trim();

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Welcome to QA Software</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 36px 16px;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(15, 23, 42, 0.08); border: 1px solid #e2e8f0;">
          
          <!-- Brand Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #2563eb, #1d4ed8); padding: 32px 36px; text-align: left;">
              <div style="display: inline-block; background: rgba(255, 255, 255, 0.18); padding: 6px 12px; border-radius: 8px; color: #ffffff; font-size: 13px; font-weight: 700; letter-spacing: 0.5px; margin-bottom: 12px;">
                QA SOFTWARE WORKSPACE
              </div>
              <h1 style="margin: 0; font-size: 24px; font-weight: 800; color: #ffffff; line-height: 1.25;">
                Welcome to the Team, ${fullName}! 🎉
              </h1>
              <p style="margin: 8px 0 0 0; font-size: 14px; color: #dbeafe; line-height: 1.4;">
                Your workspace member account has been created. Here are your credentials.
              </p>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 32px 36px;">
              <p style="margin: 0 0 20px 0; font-size: 15px; color: #334155; line-height: 1.6;">
                Hello <strong>${fullName}</strong>,<br />
                An administrator has provisioned your account for the QA Software Workspace. You can now log in using the details below:
              </p>

              <!-- Account Details Card -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 20px 24px;">
                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="padding: 7px 0; font-size: 13px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; width: 40%;">Employee ID</td>
                        <td style="padding: 7px 0; font-size: 14px; color: #0f172a; font-weight: 700;">${empId || 'System Assigned'}</td>
                      </tr>
                      <tr>
                        <td style="padding: 7px 0; font-size: 13px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Registered Email</td>
                        <td style="padding: 7px 0; font-size: 14px; color: #0f172a; font-weight: 600;">${to}</td>
                      </tr>
                      <tr>
                        <td style="padding: 7px 0; font-size: 13px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Department</td>
                        <td style="padding: 7px 0; font-size: 14px; color: #0f172a; font-weight: 600;">${department || 'Quality Assurance'}</td>
                      </tr>
                      <tr>
                        <td style="padding: 7px 0; font-size: 13px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Assigned Role</td>
                        <td style="padding: 7px 0; font-size: 14px; color: #2563eb; font-weight: 700;">${role || 'QA Member'}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Password Highlight Box -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #eff6ff; border: 1.5px dashed #60a5fa; border-radius: 12px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 18px 24px; text-align: center;">
                    <div style="font-size: 12px; font-weight: 700; color: #1e40af; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">
                      Your Temporary Password
                    </div>
                    <div style="font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; font-size: 22px; font-weight: 800; color: #1d4ed8; letter-spacing: 1.5px; background: #ffffff; padding: 10px 18px; border-radius: 8px; display: inline-block; border: 1px solid #bfdbfe;">
                      ${password}
                    </div>
                    <div style="font-size: 12px; color: #3b82f6; margin-top: 8px;">
                      Please change this password immediately after your first sign in.
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Login Button CTA -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 28px;">
                <tr>
                  <td align="center">
                    <a href="${loginUrl}" target="_blank" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 700; padding: 14px 32px; border-radius: 10px; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.35);">
                      Sign In to Workspace &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Security Notice -->
              <div style="background-color: #fffbeb; border: 1px solid #fef3c7; border-radius: 10px; padding: 12px 16px; font-size: 13px; color: #92400e; line-height: 1.5;">
                <strong>Security Reminder:</strong> Never share your login credentials with anyone. Administrators will never ask for your password.
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 36px; text-align: center; font-size: 12px; color: #94a3b8; line-height: 1.5;">
              This is an automated notification from QA Software Workspace.<br />
              If you did not expect this invitation, please contact your workspace administrator.
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim();

  // If no SMTP configured, log to console in dev mode
  if (!transporter) {
    console.log(`\n======================================================`);
    console.log(`📧 [EMAIL SERVICE - DEV CONSOLE SIMULATION]`);
    console.log(`To: ${to}`);
    console.log(`Subject: 🎉 Welcome to QA Software - Your Workspace Credentials`);
    console.log(`Employee ID: ${empId}`);
    console.log(`Full Name: ${fullName}`);
    console.log(`Department: ${department}`);
    console.log(`Role: ${role}`);
    console.log(`🔑 Generated Password: ${password}`);
    console.log(`🌐 Login URL: ${loginUrl}`);
    console.log(`💡 Real SMTP Configuration: Add EMAIL_USER & EMAIL_APP_PASSWORD to ticket-backend/.env`);
    console.log(`======================================================\n`);

    return {
      success: true,
      simulated: true,
      message: 'Email logged to terminal console (SMTP credentials not yet configured in .env).'
    };
  }

  try {
    const info = await transporter.sendMail({
      from: `"QA Software Workspace" <${fromUser}>`,
      to,
      subject: `🎉 Welcome to QA Software - Your Workspace Credentials`,
      text: plainText,
      html: htmlContent
    });

    console.log(`✅ Welcome email successfully delivered to ${to} (Message ID: ${info.messageId})`);
    return {
      success: true,
      simulated: false,
      messageId: info.messageId
    };
  } catch (error) {
    console.error(`❌ Nodemailer delivery error for ${to}:`, error.message);
    return {
      success: false,
      error: error.message
    };
  }
};
