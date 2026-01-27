// api/telegram-notify.js
export default async function handler(req, res) {
    // CORS (utile se chiami da browser)
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") return res.status(204).end();
    if (req.method !== "POST") {
        return res.status(405).json({ ok: false, error: "Method not allowed" });
    }

    try {
        const token = process.env.TELEGRAM_TOKEN;
        const chatId = process.env.TELEGRAM_CHAT_ID;

        if (!token) return res.status(500).json({ ok: false, error: "Missing TELEGRAM_TOKEN" });
        if (!chatId) return res.status(500).json({ ok: false, error: "Missing TELEGRAM_CHAT_ID" });

        // Body parsing robusto (Vercel a volte passa string)
        const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
        const text = (body.text ?? body.message ?? "").toString().trim();

        if (!text) {
            return res.status(400).json({ ok: false, error: "Missing 'text' in JSON body" });
        }

        const apiUrl = `https://api.telegram.org/bot${token}/sendMessage`;

        const tgResp = await fetch(apiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                chat_id: chatId,
                text,
                parse_mode: "HTML",
                disable_web_page_preview: true
            })
        });

        const tgJson = await tgResp.json().catch(() => null);

        if (!tgResp.ok || !tgJson?.ok) {
            return res.status(500).json({
                ok: false,
                error: "Telegram API error",
                status: tgResp.status,
                telegram: tgJson
            });
        }

        return res.status(200).json({
            ok: true,
            sent: true,
            telegram: tgJson.result
        });
    } catch (err) {
        return res.status(500).json({
            ok: false,
            error: err?.message || "Unhandled error"
        });
    }
}
