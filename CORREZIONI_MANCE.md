# Correzioni Sistema Mance (Tips)

## Problemi Risolti

### 1. **Bottone Mance non funzionante su Desktop/Mobile**
   - **Causa**: Il bottone era nascosto in una toolbar espandibile con `pointer-events-none` quando chiusa
   - **Soluzione**: 
     - Rimosso `pointer-events-none` dalla toolbar quando è chiusa
     - Aggiunto `e.preventDefault()` e `e.stopPropagation()` agli event handler
     - Migliorato l'event handling per evitare conflitti

### 2. **Crediti non aggiornati dopo invio mancia**
   - **Causa**: Mancava il refresh dei dati utente dopo il trasferimento crediti
   - **Soluzione**:
     - Aggiunto evento `velvetRefreshUser` che viene emesso dopo l'invio della mancia
     - Dashboard ora ascolta questo evento e aggiorna i dati dell'utente
     - I crediti si aggiornano immediatamente sia per mittente che destinatario

### 3. **Debug e Logging**
   - Aggiunti log dettagliati in `handleSendTip` per tracciare:
     - Inizio processo mancia
     - Verifica crediti
     - Conferma utente
     - Chiamata API
     - Aggiornamento messaggi
     - Eventuali errori

## Modifiche ai File

### `components/ChatOverlay.tsx`
- **Linea 417**: Rimosso `pointer-events-none` dalla toolbar espandibile
- **Linee 428-432**: Migliorato event handling bottone mance
- **Linee 444-451**: Migliorato event handling bottone carte
- **Linee 157-186**: Aggiunto logging dettagliato e refresh utente

### `components/Dashboard.tsx`
- **Linee 112-118**: Aggiunto listener per evento `velvetRefreshUser`
- **Linea 124**: Aggiunto `onRefreshUser` alle dipendenze dell'useEffect

## Logica Backend (già esistente e corretta)

### `services/db.ts` - Funzione `sendTip`
1. Verifica se il mittente è admin (le mance admin sono simboliche, non decurtano crediti)
2. Per utenti normali, chiama la funzione RPC `transfer_credits`
3. Invia un messaggio privato con il formato `:::TIP|{amount}:::`

### Database - Funzione RPC `transfer_credits`
Definita in `supabase_credits_logic.sql`:
```sql
CREATE OR REPLACE FUNCTION transfer_credits(
    p_sender_id UUID,
    p_recipient_id UUID,
    p_amount INT
)
RETURNS JSONB
```

**Logica**:
1. Verifica che il mittente abbia crediti sufficienti
2. Sottrae i crediti dal mittente: `UPDATE profiles SET credits = credits - p_amount WHERE id = p_sender_id`
3. Aggiunge i crediti al destinatario: `UPDATE profiles SET credits = credits + p_amount WHERE id = p_recipient_id`
4. Ritorna `{success: true}` o `{success: false, error: "messaggio"}`

## Come Testare

1. **Aprire la chat** con un altro utente
2. **Cliccare il bottone "+"** per espandere la toolbar delle azioni
3. **Cliccare il bottone "Mance"** (icona monete gialle)
4. **Selezionare un importo** (10, 50, 100, o 500 crediti)
5. **Confermare** l'invio
6. **Verificare**:
   - Il messaggio della mancia appare nella chat
   - I crediti del mittente si aggiornano immediatamente
   - I crediti del destinatario aumentano
   - Nella console del browser appaiono i log `[TIP]`

## Note Importanti

- **Admin**: Gli admin possono inviare mance simboliche senza decurtare i propri crediti
- **Crediti insufficienti**: Se l'utente non ha abbastanza crediti, viene mostrato un alert
- **Transazione atomica**: Il trasferimento crediti è gestito da una funzione RPC PostgreSQL che garantisce l'atomicità
- **Formato messaggio**: Le mance vengono visualizzate con un design speciale (bordo giallo, icona monete animate)

## Verifica Database

Per verificare che la funzione RPC sia presente nel database Supabase:

1. Andare su Supabase Dashboard → SQL Editor
2. Eseguire: 
   ```sql
   SELECT routine_name, routine_type 
   FROM information_schema.routines 
   WHERE routine_name = 'transfer_credits';
   ```
3. Se non esiste, eseguire il contenuto di `supabase_credits_logic.sql`
