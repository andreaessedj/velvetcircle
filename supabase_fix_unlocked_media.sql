
-- VELVET CLUB - DATABASE REPAIR SCRIPT (v2)
-- QUESTO SCRIPT RISOLVE I PROBLEMI DI COLONNE MANCANTI E FUNZIONI RPC
-- ESEGUI QUESTO SCRIPT NEL TUO SQL EDITOR DI SUPABASE

-- 1. AGGIORNAMENTO COLONNE TABELLA PROFILES
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS unlocked_media text[] DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS credits integer DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_vip boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS vip_until timestamp with time zone;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS boost_until timestamp with time zone;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_verified boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gallery jsonb DEFAULT '[]'::jsonb;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_banned boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ban_reason text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS location text;

-- 2. FUNZIONE RPC: buy_vault_item
-- Gestisce l'acquisto di contenuti (foto/link) in una transazione sicura
CREATE OR REPLACE FUNCTION buy_vault_item(
    p_buyer_id UUID,
    p_seller_id UUID,
    p_item_id TEXT,
    p_price INT
)
RETURNS JSONB AS $$
DECLARE
    buyer_credits INT;
    buyer_unlocked TEXT[];
BEGIN
    -- Recupero dati attuali
    SELECT credits, unlocked_media INTO buyer_credits, buyer_unlocked 
    FROM profiles 
    WHERE id = p_buyer_id;
    
    -- Se è già sbloccato, successo silente
    IF p_item_id = ANY(COALESCE(buyer_unlocked, '{}')) THEN
        RETURN jsonb_build_object('success', true, 'message', 'Già sbloccato');
    END IF;

    -- Controllo crediti se il prezzo è maggiore di 0
    IF p_price > 0 THEN
        IF buyer_credits IS NULL OR buyer_credits < p_price THEN
            RETURN jsonb_build_object('success', false, 'error', 'Crediti insufficienti');
        END IF;

        -- Aggiornamento crediti
        UPDATE profiles SET credits = COALESCE(credits, 0) - p_price WHERE id = p_buyer_id;
        UPDATE profiles SET credits = COALESCE(credits, 0) + p_price WHERE id = p_seller_id;
    END IF;

    -- Aggiunta all'elenco dei contenuti sbloccati
    UPDATE profiles 
    SET unlocked_media = array_append(COALESCE(unlocked_media, '{}'), p_item_id)
    WHERE id = p_buyer_id;

    RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. FUNZIONE RPC: spend_credits
-- Sottrae crediti per servizi (come il Boost)
CREATE OR REPLACE FUNCTION spend_credits(user_id UUID, amount INT)
RETURNS BOOLEAN AS $$
DECLARE
    current_credits INT;
BEGIN
    SELECT credits INTO current_credits FROM profiles WHERE id = user_id;
    
    IF COALESCE(current_credits, 0) >= amount THEN
        UPDATE profiles 
        SET credits = COALESCE(credits, 0) - amount 
        WHERE id = user_id;
        RETURN TRUE;
    ELSE
        RETURN FALSE;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. FUNZIONE RPC: transfer_credits (Mance/Tips)
CREATE OR REPLACE FUNCTION transfer_credits(
    p_sender_id UUID,
    p_recipient_id UUID,
    p_amount INT
)
RETURNS JSONB AS $$
DECLARE
    sender_credits INT;
BEGIN
    SELECT credits INTO sender_credits FROM profiles WHERE id = p_sender_id;
    
    IF COALESCE(sender_credits, 0) < p_amount THEN
        RETURN jsonb_build_object('success', false, 'error', 'Crediti insufficienti');
    END IF;

    UPDATE profiles SET credits = COALESCE(credits, 0) - p_amount WHERE id = p_sender_id;
    UPDATE profiles SET credits = COALESCE(credits, 0) + p_amount WHERE id = p_recipient_id;

    RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
