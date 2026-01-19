import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

interface EmailOptions {
  email: string;
  subject: string;
  text?: string;
  html?: string;
}

const sendMail = async (options: EmailOptions) => {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: true,
    auth: {
      user: process.env.SMTP_EMAIL,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  await transporter.sendMail({
    from: `"VEXT" <${process.env.SMTP_FROM}>`,
    to: options.email,
    subject: options.subject,
    text: options.text,
    html: options.html,
  });
};

const getVerificationEmailHtml = (code: string, username: string) => {
  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0f; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
            <td align="center" style="padding: 40px 0;">
                <table role="presentation" style="width: 100%; max-width: 500px; border-collapse: collapse;">
                    <!-- Logo & Header -->
                    <tr>
                        <td align="center" style="padding: 30px 40px; background: linear-gradient(135deg, #1a1a2e 0%, #16162a 100%); border-radius: 16px 16px 0 0;">
                            <h1 style="margin: 0; font-size: 32px; font-weight: 800; background: linear-gradient(to right, #ff7eb3, #ff758c); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; letter-spacing: 2px;">VEXT</h1>
                            <p style="margin: 10px 0 0; color: #b0b9c3; font-size: 14px;">Gaming Platform</p>
                        </td>
                    </tr>
                    
                    <!-- Main Content -->
                    <tr>
                        <td style="padding: 40px; background: linear-gradient(180deg, #16162a 0%, #12121f 100%);">
                            <h2 style="margin: 0 0 10px; color: #ffffff; font-size: 24px; font-weight: 700;">Bienvenue, ${username}! 👋</h2>
                            <p style="margin: 0 0 30px; color: #b0b9c3; font-size: 16px; line-height: 1.6;">
                                Merci de t'être inscrit sur VEXT. Utilise le code ci-dessous pour vérifier ton email.
                            </p>
                            
                            <!-- Verification Code Box -->
                            <div style="background: rgba(255, 126, 179, 0.1); border: 2px solid rgba(255, 126, 179, 0.3); border-radius: 12px; padding: 25px; text-align: center; margin: 0 0 30px;">
                                <p style="margin: 0 0 10px; color: #b0b9c3; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Ton code de vérification</p>
                                <p style="margin: 0; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #ff7eb3;">${code}</p>
                            </div>
                            
                            <p style="margin: 0; color: #7a7a8c; font-size: 14px; text-align: center;">
                                ⏱️ Ce code expire dans <strong style="color: #7afcff;">10 minutes</strong>
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="padding: 20px 40px; background: #0d0d15; border-radius: 0 0 16px 16px; text-align: center;">
                            <p style="margin: 0; color: #5a5a6e; font-size: 12px;">
                                Si tu n'as pas créé de compte sur VEXT, ignore cet email.
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

export { sendMail, getVerificationEmailHtml };
