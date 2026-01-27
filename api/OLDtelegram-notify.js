
import https from 'https';

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

function setCors(res) {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );
}

function safeJsonParse(maybeString) {
    if (!maybeString) return null;
    if (typeof maybeString === 'object') return maybeString;
    try {
        return JSON.parse(maybeString);
    } catch {
        return null;
    }
}

export default async function handler(req, res) {
    setCors(res);

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Vercel Serverless Functions usually parse JSON automatically for "application/json" content-type
    // but sometimes req.body needs manual parsing if sent slightly differently.
    const rawBody = req.body;
    console.log('[TelegramNotify] Incoming Body Type:', typeof rawBody);

    let body = rawBody;
    if (typeof rawBody === 'string') {
        body = safeJsonParse(rawBody) ?? {};
    } else if (!rawBody) {
        body = {};
    }

    const { text, parseMode = 'HTML' } = body;

    if (!text) {
        console.error('[TelegramNotify] Missing text parameter. Body received:', JSON.stringify(body));
        return res.status(400).json({ error: 'Missing text parameter', receivedBody: body });
    }

    if (!TELEGRAM_TOKEN || !TELEGRAM_CHAT_ID) {
        console.error('Telegram Credentials Missing:', { TELEGRAM_TOKEN: !!TELEGRAM_TOKEN, TELEGRAM_CHAT_ID: !!TELEGRAM_CHAT_ID });
        return res.status(500).json({
            error: 'Telegram credentials not configured on server',
            details: 'Assicurati di aver impostato TELEGRAM_TOKEN e TELEGRAM_CHAT_ID nelle Environment Variables di Vercel.'
        });
    }

    try {
        const postData = JSON.stringify({
            chat_id: TELEGRAM_CHAT_ID,
            text,
            parse_mode: parseMode,
        });

        const options = {
            hostname: 'api.telegram.org',
            port: 443,
            path: `/bot${TELEGRAM_TOKEN}/sendMessage`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData),
            },
        };

        const tgResponse = await new Promise((resolve, reject) => {
            const tgReq = https.request(options, (tgRes) => {
                let responseBody = '';
                tgRes.on('data', (chunk) => { responseBody += chunk; });
                tgRes.on('end', () => {
                    try {
                        resolve({
                            statusCode: tgRes.statusCode,
                            body: JSON.parse(responseBody)
                        });
                    } catch (e) {
                        resolve({
                            statusCode: tgRes.statusCode,
                            body: responseBody
                        });
                    }
                });
            });

            tgReq.on('error', (e) => { reject(e); });
            tgReq.write(postData);
            tgReq.end();
        });

        if (tgResponse.statusCode !== 200) {
            console.error('Telegram API Error Response:', tgResponse.body);
            return res.status(tgResponse.statusCode).json(tgResponse.body);
        }

        return res.status(200).json(tgResponse.body);
    } catch (error) {
        console.error('Telegram Proxy Exception:', error);
        return res.status(500).json({ error: error.message });
    }
}
