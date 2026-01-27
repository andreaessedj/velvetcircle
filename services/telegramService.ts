
const escapeHtml = (unsafe: string) => {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
};

export const telegramService = {
    sendMessage: async (text: string, parseMode: 'HTML' | 'Markdown' = 'HTML') => {
        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        console.log(`[TelegramService] Sending notification (Env: ${isLocal ? 'Local' : 'Production'})...`);

        try {
            const response = await fetch('/api/telegram-notify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text,
                    parseMode,
                }),
            });

            if (!response.ok) {
                const err = await response.json().catch(() => ({ error: 'Invalid JSON response' }));
                console.error('[TelegramService] Proxy Error:', err);

                // Assistenza al debug: se siamo in produzione e fallisce, mostriamo un alert per capire il problema
                // if (!isLocal) {
                //      alert(`Telegram Debug: ${err.error || err.description || 'Unknown error'}`);
                // }
            } else {
                console.log('[TelegramService] Notification sent successfully');
            }
        } catch (error: any) {
            console.error('[TelegramService] Network Error:', error);
            if (isLocal) console.error(`Network Error Telegram: ${error.message}`);
        }
    },

    formatNewUser: (user: any) => {
        const roleEmoji: Record<string, string> = {
            'COUPLE': '👩‍❤️‍👨 Coppia',
            'SINGLE_MALE': '🕺 Singolo Lui',
            'SINGLE_FEMALE': '💃 Singola Lei',
            'ADMIN': '🛡️ Admin',
            'CLUB': '🏰 Club'
        };

        const role = roleEmoji[user.role as string] || user.role;

        return `<b>🆕 Nuovo Membro nel Cerchio!</b>\n\n` +
            `👤 <b>Nome:</b> ${escapeHtml(user.name)}\n` +
            `🎭 <b>Ruolo:</b> ${role}\n` +
            `📝 <b>Bio:</b> <i>"${escapeHtml(user.bio || 'Nessuna biografia')}"</i>\n\n` +
            `🔥 Benvenuto su Velvet Club!`;
    },

    formatNewClub: (club: any) => {
        const photosLink = club.photos && club.photos.length > 0
            ? `\n🖼️ <a href="${club.photos[0]}">Visualizza Foto</a>`
            : '';

        return `<b>🏰 Nuovo Club Esclusivo!</b>\n\n` +
            `📍 <b>Nome:</b> ${escapeHtml(club.name)}\n` +
            `🏢 <b>Città:</b> ${escapeHtml(club.city)}\n` +
            `🗺️ <b>Indirizzo:</b> ${escapeHtml(club.address)}\n` +
            `📞 <b>Contatti:</b> ${escapeHtml(club.phone)}\n` +
            photosLink + `\n\n` +
            `✨ Scopri i nuovi eventi in arrivo!`;
    },

    formatRadarActivation: (user: any, message: string, location?: { city?: string, lat?: number, lng?: number }) => {
        const roleEmoji: Record<string, string> = {
            'COUPLE': '👩‍❤️‍👨', 'SINGLE_MALE': '🕺', 'SINGLE_FEMALE': '💃', 'CLUB': '🏰'
        };
        const emoji = roleEmoji[user.role as string] || '👤';

        let locationInfo = '';
        if (location?.city) {
            locationInfo = `📍 <b>Zona:</b> ${escapeHtml(location.city)}\n`;
        } else if (location?.lat && location?.lng) {
            locationInfo = `📍 <b>Coordinate:</b> ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}\n`;
        }

        const timestamp = new Date().toLocaleString('it-IT', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        return `<b>📡 Radar Attivato!</b>\n\n` +
            `${emoji} <b>${escapeHtml(user.name)}</b> si è appena reso visibile sul radar.\n` +
            locationInfo +
            `💬 <i>"${escapeHtml(message)}"</i>\n` +
            `🕐 <b>Orario:</b> ${timestamp}\n` +
            `⏱️ <b>Durata:</b> 4 ore\n\n` +
            `🚀 Controlla chi c'è intorno a te su Velvet Radar!`;
    },

    formatConfession: (confession: string) => {
        return `<b>🕯️ Sussurri dal Confessionale</b>\n\n` +
            `<i>"${escapeHtml(confession)}"</i>\n\n` +
            `🗝️ Lascia il tuo segreto nell'ombra...`;
    }
};
