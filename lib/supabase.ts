
import { createClient } from '@supabase/supabase-js';

// Configurazione Supabase
const supabaseUrl = 'https://rnjhhnawclknfxxbjdwa.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJuamhobmF3Y2xrbmZ4eGJqZHdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2ODk3NjksImV4cCI6MjA4MDI2NTc2OX0.B-8QYko4A99iU8GoMCxlbJH8Y6mNKX1Y9HFdauc6hDc';

// Controllo preventivo (non dovrebbe più scattare ora che la chiave è corretta)
if (supabaseKey && supabaseKey.startsWith('sb_publishable')) {
  console.error("ERRORE CONFIGURAZIONE: Hai usato una 'publishable key' invece della 'anon key'. Vai su Supabase > Project Settings > API e copia la chiave 'anon' public (quella lunga che inizia con eyJ).");
}

export const supabase = createClient(supabaseUrl, supabaseKey);
