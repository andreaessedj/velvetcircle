
import { GoogleGenAI, Type } from "@google/genai";
import { User, AiMessage } from "../types";

// Funzione interna per ottenere l'istanza dell'IA in modo sicuro
const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("ERRORE: API_KEY non trovata in process.env");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

// 1. Kink Explorer (Scenario Generator)
export const generateScenario = async (desire: string, intensity: string): Promise<string> => {
  try {
    const ai = getAiClient();
    if (!ai) throw new Error("API Key missing");

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Genera uno scenario seducente e di classe (non volgare, ma esplicito nelle intenzioni) per una coppia o un gruppo che vuole esplorare questa fantasia.
      Fantasia: ${desire}
      Intensità: ${intensity}
      
      Rispondi in italiano con un breve paragrafo narrativo (max 50 parole) che imposti l'atmosfera.`,
    });
    return response.text || "Lasciate che l'immaginazione guidi i vostri corpi stasera...";
  } catch (error) {
    return "Immaginate una stanza a luci soffuse... (Servizio AI non disponibile)";
  }
};

// 2. Compatibility Analysis
export const analyzeLibertineMatch = async (user1Bio: string, user1Desires: string[], user2Bio: string, user2Desires: string[]): Promise<{ score: number; advice: string }> => {
  try {
    const ai = getAiClient();
    if (!ai) throw new Error("API Key missing");

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Analizza la compatibilità per un incontro in un club per adulti.
      Profilo A (Bio): ${user1Bio}, Desideri: ${user1Desires.join(', ')}
      Profilo B (Bio): ${user2Bio}, Desideri: ${user2Desires.join(', ')}
      
      Restituisci un JSON con:
      - score: numero 0-100
      - advice: consiglio seducente su come rompere il ghiaccio in italiano.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.OBJECT,
            properties: {
                score: { type: Type.INTEGER },
                advice: { type: Type.STRING }
            }
        }
      }
    });
    
    const result = JSON.parse(response.text || '{}');
    return {
        score: result.score || 69,
        advice: result.advice || "Un drink offerto e uno sguardo intenso sono il miglior inizio."
    };
  } catch (error) {
    return { score: 75, advice: "Le vostre energie sembrano allinearsi." };
  }
};

// 3. AI Concierge
export const getConciergeResponse = async (history: string[]): Promise<string> => {
    try {
        const ai = getAiClient();
        if (!ai) return "";

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Sei "Madame V", concierge di un club per scambisti.
            Ultimi messaggi: ${history.join('\n')}
            Intervieni brevemente (max 15 parole) per mantenere l'atmosfera o suggerire un drink. In italiano.`,
        });
        return response.text || "";
    } catch (e) {
        return "";
    }
}

// 4. THE ORACLE
export const getOraclePrediction = async (currentUser: User, candidates: User[]): Promise<{ bestMatchId: string; reasoning: string } | null> => {
    try {
        const ai = getAiClient();
        if (!ai || candidates.length === 0) return null;

        const candidatesShort = candidates.map(c => ({
            id: c.id,
            role: c.role,
            desires: c.desires.join(', '),
            bio: c.bio.substring(0, 100)
        }));

        const prompt = `Scegli UN partner ideale tra i candidati.
        UTENTE: ${currentUser.role}, ${currentUser.desires.join(', ')}, ${currentUser.bio}
        CANDIDATI: ${JSON.stringify(candidatesShort)}
        JSON: { "bestMatchId": "id", "reasoning": "frase mistica e seducente" }`;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });

        const result = JSON.parse(response.text || '{}');
        return result;
    } catch (e) {
        return null;
    }
}

// 5. VIRTUAL COMPANION CHAT
export const sendCompanionMessage = async (history: AiMessage[], newMessage: string, companionId: string, userName: string): Promise<string> => {
    try {
        const ai = getAiClient();
        if (!ai) return "Mi dispiace, sono un po' distratta.";

        let systemInstruction = companionId === 'ISABELLA' 
            ? `Sei Isabella, donna di 30 anni del Velvet Circle. Seducente, intelligente, classe. Bisessuale. Rispondi in italiano brevemente (max 2 frasi).`
            : `Sei Gabriel, uomo di 35 anni VIP. Carismatico, dominante, sicuro. Rispondi in italiano brevemente (max 2 frasi).`;

        const chat = ai.chats.create({
            model: 'gemini-3-flash-preview',
            history: history.map(h => ({ role: h.role, parts: [{ text: h.content }] })),
            config: { systemInstruction, temperature: 0.9 }
        });

        const response = await chat.sendMessage({ message: newMessage });
        return response.text || "...";
    } catch (e) {
        return "Scusami, ho perso il filo...";
    }
}
