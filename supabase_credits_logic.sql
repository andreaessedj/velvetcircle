
-- 1. RPC: spend_credits
-- Sottrae crediti a un utente in modo sicuro (con controllo saldo)
CREATE OR REPLACE FUNCTION spend_credits(user_id UUID, amount INT)
RETURNS BOOLEAN AS $$
DECLARE
    current_credits INT;
BEGIN
    SELECT credits INTO current_credits FROM profiles WHERE id = user_id;
    
    IF current_credits >= amount THEN
        UPDATE profiles 
        SET credits = credits - amount 
        WHERE id = user_id;
        RETURN TRUE;
    ELSE
        RETURN FALSE;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. RPC: buy_vault_item
-- Gestisce l'intero processo di acquisto in una transazione atomica
-- 1. Sottrae crediti al compratore
-- 2. Aggiunge crediti al venditore
-- 3. Aggiunge l'ID dell'item alla lista unlocked_media del compratore
CREATE OR REPLACE FUNCTION buy_vault_item(
    p_buyer_id UUID,
    p_seller_id UUID,
    p_item_id TEXT,
    p_price INT
)
RETURNS JSONB AS $$
DECLARE
    buyer_credits INT;
    seller_name TEXT;
    buyer_unlocked TEXT[];
BEGIN
    -- 1. Verifica crediti compratore
    SELECT credits, unlocked_media INTO buyer_credits, buyer_unlocked FROM profiles WHERE id = p_buyer_id;
    
    IF buyer_credits < p_price THEN
        RETURN jsonb_build_object('success', false, 'error', 'Crediti insufficienti');
    END IF;

    -- 2. Se l'item è già sbloccato, non fare nulla (successo silente)
    IF p_item_id = ANY(buyer_unlocked) THEN
        RETURN jsonb_build_object('success', true, 'message', 'Già sbloccato');
    END IF;

    -- 3. Sottrai crediti al compratore
    UPDATE profiles SET credits = credits - p_price WHERE id = p_buyer_id;

    -- 4. Aggiungi crediti al venditore
    UPDATE profiles SET credits = credits + p_price WHERE id = p_seller_id;

    -- 5. Aggiungi alla lista sbloccati
    UPDATE profiles 
    SET unlocked_media = array_append(COALESCE(unlocked_media, '{}'), p_item_id)
    WHERE id = p_buyer_id;

    -- 6. Notifica (opzionale - se avete una tabella notifiche)
    -- Potrebbe essere aggiunto qui un insert in notifications

    RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. RPC: transfer_credits
-- Trasferisce crediti tra due utenti (usato per le mance)
CREATE OR REPLACE FUNCTION transfer_credits(
    p_sender_id UUID,
    p_recipient_id UUID,
    p_amount INT
)
RETURNS JSONB AS $$
DECLARE
    sender_credits INT;
BEGIN
    -- 1. Verifica crediti mittente
    SELECT credits INTO sender_credits FROM profiles WHERE id = p_sender_id;
    
    IF sender_credits < p_amount THEN
        RETURN jsonb_build_object('success', false, 'error', 'Crediti insufficienti');
    END IF;

    -- 2. Sottrai crediti al mittente
    UPDATE profiles SET credits = credits - p_amount WHERE id = p_sender_id;

    -- 3. Aggiungi crediti al destinatario
    UPDATE profiles SET credits = credits + p_amount WHERE id = p_recipient_id;

    RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
