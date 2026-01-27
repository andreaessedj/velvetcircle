# 📡 Sistema di Notifiche Telegram per Check-in Radar

## Panoramica
Il sistema di pubblicazione automatica su Telegram è già implementato e funzionante. Ogni volta che un utente attiva il Radar (check-in), viene inviata automaticamente una notifica al canale/gruppo Telegram configurato.

## Come Funziona

### 1. Flusso di Attivazione
Quando un utente esegue un check-in radar:
1. L'utente clicca su "Attiva Radar" nel componente `Radar.tsx`
2. Viene chiamata la funzione `api.broadcastLocation()` in `services/db.ts`
3. La posizione viene salvata nel database con offuscamento (jitter) per privacy
4. Viene eseguito il **reverse geocoding** per ottenere il nome della città
5. Viene inviata una notifica formattata a Telegram

### 2. Informazioni Incluse nella Notifica
Ogni notifica Telegram contiene:
- ✅ **Nome utente** con emoji del ruolo (👩‍❤️‍👨 Coppia, 🕺 Lui, 💃 Lei, 🏰 Club)
- ✅ **Città/Zona** (ottenuta tramite reverse geocoding da OpenStreetMap)
- ✅ **Coordinate** (come fallback se la città non è disponibile)
- ✅ **Messaggio personalizzato** dell'utente
- ✅ **Timestamp** dell'attivazione
- ✅ **Durata** del check-in (4 ore)

### 3. Esempio di Messaggio
```
📡 Radar Attivato!

👩‍❤️‍👨 Marco & Giulia si è appena reso visibile sul radar.
📍 Zona: Milano
💬 "Disponibili per un drink"
🕐 Orario: 21/01/2026, 12:30
⏱️ Durata: 4 ore

🚀 Controlla chi c'è intorno a te su Velvet Radar!
```

## Configurazione

### Bot Telegram
Per configurare il bot Telegram, devi:

1. **Creare un bot** tramite [@BotFather](https://t.me/botfather)
   - Invia `/newbot`
   - Scegli un nome e username
   - Ricevi il **Bot Token** (formato: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)

2. **Ottenere il Chat ID**
   - **Per un canale pubblico**: 
     - Aggiungi il bot come amministratore
     - Il Chat ID sarà nel formato `-100xxxxxxxxxx`
   - **Per un gruppo**:
     - Aggiungi il bot al gruppo
     - Usa [@userinfobot](https://t.me/userinfobot) per ottenere l'ID
     - Il Chat ID sarà nel formato `-xxxxxxxxx`
   - **Per una chat privata**:
     - Invia un messaggio al bot
     - Visita `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
     - Trova il tuo `chat.id` nella risposta

3. **Configurare le variabili d'ambiente**

   #### Sviluppo Locale
   Crea un file `.env` nella root del progetto:
   ```env
   TELEGRAM_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
   TELEGRAM_CHAT_ID=-100xxxxxxxxxx
   ```

   #### Produzione (Vercel)
   Vai su Vercel Dashboard → Settings → Environment Variables e aggiungi:
   - `TELEGRAM_TOKEN` = il tuo bot token
   - `TELEGRAM_CHAT_ID` = il tuo chat/channel ID

   **IMPORTANTE**: Usa esattamente questi nomi (`TELEGRAM_TOKEN` e `TELEGRAM_CHAT_ID`), non `TELEGRAM_BOT_TOKEN`.

### Testare la Configurazione

Per verificare che tutto funzioni:

1. **Test locale**:
   ```bash
   # Crea il file .env con le tue credenziali
   cp .env.example .env
   # Modifica .env con i tuoi valori reali
   # Riavvia il server di sviluppo
   npm run dev
   ```

2. **Test su Vercel**:
   - Fai il deploy su Vercel
   - Verifica che le variabili d'ambiente siano configurate
   - Esegui un check-in radar
   - Controlla che la notifica arrivi su Telegram

## File Modificati

### `services/telegramService.ts`
- ✅ Aggiornata la funzione `formatRadarActivation` per accettare parametri di localizzazione
- ✅ Aggiunto supporto per città e coordinate
- ✅ Formattazione migliorata con timestamp e durata

### `services/db.ts`
- ✅ Integrato reverse geocoding nella funzione `broadcastLocation`
- ✅ Utilizzo di OpenStreetMap Nominatim per ottenere il nome della città
- ✅ Gestione degli errori per garantire che la notifica venga inviata anche se il geocoding fallisce

## Privacy e Sicurezza

### Offuscamento Posizione
- Le coordinate vengono offuscate con un "jitter" casuale (50-200m)
- L'indirizzo esatto non viene mai condiviso
- Solo la città/zona viene mostrata nella notifica

### Rate Limiting
- OpenStreetMap Nominatim ha un limite di 1 richiesta al secondo
- Il sistema gestisce automaticamente gli errori di geocoding
- In caso di fallimento, vengono mostrate le coordinate arrotondate

## Testing

Per testare il sistema:
1. Assicurati che il bot Telegram sia configurato correttamente
2. Esegui un check-in radar dall'applicazione
3. Verifica che la notifica arrivi nel canale/gruppo Telegram
4. Controlla che tutte le informazioni siano corrette

## Troubleshooting

### La notifica non arriva
- Verifica che `TELEGRAM_BOT_TOKEN` e `TELEGRAM_CHAT_ID` siano configurati
- Controlla i log del server per errori
- Assicurati che il bot abbia i permessi di scrittura nel canale/gruppo

### La città non viene mostrata
- Il reverse geocoding potrebbe fallire per alcune coordinate
- In questo caso, vengono mostrate le coordinate arrotondate
- Controlla i log per eventuali errori di rete

### Errori di rate limiting
- OpenStreetMap Nominatim limita a 1 req/sec
- Se hai molti check-in simultanei, alcuni potrebbero fallire
- Il sistema continua comunque a inviare la notifica con le coordinate

## Miglioramenti Futuri

Possibili estensioni:
- [ ] Cache delle città per ridurre le chiamate al geocoding
- [ ] Supporto per più lingue nelle notifiche
- [ ] Statistiche aggregate giornaliere
- [ ] Notifiche per eventi speciali (es. molti check-in nella stessa zona)
- [ ] Integrazione con altri servizi di messaggistica (Discord, Slack, ecc.)
