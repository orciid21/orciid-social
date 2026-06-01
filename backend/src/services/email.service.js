const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

const emailTemplate = (content) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f4f4f5; margin: 0; padding: 20px; }
    .container { max-width: 560px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 32px; text-align: center; }
    .header h1 { color: #fff; margin: 0; font-size: 24px; font-weight: 700; }
    .body { padding: 32px; color: #374151; line-height: 1.6; }
    .btn { display: inline-block; padding: 12px 24px; background: #6366f1; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 16px 0; }
    .footer { padding: 16px 32px; background: #f9fafb; text-align: center; color: #9ca3af; font-size: 13px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><h1>Orciid Social</h1></div>
    <div class="body">${content}</div>
    <div class="footer">© ${new Date().getFullYear()} Orciid Social. orciid.online</div>
  </div>
</body>
</html>`;

const sendVerificationEmail = async (email, name, token) => {
  const url = `${process.env.FRONTEND_URL}/verify-email/${token}`;
  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: email,
    subject: 'Verify your Orciid Social account',
    html: emailTemplate(`
      <h2>Welcome, ${name}! 👋</h2>
      <p>Thanks for signing up. Please verify your email address to get started.</p>
      <a href="${url}" class="btn">Verify Email</a>
      <p style="color:#9ca3af;font-size:13px;">This link expires in 24 hours. If you didn't create an account, ignore this email.</p>
    `),
  });
};

const sendPasswordResetEmail = async (email, name, token) => {
  const url = `${process.env.FRONTEND_URL}/reset-password/${token}`;
  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: email,
    subject: 'Reset your Orciid Social password',
    html: emailTemplate(`
      <h2>Hi ${name},</h2>
      <p>We received a request to reset your password. Click below to set a new password.</p>
      <a href="${url}" class="btn">Reset Password</a>
      <p style="color:#9ca3af;font-size:13px;">This link expires in 1 hour. If you didn't request this, ignore this email.</p>
    `),
  });
};

module.exports = { sendVerificationEmail, sendPasswordResetEmail };
