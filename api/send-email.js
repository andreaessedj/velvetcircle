// api/send-email.js
// NOTE: This project uses "type": "module" in package.json, so Vercel treats .js files as ESM.
// That means we must use `import` / `export default` (not `require` / `module.exports`).

import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

// URL del progetto Supabase (uguale a lib/supabase.ts)
const supabaseUrl = 'https://rnjhhnawclknfxxbjdwa.supabase.co';
// Service key (letto da env su Vercel)
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

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
  const { receiverId, senderName, messagePreview } = body;

  if (!receiverId || !senderName) {
    res.status(400).json({ error: 'Missing parameters' });
    return;
  }

  // Validazioni env: se mancano, rispondiamo con errore chiaro.
  if (!process.env.GMAIL_USER || !process.env.GMAIL_PASS) {
    res.status(500).json({
      error:
        'Missing email env vars. Set GMAIL_USER and GMAIL_PASS (App Password) in Vercel Environment Variables.',
    });
    return;
  }
  if (!supabaseServiceKey) {
    res.status(500).json({
      error: 'Missing SUPABASE_SERVICE_ROLE_KEY in Vercel Environment Variables.',
    });
    return;
  }

  try {
    // 1) Transporter Gmail (SMTP)
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS,
      },
    });

    // 2) Recupera email destinatario da Supabase (admin client)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email, name')
      .eq('id', receiverId)
      .single();

    if (profileError || !profile?.email) {
      console.error('User email not found:', profileError);
      res.status(404).json({ error: 'User email not found' });
      return;
    }

    // 3) Contenuto HTML
    const preview = (messagePreview || '').toString().slice(0, 200);
    const htmlContent = `
      <div style="background-color:#000;color:#fff;padding:20px;font-family:sans-serif;border:1px solid #333;">
        <h2 style="color:#b91c1c;text-transform:uppercase;letter-spacing:2px;">Velvet Club</h2>
        <p style="color:#ccc;">Ciao <strong>${profile.name || 'utente'}</strong>,</p>
        <p>Hai ricevuto un nuovo messaggio privato da <strong style="color:#b91c1c;">${senderName}</strong>.</p>

        <div style="background-color:#111;padding:15px;border-left:4px solid #b91c1c;margin:20px 0;font-style:italic;color:#999;">
          “${preview}${preview ? '…' : ''}”
        </div>

        <p style="font-size:12px;color:#666;">
          Accedi alla piattaforma per rispondere. I messaggi si autodistruggono dopo 36 ore.
        </p>

        <a href="https://velvetclub.vercel.app" style="display:inline-block;padding:10px 20px;background-color:#b91c1c;color:#fff;text-decoration:none;text-transform:uppercase;font-size:12px;font-weight:bold;margin-top:10px;">
          Vai ai messaggi
        </a>
      </div>
    `;

    // 4) Invia email
    const info = await transporter.sendMail({
      from: `"Velvet Club" <${process.env.GMAIL_USER}>`,
      to: profile.email,
      subject: `Nuovo messaggio da ${senderName} - Velvet Club`,
      html: htmlContent,
    });

    res.status(200).json({ success: true, messageId: info.messageId });
  } catch (error) {
    console.error('Email send error:', error);
    res.status(500).json({ error: error?.message || 'Internal Server Error' });
  }
}
