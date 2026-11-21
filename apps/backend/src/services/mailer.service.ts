import nodemailer from 'nodemailer';
import crypto from 'crypto';
import { EmailVerificationCodeModel, UserModel } from '@vext/database';

const CODE_TTL_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 5;

const SMTP_HOST = process.env.SMTP_HOST || 'mail.infomaniak.com';
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_SECURE = process.env.SMTP_SECURE === 'true' || process.env.SMTP_SECURE === '1' || SMTP_PORT === 465;
const SMTP_USER = process.env.SMTP_USER || 'noreply@hoopslive.ch';
const SMTP_PASS = process.env.SMTP_PASS || 'R6Q%s*krq242JY&0';
const SMTP_FROM = process.env.SMTP_FROM || 'VEXT <noreply@hoopslive.ch>';

const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: {
        user: SMTP_USER,
        pass: SMTP_PASS
    }
});

function hashVerificationCode(code: string): string {
    return crypto.createHash('sha256').update(String(code).trim()).digest('hex');
}

export function generateSixDigitCode(): string {
    const num = crypto.randomInt(100000, 1000000);
    return String(num);
}

export async function sendVerificationCodeEmail(to: string, code: string, username: string, purpose = 'email_verify') {
    let title = 'Vérification de votre compte';
    let subtitle = 'Activez votre compte VEXT pour accéder à votre bibliothèque et vos jeux.';
    if (purpose === 'password_reset') {
        title = 'Réinitialisation de mot de passe';
        subtitle = 'Voici votre code de sécurité pour réinitialiser le mot de passe de votre compte VEXT.';
    } else if (purpose === 'email_change') {
        title = 'Modification de votre adresse e-mail';
        subtitle = 'Confirmez ce code pour valider le changement de votre adresse e-mail.';
    }

    const htmlContent = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      margin: 0;
      padding: 30px 15px;
      background-color: #0c0812;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #ffffff;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      max-width: 500px;
      margin: 0 auto;
      background: #140d1f;
      border: 1px solid rgba(255, 117, 143, 0.25);
      border-radius: 18px;
      padding: 36px 28px;
      box-shadow: 0 16px 40px rgba(0, 0, 0, 0.6);
      text-align: center;
    }
    .logo-badge {
      display: inline-block;
      font-size: 26px;
      font-weight: 800;
      letter-spacing: 5px;
      color: #ff758f;
      margin-bottom: 24px;
      text-transform: uppercase;
      padding: 6px 18px;
      background: rgba(255, 117, 143, 0.1);
      border-radius: 12px;
      border: 1px solid rgba(255, 117, 143, 0.3);
    }
    h1 {
      font-size: 22px;
      font-weight: 700;
      color: #ffffff;
      margin: 0 0 10px 0;
    }
    .lead {
      color: #b3a9c4;
      font-size: 14px;
      line-height: 1.6;
      margin: 0 0 24px 0;
    }
    .code-container {
      background: rgba(255, 117, 143, 0.08);
      border: 2px dashed #ff758f;
      border-radius: 14px;
      padding: 20px 10px;
      margin: 24px 0;
    }
    .code {
      font-size: 38px;
      font-weight: 800;
      letter-spacing: 12px;
      color: #ff758f;
      font-family: 'Courier New', Courier, monospace;
      margin-left: 12px;
    }
    .warning {
      color: #8c829e;
      font-size: 13px;
      line-height: 1.5;
      margin-bottom: 28px;
    }
    .divider {
      height: 1px;
      background: rgba(255, 255, 255, 0.08);
      margin: 24px 0 20px 0;
    }
    .footer {
      font-size: 11px;
      color: #635a73;
      line-height: 1.4;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="logo-badge">VEXT</div>
    <h1>${title}</h1>
    <p class="lead">Bonjour <strong>${username}</strong>,<br>${subtitle}</p>
    
    <div class="code-container">
      <div class="code">${code}</div>
    </div>
    
    <p class="warning">
      Ce code expire dans <strong>15 minutes</strong>.<br>
      Ne partagez jamais ce code. Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet e-mail.
    </p>

    <div class="divider"></div>
    <div class="footer">
      VEXT Gaming Platform — Système d'authentification sécurisé<br>
      Cet e-mail automatique est envoyé depuis nos serveurs sécurisés.
    </div>
  </div>
</body>
</html>
    `;

    return await transporter.sendMail({
        from: SMTP_FROM,
        to,
        subject: `VEXT - Code de vérification : ${code}`,
        text: `Bonjour ${username}, votre code de vérification VEXT est : ${code} (valable 15 minutes).`,
        html: htmlContent
    });
}

export async function issueVerificationCode(userId: any, email: string, username: string, purpose: 'email_verify' | 'password_reset' | 'email_change' = 'email_verify') {
    const cleanEmail = String(email).toLowerCase().trim();
    const code = generateSixDigitCode();
    const codeHash = hashVerificationCode(code);
    const expiresAt = new Date(Date.now() + CODE_TTL_MS);

    // Invalider les anciens codes non consommés
    await EmailVerificationCodeModel.updateMany(
        { userId, purpose, consumedAt: null },
        { $set: { consumedAt: new Date() } }
    );

    // Créer le nouveau code
    const record = await EmailVerificationCodeModel.create({
        userId,
        email: cleanEmail,
        purpose,
        codeHash,
        expiresAt,
        attempts: 0,
        maxAttempts: MAX_ATTEMPTS
    });

    // Envoyer l'email
    await sendVerificationCodeEmail(cleanEmail, code, username, purpose);

    return { record, code };
}

export async function verifySubmittedCode(email: string, code: string, purpose: 'email_verify' | 'password_reset' | 'email_change' = 'email_verify') {
    const cleanEmail = String(email).toLowerCase().trim();
    const cleanCode = String(code).trim();
    const hash = hashVerificationCode(cleanCode);

    const pending = await EmailVerificationCodeModel.findOne({
        email: cleanEmail,
        purpose,
        consumedAt: null
    }).sort({ createdAt: -1 });

    if (!pending) {
        return { success: false, message: 'Aucun code de vérification en attente ou le code a déjà été utilisé.' };
    }

    if (new Date() > pending.expiresAt) {
        return { success: false, message: 'Ce code a expiré (validité 15 min). Veuillez en demander un nouveau.' };
    }

    if (pending.attempts >= pending.maxAttempts) {
        return { success: false, message: 'Nombre maximal de tentatives dépassé. Veuillez demander un nouveau code.' };
    }

    if (pending.codeHash !== hash) {
        pending.attempts += 1;
        await pending.save();
        const remaining = pending.maxAttempts - pending.attempts;
        return {
            success: false,
            message: `Code incorrect. Il vous reste ${remaining} tentative${remaining > 1 ? 's' : ''}.`
        };
    }

    // Code valide !
    pending.consumedAt = new Date();
    await pending.save();

    return { success: true, userId: pending.userId };
}
