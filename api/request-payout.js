import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

// URL del tuo progetto Supabase
const supabaseUrl = 'https://rnjhhnawclknfxxbjdwa.supabase.co';
// Service key (necessaria per leggere i dati utente in modo sicuro lato server)
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  // Gestione CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // ✅ Body robusto: a volte arriva come stringa su alcune config/proxy
  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ error: 'Body JSON non valido' });
    }
  }

  const { userId, payPalEmail } = body || {};

  if (!userId || !payPalEmail) {
    return res.status(400).json({ error: 'Dati mancanti' });
  }

  // ✅ Check env (senza stampare valori)
  if (!supabaseServiceKey) {
    return res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY mancante' });
  }
  if (!process.env.GMAIL_USER || !process.env.GMAIL_PASS) {
    return res.status(500).json({ error: 'GMAIL_USER o GMAIL_PASS mancanti' });
  }

  try {
    console.log('[payout] start', { userId, payPalEmail });

    // 1. Inizializza Supabase Admin per leggere il profilo reale
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, name, email, credits')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      console.log('[payout] profileError', profileError);
      return res.status(404).json({ error: 'Utente non trovato' });
    }

    const credits = Number(profile.credits ?? 0);

    if (credits < 50) { // Minimo payout (opzionale, ma consigliato)
      return res.status(400).json({ error: 'Crediti insufficienti per richiedere un payout.' });
    }

    // 2. Configura Nodemailer (con timeout per evitare “loop infinito”)
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS,
      },

      // ✅ IMPORTANTISSIMO: evita che la chiamata resti appesa
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
    });

    // ✅ utile per capire subito se Gmail SMTP è raggiungibile
    await transporter.verify();
    console.log('[payout] smtp verified');

    // 3. Contenuto Email per l'Admin
    const htmlContent = `
      <div style="background-color: #f3f4f6; padding: 20px; font-family: sans-serif; color: #111;">
        <div style="max-width: 600px; margin: 0 auto; background: #fff; padding: 30px; border: 1px solid #ddd; border-top: 5px solid #b91c1c;">
          <h2 style="color: #b91c1c; margin-top: 0;">Richiesta Conversione Crediti</h2>
          <p>Un utente ha richiesto il payout dei propri crediti.</p>

          <table style="width: 100%; margin: 20px 0; border-collapse: collapse;">
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Utente:</strong></td>
              <td style="padding: 10px; border-bottom: 1px solid #eee;">${profile.name ?? '-'}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Email Utente:</strong></td>
              <td style="padding: 10px; border-bottom: 1px solid #eee;">${profile.email ?? '-'}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Saldo Crediti Attuale:</strong></td>
              <td style="padding: 10px; border-bottom: 1px solid #eee; font-size: 18px; font-weight: bold; color: #b91c1c;">${credits}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>PayPal Destinatario:</strong></td>
              <td style="padding: 10px; border-bottom: 1px solid #eee; background-color: #fffbeb;">${payPalEmail}</td>
            </tr>
          </table>

          <div style="background-color: #fee2e2; padding: 15px; border-radius: 5px; color: #991b1b; font-size: 14px;">
            <strong>Azione Richiesta:</strong><br/>
            1. Verifica la legittimità dell'utente.<br/>
            2. Effettua il pagamento su PayPal manuale.<br/>
            3. Vai nel database e azzera/scala i crediti dell'utente manualmente.
          </div>

          <p style="font-size: 12px; color: #666; margin-top: 30px;">
            Messaggio automatico dal sistema Velvet Circle.
          </p>
        </div>
      </div>
    `;

    // 4. Invia Email all'Admin
    // ✅ con Gmail è molto più sicuro usare come FROM lo stesso account autenticato,
    // altrimenti può generare comportamenti strani o blocchi.
    await transporter.sendMail({
      from: `"Velvet System" <${process.env.GMAIL_USER}>`,
      to: 'adult.meet.real@gmail.com',
      subject: `💰 PAYOUT REQUEST: ${profile.name ?? 'Utente'} (${credits} cr)`,
      html: htmlContent,
    });

    transporter.close();
    console.log('[payout] mail sent');

    return res.status(200).json({ success: true });

  } catch (error) {
    console.error('[payout] error:', error);
    return res.status(500).json({ error: error?.message || 'Errore server' });
  }
}
