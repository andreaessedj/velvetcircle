import { createClient } from "@supabase/supabase-js";

async function readRawBody(req) {
  if (typeof req.body === "string") return req.body;
  if (Buffer.isBuffer(req.body)) return req.body.toString("utf8");
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

function tryParseJson(str) {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

function extractPayloadFromDataField(dataStr) {
  if (!dataStr || typeof dataStr !== "string") return null;

  // JSON diretto
  let obj = tryParseJson(dataStr);
  if (obj && obj.verification_token) return obj;

  // URL-encoded
  try {
    const decoded = decodeURIComponent(dataStr);
    obj = tryParseJson(decoded);
    if (obj && obj.verification_token) return obj;
  } catch {
    // ignore
  }

  return null;
}

function parseKofiPayload(req, rawBody) {
  // Caso comune: req.body = { data: "..." }
  if (req.body && typeof req.body === "object" && typeof req.body.data === "string") {
    return extractPayloadFromDataField(req.body.data);
  }

  // raw form-urlencoded
  if (typeof rawBody === "string") {
    const params = new URLSearchParams(rawBody);
    const dataStr = params.get("data");
    if (dataStr) return extractPayloadFromDataField(dataStr);
  }

  // raw JSON
  if (typeof rawBody === "string" && rawBody.trim().startsWith("{")) {
    const parsed = tryParseJson(rawBody);
    if (!parsed) return null;
    if (parsed.verification_token) return parsed;
    if (typeof parsed.data === "string") return extractPayloadFromDataField(parsed.data);
  }

  return null;
}

function hasItemCode(payload, code) {
  if (!code) return false;
  const items = payload?.shop_items;
  if (!Array.isArray(items)) return false;
  return items.some((it) => it?.direct_link_code === code);
}

function getShopItemCodes(payload) {
  const items = payload?.shop_items;
  if (!Array.isArray(items)) return [];
  return items.map((it) => it?.direct_link_code).filter(Boolean);
}

// Prova a leggere amount da molti campi Ko-fi possibili
function extractAmount(payload) {
  const candidates = [
    payload?.amount,
    payload?.total_amount,
    payload?.amount_paid,
    payload?.gross,
    payload?.net,
    payload?.shop_order_total,
    payload?.shop_total,
  ].filter((v) => v !== undefined && v !== null);

  for (const c of candidates) {
    const num = parseFloat(String(c).replace(",", ".").replace(/[^0-9.]/g, ""));
    if (!Number.isNaN(num) && Number.isFinite(num)) return num;
  }
  return null;
}

// Mappa pacchetti crediti: JSON in env, es:
// {"f4ec730844":500,"abcd123456":1200}
function parseCreditsPackMap() {
  const fallback = {
    "f4ec730844": 10,
    "fa098d3767": 50
  };

  const raw = process.env.CREDITS_PACK_MAP;
  if (!raw) return fallback;

  try {
    const obj = JSON.parse(raw);
    if (obj && typeof obj === "object") {
      return { ...fallback, ...obj };
    }
  } catch (e) {
    console.error("Error parsing CREDITS_PACK_MAP:", e);
  }
  return fallback;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

  try {
    const KOFI_VERIFICATION_TOKEN = process.env.KOFI_VERIFICATION_TOKEN;
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const CREDIT_ITEM_CODE = process.env.KOFI_CREDITS_ITEM_CODE || "";
    const VIP_ITEM_CODE = process.env.KOFI_VIP_ITEM_CODE || "";
    const CREDITS_PER_EUR = parseInt(process.env.CREDITS_PER_EUR || "100", 10);
    const VIP_DAYS = parseInt(process.env.VIP_DAYS || "30", 10);

    if (!KOFI_VERIFICATION_TOKEN || !supabaseUrl || !supabaseServiceKey) {
      console.error(
        "Missing env vars (KOFI_VERIFICATION_TOKEN / SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)"
      );
      return res.status(500).send("Server Config Error");
    }

    const rawBody = await readRawBody(req);

    console.log("Incoming content-type:", req.headers["content-type"]);
    console.log(
      "req.body keys:",
      req.body && typeof req.body === "object" ? Object.keys(req.body) : "n/a"
    );

    const payload = parseKofiPayload(req, rawBody);
    if (!payload) {
      console.error("Bad Ko-fi payload parse");
      return res.status(400).send("Bad payload");
    }

    console.log("Ko-fi payload type:", payload.type);
    console.log("Ko-fi has token:", Boolean(payload.verification_token));

    if (payload.verification_token !== KOFI_VERIFICATION_TOKEN) {
      console.error("Invalid verification_token:", payload.verification_token);
      return res.status(403).send("Forbidden");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payerEmail = payload.email ? String(payload.email).trim() : null;
    if (!payerEmail) return res.status(200).send("OK");

    const { data: userProfile, error: searchError } = await supabase
      .from("profiles")
      .select("id, vip_until, credits")
      .ilike("email", payerEmail)
      .maybeSingle();

    if (searchError) {
      console.error("DB search error:", searchError);
      return res.status(500).send("DB Search Error");
    }
    if (!userProfile) {
      console.error("User not found for email:", payerEmail);
      return res.status(200).send("OK");
    }

    const type = String(payload.type || "");
    const itemCodes = getShopItemCodes(payload).map(c => c.trim().toLowerCase());

    console.log("Shop item codes (normalized):", itemCodes);

    // --- CREDITI ---
    const creditsPackMap = parseCreditsPackMap();

    // Codici forzati (hardcoded per sicurezza)
    const CODE_10 = "f4ec730844";
    const CODE_50 = "fa098d3767";

    // Verifichiamo se l'item code corrisponde ESPLICITAMENTE a un pacchetto crediti
    // Usiamo una ricerca flessibile (case-insensitive)
    const matchedCode = itemCodes.find(code =>
      code === CODE_10.toLowerCase() ||
      code === CODE_50.toLowerCase() ||
      (creditsPackMap && creditsPackMap[code] != null)
    );

    const isCreditsPurchase =
      (CREDIT_ITEM_CODE && itemCodes.includes(CREDIT_ITEM_CODE.toLowerCase())) ||
      matchedCode != null;

    if (isCreditsPurchase) {
      let creditsToAdd = 0;

      // 1) Se il codice è uno di quelli forzati, usiamo il valore fisso (metodo più sicuro)
      if (matchedCode === CODE_10.toLowerCase()) creditsToAdd = 10;
      else if (matchedCode === CODE_50.toLowerCase()) creditsToAdd = 50;

      // 2) Altrimenti usiamo la mappa se esiste
      if (creditsToAdd === 0 && creditsPackMap && matchedCode) {
        creditsToAdd = Number(creditsPackMap[matchedCode]) || 0;
      }

      // 2) fallback: conversione da amount
      if (creditsToAdd === 0) {
        const amount = extractAmount(payload);
        console.log("Extracted amount for credits:", amount);
        if (amount != null) {
          creditsToAdd = Math.max(0, Math.floor(amount * CREDITS_PER_EUR));
        }
      }

      // ✅ MODIFICA: currentCredits robusto (evita NaN / stringhe strane / null)
      const parsedCurrent = Number(userProfile.credits);
      const currentCredits = Number.isFinite(parsedCurrent) ? parsedCurrent : 0;

      const newCredits = currentCredits + creditsToAdd;

      // ✅ MODIFICA: guardia contro valori non validi
      if (!Number.isFinite(newCredits)) {
        console.error("newCredits is not finite:", {
          currentCredits,
          creditsToAdd,
          newCredits,
          rawCredits: userProfile.credits,
        });
        return res.status(500).send("Bad credits math");
      }

      console.log(`Credits calc: current=${currentCredits} add=${creditsToAdd} new=${newCredits}`);

      const { data: updated, error: creditError } = await supabase
        .from("profiles")
        .update({ credits: newCredits })
        .eq("id", userProfile.id)
        .select("credits")
        .maybeSingle();

      if (creditError) {
        console.error("Credit update error:", creditError);
        return res.status(500).send("DB Credit Update Error");
      }

      console.log("Credits after update (DB):", updated?.credits);
      return res.status(200).send("OK");
    }

    // --- VIP ---
    const isVipShopPurchase = VIP_ITEM_CODE ? hasItemCode(payload, VIP_ITEM_CODE) : false;
    const isVipByType =
      type.toLowerCase().includes("subscription") || type.toLowerCase().includes("donation");

    if (isVipShopPurchase || isVipByType) {
      const now = new Date();
      const addMs = VIP_DAYS * 24 * 60 * 60 * 1000;

      let newExpiry = new Date(now.getTime() + addMs);

      if (userProfile.vip_until) {
        const currentExpiry = new Date(userProfile.vip_until);
        if (!Number.isNaN(currentExpiry.getTime()) && currentExpiry > now) {
          newExpiry = new Date(currentExpiry.getTime() + addMs);
        }
      }

      const isoDate = newExpiry.toISOString();

      const { error: vipError } = await supabase
        .from("profiles")
        .update({ is_vip: true, vip_until: isoDate })
        .eq("id", userProfile.id);

      if (vipError) {
        console.error("VIP update error:", vipError);
        return res.status(500).send("DB VIP Update Error");
      }

      console.log(`VIP updated for ${userProfile.id}: vip_until=${isoDate}`);
      return res.status(200).send("OK");
    }

    if (type === "Shop Order") {
      console.warn("Shop Order received but no recognized item codes.");
      return res.status(200).send("OK");
    }

    console.warn("Unhandled Ko-fi payload type:", payload.type);
    return res.status(200).send("OK");
  } catch (err) {
    console.error("Webhook fatal error:", err);
    return res.status(500).send("Internal Error");
  }
}
