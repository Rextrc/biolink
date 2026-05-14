const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = 'olik <verify@olik.app>';

async function sendVerificationEmail(to, username, code) {
  await resend.emails.send({
    from: FROM,
    to,
    subject: 'Verify your olik account',
    html: `
      <div style="background:#0a0a0a;padding:40px;font-family:Inter,sans-serif;color:#fff;max-width:480px;margin:0 auto;border-radius:16px">
        <div style="margin-bottom:28px">
          <span style="font-size:22px;font-weight:700">olik</span>
        </div>
        <h2 style="margin:0 0 10px;font-size:20px">Hey @${username}, verify your email</h2>
        <p style="color:rgba(255,255,255,0.5);margin:0 0 28px;font-size:14px">Enter this code to activate your account:</p>
        <div style="background:#111;border:1px solid #222;border-radius:12px;padding:24px;text-align:center;letter-spacing:10px;font-size:36px;font-weight:700;color:#6366f1;margin-bottom:24px">
          ${code}
        </div>
        <p style="color:rgba(255,255,255,0.3);font-size:12px;margin:0">This code expires in 15 minutes. If you didn't sign up, ignore this email.</p>
      </div>
    `,
  });
}

async function sendWelcomeEmail(to, username) {
  await resend.emails.send({
    from: FROM,
    to,
    subject: `Welcome to olik, @${username}!`,
    html: `
      <div style="background:#0a0a0a;padding:40px;font-family:Inter,sans-serif;color:#fff;max-width:480px;margin:0 auto;border-radius:16px">
        <div style="margin-bottom:28px">
          <span style="font-size:22px;font-weight:700">olik</span>
        </div>
        <h2 style="margin:0 0 10px;font-size:20px">You're in, @${username} 🎉</h2>
        <p style="color:rgba(255,255,255,0.5);margin:0 0 24px;font-size:14px">Your profile is live at:</p>
        <a href="https://olik.app/${username}" style="display:block;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff;text-decoration:none;padding:14px 24px;border-radius:12px;font-weight:600;font-size:15px;text-align:center;margin-bottom:24px">
          olik.app/${username}
        </a>
        <p style="color:rgba(255,255,255,0.3);font-size:12px;margin:0">Start adding your links from the dashboard.</p>
      </div>
    `,
  });
}

module.exports = { sendVerificationEmail, sendWelcomeEmail };
