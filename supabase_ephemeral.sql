-- MIGRAZIONE PER ISTANTI EFFIMERI ALLA CIECA
-- Eseguire questo script nel SQL Editor di Supabase

ALTER TABLE circle_messages ADD COLUMN IF NOT EXISTS is_ephemeral BOOLEAN DEFAULT FALSE;
ALTER TABLE circle_messages ADD COLUMN IF NOT EXISTS ephemeral_reveals JSONB DEFAULT '{}'::jsonb;

ALTER TABLE private_messages ADD COLUMN IF NOT EXISTS is_ephemeral BOOLEAN DEFAULT FALSE;
ALTER TABLE private_messages ADD COLUMN IF NOT EXISTS ephemeral_reveals JSONB DEFAULT '{}'::jsonb;

-- Nota: ephemeral_reveals memorizzerà un oggetto tipo { "user_uuid": "timestamp_reveal" }
-- per gestire il countdown di 10 secondi per ogni utente in modo persistente.
