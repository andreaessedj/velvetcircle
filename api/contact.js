// api/contact.js
// ESM compatible (project has "type": "module").

import nodemailer from 'nodemailer';

function setCors(res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );
}

function safeJsonParse(maybeString) {
  if (!maybeString) return null;
  if (typeof maybeString === 'object') return maybeString;
  try {
    return JSON.parse(maybeString);
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  setCors(res);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const body = safeJsonParse(req.body) ?? {};
  const { userId, userName, userEmail, topic, message } = body;

  if (!topic || !message) {
    res.status(400).json({ error: 'Missing parameters' });
    return;
  }

  if (!process.env.GMAIL_USER || !process.env.GMAIL_PASS) {
    res.status(500).json({
      error:
        'Missing email env vars. Set GMAIL_USER and GMAIL_PASS (App Password) in Vercel Environment Variables.',
    });
    return;
  }

  try {
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS,
      },
    });

    const cleanTopic = (topic || 'Support').toString().slice(0, 120);
    const cleanMessage = (message || '').toString().slice(0, 5000);
    const cleanUserName = (userName || 'Utente').toString().slice(0, 120);
    const cleanUserEmail = (userEmail || '').toString().slice(0, 200);
    const cleanUserId = (userId || '').toString().slice(0, 200);

    const htmlContent = `
      <div style="background-color:#0a0a0a;color:#fff;padding:30px;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;border:1px solid #1a1a1a;">
        <h2 style="color:#b91c1c;border-bottom:1px solid #b91c1c;padding-bottom:10px;text-transform:uppercase;letter-spacing:1px;">
          Velvet Club Support
        </h2>

        <div style="margin:20px 0;">
          <p style="color:#999;font-size:12px;margin-bottom:6px;">ARGOMENTO</p>
          <p style="font-size:18px;color:#fff;font-weight:700;margin:0;">${cleanTopic}</p>
        </div>

        <div style="background-color:#111;padding:20px;border:1px solid #333;margin:20px 0;">
          <p style="color:#ccc;line-height:1.6;white-space:pre-wrap;margin:0;">${cleanMessage}</p>
        </div>

        <div style="margin-top:30px;border-top:1px solid #222;padding-top:20px;">
          <p style="font-size:12px;color:#666;margin:0 0 10px;">DETTAGLI UTENTE</p>
          <p style="font-size:14px;color:#aaa;margin:2px 0;"><strong>Nome:</strong> ${cleanUserName}</p>
          <p style="font-size:14px;color:#aaa;margin:2px 0;"><strong>Email:</strong> ${cleanUserEmail || '—'}</p>
          <p style="font-size:14px;color:#aaa;margin:2px 0;"><strong>ID:</strong> ${cleanUserId || '—'}</p>
        </div>

        <div style="margin-top:28px;text-align:center;">
          <p style="font-size:10px;color:#444;text-transform:uppercase;letter-spacing:2px;margin:0;">
            End-to-End Discretion Guaranteed
          </p>
        </div>
      </div>
    `;

    await transporter.sendMail({
      from: `"Velvet Club Support" <${process.env.GMAIL_USER}>`,
      to: process.env.GMAIL_USER, // inbox support
      replyTo: cleanUserEmail || undefined,
      subject: `[SUPPORT] ${cleanTopic} - da ${cleanUserName}`,
      html: htmlContent,
    });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Contact API error:', error);
    res.status(500).json({ error: error?.message || 'Internal Server Error' });
  }
}
