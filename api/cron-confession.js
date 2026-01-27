
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    const supabaseUrl = 'https://rnjhhnawclknfxxbjdwa.supabase.co';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
    const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

    // Authorization check for Production
    // Allow manual testing via ?simulate=true

    // Robust way to get query params in case req.query is missing/different
    const fakeBase = `http://${req.headers.host || 'localhost'}`;
    const url = new URL(req.url, fakeBase);
    const isSimulate = url.searchParams.get('simulate') === 'true';

    if (!isSimulate) {
        // Only enforce if CRON_SECRET is set in environment variables
        // AND we are in production
        if (process.env.CRON_SECRET && process.env.NODE_ENV === 'production') {
            const authHeader = req.headers['authorization'];
            if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
                console.error('Unauthorized Cron Attempt. Debug:', {
                    url: req.url,
                    parsedSimulate: isSimulate,
                    hasSecret: !!process.env.CRON_SECRET,
                    env: process.env.NODE_ENV
                });
                return res.status(401).json({
                    error: 'Unauthorized',
                    message: 'Add ?simulate=true to the URL to test manually.',
                    debug: {
                        receivedUrl: req.url,
                        parsedQuerySimulate: url.searchParams.get('simulate'),
                        env: process.env.NODE_ENV,
                        hasSecret: !!process.env.CRON_SECRET
                    }
                });
            }
        }
    }

    if (!supabaseKey || !TELEGRAM_TOKEN || !TELEGRAM_CHAT_ID) {
        return res.status(500).json({ error: 'Missing environment variables' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Helper to escape HTML characters
    const escapeHtml = (unsafe) => {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    };

    try {
        console.log('Fetching confessions from Supabase...');
        // 1. Fetch all confessions
        const { data: confessions, error } = await supabase
            .from('confessions')
            .select('content')
            .limit(100);

        console.log('Supabase response:', { error, count: confessions?.length });

        if (error || !confessions || confessions.length === 0) {
            return res.status(200).json({ status: 'no_confessions_found' });
        }

        // 2. Pick a random one
        const randomConfession = confessions[Math.floor(Math.random() * confessions.length)];
        console.log('Selected confession:', randomConfession.content.substring(0, 20) + '...');

        // 3. Send to Telegram
        const text = `<b>🕯️ Sussurri dal Confessionale</b>\n\n<i>"${escapeHtml(randomConfession.content)}"</i>\n\n🗝️ Lascia il tuo segreto nell'ombra...`;

        console.log('Sending to Telegram...');
        const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: TELEGRAM_CHAT_ID,
                text,
                parse_mode: 'HTML',
                disable_web_page_preview: true
            }),
        });

        const tgData = await response.json();
        console.log("Cron Confession Result:", tgData);

        return res.status(200).json({
            success: true,
            confession: randomConfession.content,
            telegramResponse: tgData
        });
    } catch (error) {
        console.error('Cron Error:', error);
        return res.status(500).json({ error: error.message });
    }
}
