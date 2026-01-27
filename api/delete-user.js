
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rnjhhnawclknfxxbjdwa.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Recupera il token dell'utente per verificare l'identità
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No authorization header' });

  try {
    // 1. Inizializza client admin
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    // 2. Verifica chi sta facendo la richiesta tramite il token JWT
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''));
    
    if (authError || !user) {
      console.error('[DeleteAccount] Auth Error:', authError);
      return res.status(401).json({ error: 'Invalid session' });
    }

    const userId = user.id;
    console.log(`[DeleteAccount] Request for user: ${userId} (${user.email})`);

    // 3. Eliminazione Utente da Auth (Supabase cascaderà sui profili se configurato, 
    // altrimenti eliminiamo manualmente prima il profilo per sicurezza)
    
    // Pulizia manuale tabelle dipendenti (opzionale se non ci sono cascate nel DB)
    await supabaseAdmin.from('radar_checkins').delete().eq('user_id', userId);
    await supabaseAdmin.from('profile_visits').delete().or(`visitor_id.eq.${userId},target_id.eq.${userId}`);
    await supabaseAdmin.from('private_messages').delete().or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);
    await supabaseAdmin.from('vault_access').delete().or(`owner_id.eq.${userId},requester_id.eq.${userId}`);
    await supabaseAdmin.from('profiles').delete().eq('id', userId);

    // 4. Eliminazione DEFINITIVA da auth.users (questo cancella anche la mail)
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error('[DeleteAccount] Admin Delete Error:', deleteError);
      throw deleteError;
    }

    console.log(`[DeleteAccount] User ${userId} completely removed from system.`);
    return res.status(200).json({ success: true, message: 'Account deleted successfully' });

  } catch (error) {
    console.error('[DeleteAccount] Fatal Error:', error);
    return res.status(500).json({ error: error.message || 'Server Error during account deletion' });
  }
}
