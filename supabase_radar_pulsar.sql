-- MIGRAZIONE PER PULSAR AURA RADAR
-- Aggiunta supporto per VIP Flares

ALTER TABLE radar_checkins 
ADD COLUMN IF NOT EXISTS flare_expires_at TIMESTAMPTZ DEFAULT NULL;

-- Indice per performance sulle query del radar
CREATE INDEX IF NOT EXISTS idx_radar_flare ON radar_checkins(flare_expires_at) WHERE flare_expires_at IS NOT NULL;

-- Notifica per ricaricare lo schema cache se necessario
NOTIFY pgrst, 'reload schema';
