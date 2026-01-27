import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
// Aumentiamo il limite del body per sicurezza, ed gestiamo errori di parsing JSON
app.use(express.json({ limit: '10mb' }));
app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        console.error('Bad JSON');
        return res.status(400).send({ error: 'Invalid JSON body' });
    }
    next();
});

// Helper to log requests
app.use((req, res, next) => {
    console.log(`[LocalAPI] ${req.method} ${req.url}`);
    if (req.method === 'POST') {
        // Log brief body info for debugging
        try {
            const bodyPreview = JSON.stringify(req.body).substring(0, 100);
            console.log(`[LocalAPI] Body preview: ${bodyPreview}...`);
        } catch (e) { }
    }
    next();
});

// Check Environment Variables
if (!process.env.TELEGRAM_TOKEN) {
    console.warn("⚠️ WARNING: TELEGRAM_TOKEN is missing in .env file");
}
if (!process.env.TELEGRAM_CHAT_ID) {
    console.warn("⚠️ WARNING: TELEGRAM_CHAT_ID is missing in .env file");
}

const timestamp = () => new Date().toISOString().split('T')[1].split('.')[0];

// Wrapper for Vercel/Next.js style handlers to Express
const adaptHandler = (handler) => async (req, res) => {
    try {
        // Express req/res are compatible enough with Vercel/Next API routes
        // but we ensure status() and json() work as expected.
        await handler(req, res);
    } catch (error) {
        console.error(`[${timestamp()}] API Handler Error:`, error);
        if (!res.headersSent) {
            res.status(500).json({ error: error.message || 'Internal Server Error' });
        }
    }
};

// --- ROUTES ---

// 1. Telegram Notification
import telegramNotify from './api/telegram-notify.js';
app.all('/api/telegram-notify', adaptHandler(telegramNotify));

// 2. Delete User
import deleteUser from './api/delete-user.js';
app.all('/api/delete-user', adaptHandler(deleteUser));

// 3. Contact Form
import contact from './api/contact.js';
app.all('/api/contact', adaptHandler(contact));

// 4. Send Email
import sendEmail from './api/send-email.js';
app.all('/api/send-email', adaptHandler(sendEmail));

// 5. Kofi Webhook (simulate)
import kofiWebhook from './api/kofi-webhook.js';
app.all('/api/kofi-webhook', adaptHandler(kofiWebhook));

// 6. Request Payout
import requestPayout from './api/request-payout.js';
app.all('/api/request-payout', adaptHandler(requestPayout));

// 7. Cron Confession (Manual trigger)
import cronConfession from './api/cron-confession.js';
app.all('/api/cron-confession', adaptHandler(cronConfession));


// Start Server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`
🚀 Local API Server running at http://localhost:${PORT}
📡 Proxy target for Vite is ready.
🔑 Telegram Token: ${process.env.TELEGRAM_TOKEN ? 'Loaded ✅' : 'Missing ❌'}
🆔 Telegram Chat ID: ${process.env.TELEGRAM_CHAT_ID ? 'Loaded ✅' : 'Missing ❌'}

Available Endpoints:
  - POST /api/telegram-notify
  - POST /api/delete-user
  - POST /api/contact
  - POST /api/send-email
  - POST /api/request-payout
  - POST /api/kofi-webhook
    `);
});
