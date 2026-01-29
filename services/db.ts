

import {
  User,
  UserRole,
  Event,
  Confession,
  RadarSignal,
  PrivateMessage,
  ChatMessage,
  VaultAccess,
  InboxConversation,
  Visitor,
  DailyMatch,
  InviteCode,
  AiMessage,
  VaultItem,
  ClubProfile,
  ClubEvent
} from "../types";
import { supabase } from "../lib/supabase";
import { telegramService } from "./telegramService";
import { RealtimeChannel } from "@supabase/supabase-js";
import { getOraclePrediction } from "./geminiService";

const MASTER_ADMIN_EMAIL = "andreaesse@live.it";

// Helper per verificare se un ruolo è ADMIN in modo robusto (case-insensitive)
const isAdmin = (role: string | undefined | null, email?: string): boolean => {
  if (email?.toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase()) return true;
  if (!role) return false;
  const normalized = role.trim().toUpperCase();
  return normalized === "ADMIN";
};

/**
 * Funzione CRITICA: Controlla se il VIP o il Boost sono scaduti e aggiorna il database.
 * Viene chiamata durante il caricamento della sessione utente.
 */
const syncProfileStatus = async (profile: any) => {
  const now = new Date();
  const updates: any = {};
  let needsUpdate = false;

  // 1. Controllo Scadenza VIP
  if (profile.is_vip && profile.vip_until) {
    const vipDate = new Date(profile.vip_until);
    if (vipDate < now) {
      updates.is_vip = false;
      needsUpdate = true;
      console.log(`[StatusSync] VIP scaduto per ${profile.id}. Ripristino stato normale.`);
    }
  }

  if (needsUpdate) {
    await supabase
      .from("profiles")
      .update(updates)
      .eq("id", profile.id);

    return { ...profile, ...updates };
  }

  return profile;
};

// Helper function to handle profile auto-creation if missing
const ensureProfileExists = async (userId: string, initialData?: { bio?: string, desires?: string[], limits?: string[] }) => {
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Utente non autenticato.");

  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id, role, email, is_vip, vip_until")
    .eq("id", userId)
    .single();

  const meta = user.user_metadata;
  const name = meta?.name || "Membro";
  const email = user.email || "";

  // Auto-promote master admin
  const isMaster = email.toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase();
  const role = isMaster ? UserRole.ADMIN : meta?.role || UserRole.COUPLE;
  const avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(
    name
  )}&background=333&color=fff`;

  if (!existingProfile) {
    const { error } = await supabase.from("profiles").upsert([
      {
        id: userId,
        email: email,
        name: name,
        role: role,
        avatar: avatar,
        bio: initialData?.bio || "",
        desires: initialData?.desires || [],
        limits: initialData?.limits || [],
        is_verified: isMaster,
        is_vip: isMaster,
        credits: isMaster ? 9999 : 0
      }
    ]);
    if (error) console.error("Failed to create profile:", error);
  } else {
    if (isMaster && existingProfile.role !== UserRole.ADMIN) {
      await supabase
        .from("profiles")
        .update({ role: UserRole.ADMIN, is_verified: true, is_vip: true })
        .eq("id", userId);
    }
    await syncProfileStatus(existingProfile);
  }
};

// Helper to normalize legacy gallery strings to VaultItem objects
const normalizeGallery = (galleryData: any[]): VaultItem[] => {
  if (!Array.isArray(galleryData)) return [];

  return galleryData
    .filter((item) => item !== null && item !== undefined && item !== "")
    .map((item, index): VaultItem | null => {
      // Case 1: Item is a plain string URL
      if (typeof item === "string") {
        // Check if it's a stringified JSON object (corrupted data)
        if (item.startsWith('{') && item.includes('"url"')) {
          try {
            const parsed = JSON.parse(item);
            return {
              id: parsed.id || `recovered-${index}-${Date.now()}`,
              url: parsed.url || "",
              price: typeof parsed.price === "number" ? parsed.price : 0,
              uploadedAt: parsed.uploadedAt || new Date().toISOString(),
              type: parsed.type || 'IMAGE'
            };
          } catch (e) {
            console.warn("Failed to parse corrupted gallery item:", item);
            return null;
          }
        }
        // Normal string URL (legacy format)
        return {
          id: `legacy-${index}-${Date.now()}`,
          url: item,
          price: 0,
          uploadedAt: new Date().toISOString(),
          type: 'IMAGE'
        };
      }

      // Case 2: Item is already a proper object
      return {
        id: item.id || `restored-${index}-${Date.now()}`,
        url: item.url || "",
        price: typeof item.price === "number" ? item.price : 0,
        uploadedAt: item.uploadedAt || new Date().toISOString(),
        type: item.type || 'IMAGE'
      };
    })
    .filter((item: VaultItem | null): item is VaultItem => {
      if (!item) return false;
      // Validate URL is actually a URL and not a JSON string
      const url = item.url;
      if (!url || url.length < 5) return false;
      if (url.startsWith('{')) return false; // Skip JSON objects
      return true;
    });
};

// --- PRIVACY HELPER: GEO-JITTERING ---
const applyGeoJitter = (lat: number, lng: number) => {
  const minOffset = 0.00045;
  const maxOffset = 0.0018;
  const getOffset = () => {
    const val = Math.random() * (maxOffset - minOffset) + minOffset;
    return Math.random() > 0.5 ? val : -val;
  };
  return { lat: lat + getOffset(), lng: lng + getOffset() };
};

export const api = {
  // --- VISITOR COUNTING ---
  recordSiteVisit: async (): Promise<void> => {
    try {
      await supabase.rpc('increment_visit_count');
    } catch (e) {
      console.warn("Visit counter failed - make sure to run the SQL migration", e);
    }
  },

  getSiteStats: async (): Promise<number> => {
    try {
      const { data, error } = await supabase
        .from('site_stats')
        .select('value')
        .eq('key', 'total_visits')
        .single();

      if (error) throw error;
      return Number(data?.value || 0);
    } catch (e) {
      console.error("Error fetching site stats:", e);
      return 0;
    }
  },

  // Auth: Login
  login: async (email: string, password: string): Promise<User> => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    if (error) throw error;
    if (!data.user) throw new Error("Utente non trovato.");

    await ensureProfileExists(data.user.id);

    let { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", data.user.id)
      .single();

    profile = await syncProfileStatus(profile);

    return {
      id: profile.id,
      name: profile.name,
      email: profile.email,
      avatar:
        profile.avatar ||
        "https://ui-avatars.com/api/?name=User&background=333&color=fff",
      role: profile.role as UserRole,
      bio: profile.bio || "",
      desires: profile.desires || [],
      limits: profile.limits || [],
      isVerified: profile.is_verified || false,
      isVip: profile.is_vip || false,
      vipUntil: profile.vip_until,
      boostUntil: profile.boost_until,
      location: profile.location,
      gallery: normalizeGallery(profile.gallery),
      unlockedMedia: profile.unlocked_media || [],
      trustScore: 0,
      credits: profile.credits || 0
    };
  },

  // Auth: Register
  register: async (
    data: Partial<User> & { password?: string; inviteCode?: string }
  ): Promise<User> => {
    if (!data.email || !data.password)
      throw new Error("Email e password richiesti");

    // Enforce mandatory fields for non-club users
    if (data.role !== UserRole.CLUB) {
      if (!data.bio || data.bio.trim().length < 5)
        throw new Error("La biografia è obbligatoria (min. 5 caratteri).");
      if (!data.desires || data.desires.length === 0)
        throw new Error("Seleziona almeno un'opzione in 'Cosa cercate'.");
      if (!data.limits || data.limits.length === 0)
        throw new Error("Seleziona almeno un'opzione in 'I vostri limiti'.");
    }

    // 1. Validazione Codice Invito Preventiva
    let validInviteCode = null;
    if (data.inviteCode) {
      const { data: codeData, error: codeError } = await supabase
        .from("invite_codes")
        .select("*")
        .eq("code", data.inviteCode)
        .eq("is_used", false)
        .single();

      if (codeError || !codeData) throw new Error("Codice invito non valido o già utilizzato.");
      validInviteCode = codeData;
    }

    // 2. Creazione Account Auth
    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: { data: { name: data.name, role: data.role } }
    });

    if (error) throw error;
    if (!authData?.user) throw new Error("Registrazione fallita.");

    const userId = authData.user.id;

    // 3. Creazione Profilo Base con dati iniziali se forniti
    await ensureProfileExists(userId, {
      bio: data.bio,
      desires: data.desires,
      limits: data.limits
    });

    // 4. Applicazione Privilegi VIP se codice presente
    if (validInviteCode) {
      const now = new Date();
      const vipExpiry = new Date(now.getTime() + (3 * 24 * 60 * 60 * 1000)); // +3 Giorni

      // Aggiorna profilo utente
      await supabase
        .from("profiles")
        .update({
          is_vip: true,
          vip_until: vipExpiry.toISOString(),
          is_verified: true // Opzionale: verifichiamo anche l'utente che usa un invito
        })
        .eq("id", userId);

      // Segna il codice come utilizzato
      await supabase
        .from("invite_codes")
        .update({ is_used: true })
        .eq("code", data.inviteCode);

      console.log(`[Registration] 3 Days VIP granted to ${userId} via code ${data.inviteCode}`);
    }

    // Notify Telegram
    if (data.role !== UserRole.CLUB) {
      telegramService.sendMessage(telegramService.formatNewUser({
        name: data.name,
        role: data.role,
        bio: data.bio
      }));
    }

    return (await api.getSessionUser()) as User;
  },

  logout: async () => {
    await supabase.auth.signOut();
  },

  forgotPassword: async (email: string): Promise<void> => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
  },

  deleteAccount: async (): Promise<void> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Not authenticated");

    const response = await fetch('/api/delete-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      }
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Account deletion failed');
    }

    // Effettua il logout locale dopo la cancellazione server-side
    await supabase.auth.signOut();
  },

  getSessionUser: async (): Promise<User | null> => {
    const {
      data: { session }
    } = await supabase.auth.getSession();
    if (!session?.user) return null;

    await ensureProfileExists(session.user.id);

    let { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .single();

    if (!profile || profile.is_banned) {
      if (profile?.is_banned) await supabase.auth.signOut();
      return null;
    }

    profile = await syncProfileStatus(profile);

    return {
      id: profile.id,
      name: profile.name,
      email: profile.email,
      avatar: profile.avatar,
      role: profile.role as UserRole,
      bio: profile.bio || "",
      desires: profile.desires || [],
      limits: profile.limits || [],
      isVerified: profile.is_verified || false,
      isVip: profile.is_vip || false,
      vipUntil: profile.vip_until,
      boostUntil: profile.boost_until,
      location: profile.location,
      gallery: normalizeGallery(profile.gallery),
      unlockedMedia: profile.unlocked_media || [],
      trustScore: 0,
      credits: profile.credits || 0
    };
  },

  getUsers: async (includeBanned = false): Promise<User[]> => {
    let query = supabase
      .from("profiles")
      .select("*, trust_endorsements!target_id(count)");

    if (!includeBanned) {
      query = query.eq("is_banned", false);
    }

    const { data, error } = await query;

    if (error) return [];

    const now = new Date();

    return data.map((profile: any) => {
      let isVipActive = profile.is_vip;
      if (isVipActive && profile.vip_until) {
        if (new Date(profile.vip_until) < now) isVipActive = false;
      }

      return {
        id: profile.id,
        name: profile.name,
        email: profile.email,
        role: profile.role as UserRole,
        bio: profile.bio || "",
        desires: profile.desires || [],
        limits: profile.limits || [],
        avatar: profile.avatar,
        isVerified: profile.is_verified || false,
        isVip: isVipActive,
        vipUntil: profile.vip_until,
        boostUntil: profile.boost_until,
        location: profile.location,
        gallery: normalizeGallery(profile.gallery),
        unlockedMedia: profile.unlocked_media || [],
        trustScore: profile.trust_endorsements
          ? profile.trust_endorsements[0].count
          : 0,
        credits: profile.credits || 0,
        is_banned: profile.is_banned || false,
        ban_reason: profile.ban_reason || null,
        createdAt: profile.created_at
      };
    });
  },

  getMemberCount: async (): Promise<number> => {
    const { count, error } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true });
    return error ? 0 : count || 0;
  },

  getEvents: async (): Promise<Event[]> => {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) return [];
    return data.map((e: any) => ({
      id: e.id,
      title: e.title,
      date: e.date,
      location: e.location,
      image: e.image,
      attendees: e.attendees,
      type: e.type,
      price: e.price,
      description: e.description
    }));
  },

  updateProfile: async (userId: string, data: Partial<User>): Promise<User> => {
    const updateData: any = {};
    if (data.bio !== undefined) updateData.bio = data.bio;
    if (data.desires !== undefined) updateData.desires = data.desires;
    if (data.limits !== undefined) updateData.limits = data.limits;
    if (data.avatar !== undefined) updateData.avatar = data.avatar;
    if (data.gallery !== undefined) updateData.gallery = data.gallery;
    if (data.unlockedMedia !== undefined)
      updateData.unlocked_media = data.unlockedMedia;

    const { error } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("id", userId);
    if (error) throw error;
    return { id: userId, ...data } as User;
  },

  adminUpdateProfile: async (
    userId: string,
    data: Partial<User>
  ): Promise<void> => {
    const updateData: any = {};
    if (data.isVerified !== undefined) updateData.is_verified = data.isVerified;
    if (data.isVip !== undefined) {
      updateData.is_vip = data.isVip;
      if (data.isVip) {
        // Set VIP for 1 year if not specified
        const expiry = new Date();
        expiry.setFullYear(expiry.getFullYear() + 1);
        updateData.vip_until = expiry.toISOString();
      } else {
        updateData.vip_until = null;
      }
    }
    if (data.credits !== undefined) updateData.credits = data.credits;
    if (data.role !== undefined) updateData.role = data.role;
    if (data.name !== undefined) updateData.name = data.name;
    if (data.email !== undefined) updateData.email = data.email;

    const { error } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("id", userId);
    if (error) throw error;
  },

  spendCredits: async (amount: number): Promise<boolean> => {
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) return false;

    const { data: profile } = await supabase.from('profiles').select('role, email').eq('id', user.id).single();
    if (profile && isAdmin(profile.role, profile.email)) {
      return true;
    }

    const { data, error } = await supabase.rpc("spend_credits", {
      user_id: user.id,
      amount: amount
    });
    return error ? false : data;
  },

  // BOOST LOGIC
  boostProfile: async (userId: string): Promise<string> => {
    const { data: profile } = await supabase.from('profiles').select('role, email').eq('id', userId).single();
    const isUserAdmin = profile && isAdmin(profile.role, profile.email);

    if (!isUserAdmin) {
      const success = await api.spendCredits(3);
      if (!success) throw new Error("Crediti insufficienti (3cr richiesti)");
    }

    const boostExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const { error } = await supabase
      .from('profiles')
      .update({ boost_until: boostExpiry })
      .eq('id', userId);

    if (error) throw error;
    return boostExpiry;
  },

  sendTip: async (
    senderId: string,
    recipientId: string,
    amount: number
  ): Promise<void> => {
    // Check if sender is admin
    const { data: sender } = await supabase
      .from("profiles")
      .select("role, email, credits")
      .eq("id", senderId)
      .single();
    if (!sender) throw new Error("Utente non trovato");

    if (isAdmin(sender.role, sender.email)) {
      const message = `:::TIP|${amount}::: L'Admin ti ha inviato una mancia simbolica di ${amount} crediti!`;
      await api.sendPrivateMessage(senderId, recipientId, message);
      return;
    }

    // Normal user: use the transaction-safe RPC
    const { data, error } = await supabase.rpc("transfer_credits", {
      p_sender_id: senderId,
      p_recipient_id: recipientId,
      p_amount: amount
    });

    if (error) {
      console.error("RPC Error transfer_credits:", error);
      throw new Error("Errore durante il trasferimento dei crediti.");
    }

    if (data && !data.success) {
      throw new Error(data.error || "Trasferimento fallito.");
    }

    const message = `:::TIP|${amount}::: Ti ha inviato una mancia di ${amount} crediti!`;
    await api.sendPrivateMessage(senderId, recipientId, message);
  },

  buyPhoto: async (
    buyerId: string,
    sellerId: string,
    photoId: string,
    price: number
  ): Promise<void> => {
    // Check if buyer is admin
    const { data: buyerProfile } = await supabase
      .from("profiles")
      .select("role, email, unlocked_media, credits")
      .eq("id", buyerId)
      .single();

    if (buyerProfile && isAdmin(buyerProfile.role, buyerProfile.email)) {
      const currentUnlocked = buyerProfile.unlocked_media || [];
      if (!currentUnlocked.includes(photoId)) {
        const { error } = await supabase
          .from("profiles")
          .update({ unlocked_media: [...currentUnlocked, photoId] })
          .eq("id", buyerId);
        if (error) throw error;
      }
      return;
    }

    // Normal user uses the transaction-safe RPC
    const { data, error } = await supabase.rpc("buy_vault_item", {
      p_buyer_id: buyerId,
      p_seller_id: sellerId,
      p_item_id: photoId,
      p_price: price
    });

    if (error) {
      console.error("RPC Error buy_vault_item:", error);
      throw new Error("Errore durante la transazione.");
    }

    if (data && !data.success) {
      throw new Error(data.error || "Acquisto fallito.");
    }
  },

  uploadAudio: async (
    file: Blob,
    userId: string
  ): Promise<string> => {
    // Determine extension and mime type from the blob
    const mimeType = file.type || 'audio/webm';
    let ext = 'webm';

    if (mimeType.includes('mp4')) ext = 'mp4';
    else if (mimeType.includes('mpeg')) ext = 'mp3';
    else if (mimeType.includes('wav')) ext = 'wav';
    else if (mimeType.includes('ogg')) ext = 'ogg';
    else if (mimeType.includes('aac')) ext = 'aac';

    // Usiamo la stessa cartella 'audio' nel bucket 'vault' esistente
    const fileName = `audio/${userId}_${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("vault")
      .upload(fileName, file, {
        contentType: mimeType,
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) {
      console.error("Audio upload error:", uploadError);
      throw uploadError;
    }

    const { data } = supabase.storage.from("vault").getPublicUrl(fileName);
    return data.publicUrl;
  },

  uploadVaultPhoto: async (
    file: File,
    userId: string,
    price: number
  ): Promise<VaultItem> => {
    // Pulisce l'estensione e genera un ID unico
    const fileExt = file.name.split(".").pop()?.toLowerCase() || 'jpg';
    const photoId = `photo-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const fileName = `${userId}/${photoId}.${fileExt}`;

    // Upload con metadati espliciti
    const { error: uploadError, data: uploadData } = await supabase.storage
      .from("vault")
      .upload(fileName, file, {
        contentType: file.type || `image/${fileExt}`,
        cacheControl: '3600', // Cache for 1 hour (standard practice)
        upsert: true
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      throw uploadError;
    }

    // Recupera l'URL pubblico con timestamp per cache-busting
    const { data } = supabase.storage.from("vault").getPublicUrl(fileName);

    // Add timestamp to prevent caching issues
    const timestamp = Date.now();
    const urlWithTimestamp = `${data.publicUrl}?t=${timestamp}`;

    console.log("✅ Vault photo uploaded successfully:", {
      photoId,
      fileName,
      url: urlWithTimestamp
    });

    return {
      id: photoId,
      url: urlWithTimestamp,
      price: price,
      uploadedAt: new Date().toISOString(),
      type: 'IMAGE'
    };
  },

  addVaultLink: async (
    link: string,
    userId: string,
    price: number
  ): Promise<VaultItem> => {
    const linkId = `link-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    return {
      id: linkId,
      url: link,
      price: price,
      uploadedAt: new Date().toISOString(),
      type: 'LINK'
    };
  },

  getVaultAccessStatus: async (
    ownerId: string
  ): Promise<"PENDING" | "APPROVED" | "REJECTED" | null> => {
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) return null;
    if (user.id === ownerId) return "APPROVED";
    const { data, error } = await supabase
      .from("vault_access")
      .select("status")
      .eq("owner_id", ownerId)
      .eq("requester_id", user.id)
      .single();
    if (error && (error as any).code !== "PGRST116") return null;
    return data ? data.status : null;
  },

  requestVaultAccess: async (ownerId: string): Promise<void> => {
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");
    await supabase
      .from("vault_access")
      .insert([{ owner_id: ownerId, requester_id: user.id, status: "PENDING" }]);
  },

  unlockVaultWithCredits: async (ownerId: string): Promise<boolean> => {
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Utente non autenticato");
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, email")
      .eq("id", user.id)
      .single();

    const isUserAdmin = profile && isAdmin(profile.role, profile.email);

    if (!isUserAdmin) {
      // Use transfer_credits RPC to credit the owner
      const { data, error: rpcError } = await supabase.rpc("transfer_credits", {
        p_sender_id: user.id,
        p_recipient_id: ownerId,
        p_amount: 5
      });

      if (rpcError) throw rpcError;
      if (data && !data.success) throw new Error(data.error || "Crediti insufficienti.");
    }

    const { error } = await supabase.from("vault_access").upsert(
      {
        owner_id: ownerId,
        requester_id: user.id,
        status: "APPROVED",
        unlocked_via_credits: true
      },
      { onConflict: "owner_id, requester_id" }
    );
    return !error;
  },

  getIncomingVaultRequests: async (): Promise<VaultAccess[]> => {
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) return [];
    const { data, error } = await supabase
      .from("vault_access")
      .select("*, requester:profiles!requester_id(id, name, avatar, role)")
      .eq("owner_id", user.id)
      .eq("status", "PENDING");
    return error ? [] : (data as unknown as VaultAccess[]);
  },

  updateVaultRequest: async (
    requestId: string,
    status: "APPROVED" | "REJECTED"
  ): Promise<void> => {
    await supabase.from("vault_access").update({ status }).eq("id", requestId);
  },

  recordVisit: async (targetId: string): Promise<void> => {
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user || user.id === targetId) return;
    await supabase.from("profile_visits").upsert(
      {
        visitor_id: user.id,
        target_id: targetId,
        visited_at: new Date().toISOString()
      },
      { onConflict: "visitor_id, target_id" }
    );
  },

  getVisitors: async (): Promise<Visitor[]> => {
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) return [];
    const { data, error } = await supabase
      .from("profile_visits")
      .select("visited_at, visitor:profiles!visitor_id!inner(name, avatar, role, is_banned)")
      .eq("target_id", user.id)
      .eq("visitor.is_banned", false)
      .order("visited_at", { ascending: false })
      .limit(20);
    if (error) return [];
    return data.map((row: any) => ({
      visitor_id: "hidden",
      visited_at: row.visited_at,
      visitor: {
        name: row.visitor.name,
        avatar: row.visitor.avatar,
        role: row.visitor.role
      }
    }));
  },

  getDailyMatch: async (currentUser: User): Promise<DailyMatch | null> => {
    if (!currentUser.isVip) return null;
    const now = new Date();
    const { data: existing } = await supabase
      .from("daily_matches")
      .select("*, match_profile:profiles!match_id(*)")
      .eq("user_id", currentUser.id)
      .gt("expires_at", now.toISOString())
      .single();

    if (existing)
      return {
        id: existing.id,
        match_id: existing.match_id,
        reasoning: existing.reasoning,
        expires_at: existing.expires_at,
        match_profile: {
          ...existing.match_profile,
          role: existing.match_profile.role as UserRole,
          isVerified: existing.match_profile.is_verified,
          isVip: existing.match_profile.is_vip,
          credits: existing.match_profile.credits || 0
        }
      };

    const { data: candidates } = await supabase
      .from("profiles")
      .select("*")
      .neq("id", currentUser.id)
      .eq("is_banned", false)
      .limit(20);
    if (!candidates || candidates.length === 0) return null;

    const prediction = await getOraclePrediction(
      currentUser,
      candidates.map((c) => ({ ...c, desires: c.desires || [] }))
    );
    if (!prediction) return null;

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const { data: newMatch, error: saveError } = await supabase
      .from("daily_matches")
      .insert({
        user_id: currentUser.id,
        match_id: prediction.bestMatchId,
        reasoning: prediction.reasoning,
        expires_at: expiresAt.toISOString()
      })
      .select("*, match_profile:profiles!match_id(*)")
      .single();

    if (saveError) return null;

    return {
      id: newMatch.id,
      match_id: newMatch.match_id,
      reasoning: newMatch.reasoning,
      expires_at: newMatch.expires_at,
      match_profile: {
        ...newMatch.match_profile,
        role: newMatch.match_profile.role as UserRole,
        isVerified: newMatch.match_profile.is_verified,
        isVip: newMatch.match_profile.is_vip,
        credits: newMatch.match_profile.credits || 0
      }
    };
  },

  generateInviteCode: async (): Promise<InviteCode> => {
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");
    const code = "VC-" + Math.random().toString(36).substring(2, 8).toUpperCase();
    const { data, error } = await supabase
      .from("invite_codes")
      .insert({ code: code, creator_id: user.id })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  getMyInviteCodes: async (): Promise<InviteCode[]> => {
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) return [];
    const { data, error } = await supabase
      .from("invite_codes")
      .select("*")
      .eq("creator_id", user.id)
      .order("created_at", { ascending: false });
    return error ? [] : data;
  },

  checkTrustStatus: async (targetId: string): Promise<boolean> => {
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) return false;
    const { data } = await supabase
      .from("trust_endorsements")
      .select("id")
      .eq("endorser_id", user.id)
      .eq("target_id", targetId)
      .single();
    return !!data;
  },

  toggleTrust: async (targetId: string): Promise<boolean> => {
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Utente non loggato");
    if (user.id === targetId) throw new Error("Non puoi garantire per te stesso");
    const { data: existing } = await supabase
      .from("trust_endorsements")
      .select("id")
      .eq("endorser_id", user.id)
      .eq("target_id", targetId)
      .single();
    if (existing) {
      await supabase.from("trust_endorsements").delete().eq("id", existing.id);
      return false;
    } else {
      await supabase
        .from("trust_endorsements")
        .insert({ endorser_id: user.id, target_id: targetId });
      return true;
    }
  },

  drawVelvetCard: async (
    category: "SOFT" | "INTENSE" | "DARE"
  ): Promise<string> => {
    const { data } = await supabase
      .from("velvet_cards")
      .select("content")
      .eq("category", category);
    if (!data || data.length === 0) return "Qual è la tua fantasia inconfessabile?";
    return data[Math.floor(Math.random() * data.length)].content;
  },

  getConfessions: async (): Promise<Confession[]> => {
    const { data, error } = await supabase
      .from("confessions")
      .select("*")
      .order("created_at", { ascending: false });
    return error ? [] : (data as Confession[]);
  },

  createConfession: async (confession: Partial<Confession>): Promise<void> => {
    await supabase.from("confessions").insert([confession]);
  },

  likeConfession: async (id: string, currentLikes: number): Promise<void> => {
    await supabase
      .from("confessions")
      .update({ likes: currentLikes + 1 })
      .eq("id", id);
  },

  joinClubChat: (onMessage: (msg: ChatMessage) => void) => {
    const channel = supabase.channel("the-club");
    channel
      .on("broadcast", { event: "message" }, (p) => {
        if (p.payload) {
          (p.payload as any).timestamp = new Date((p.payload as any).timestamp);
          onMessage(p.payload as any);
        }
      })
      .subscribe();
    return {
      sendMessage: async (m: ChatMessage) => {
        await channel.send({ type: "broadcast", event: "message", payload: m });
      },
      leave: () => {
        supabase.removeChannel(channel);
      }
    };
  },

  broadcastLocation: async (
    userId: string,
    lat: number,
    lng: number,
    message: string
  ): Promise<string> => {
    const expiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString();
    const fuzzy = applyGeoJitter(lat, lng);

    const payload = {
      user_id: userId,
      latitude: fuzzy.lat,
      longitude: fuzzy.lng,
      message,
      expires_at: expiresAt
    };

    // Rimuovi eventuale checkin precedente
    await supabase.from("radar_checkins").delete().eq("user_id", userId);

    // ✅ IMPORTANTISSIMO: chiediamo esplicitamente l'id con select().single()
    const { data: inserted, error: insertError } = await supabase
      .from("radar_checkins")
      .insert(payload)
      .select("id")
      .single();

    if (insertError) throw insertError;
    if (!inserted?.id) throw new Error("Impossibile ottenere l'ID del checkin appena creato.");

    // Notify Telegram with location info
    console.log("[RADAR] Starting Telegram notification flow for user:", userId);
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("name, role")
        .eq("id", userId)
        .single();

      if (profile) {
        console.log("[RADAR] Profile found:", profile.name);

        // Reverse geocoding (best effort)
        let cityName: string | undefined;
        try {
          console.log("[RADAR] Attempting reverse geocoding...");
          const geoResponse = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`,
            {
              headers: { "User-Agent": "VelvetClub/1.0" },
              signal: AbortSignal.timeout(3000)
            }
          );

          if (geoResponse.ok) {
            const geoData = await geoResponse.json();
            cityName =
              geoData.address?.city ||
              geoData.address?.town ||
              geoData.address?.village ||
              geoData.address?.municipality ||
              geoData.address?.county;
            console.log("[RADAR] City found:", cityName);
          } else {
            console.warn("[RADAR] Geocoding HTTP Error:", geoResponse.status);
          }
        } catch (geoError) {
          console.warn("[RADAR] Reverse geocoding failed or timed out", geoError);
        }

        console.log("[RADAR] Sending message to telegramService...");
        await telegramService.sendMessage(
          telegramService.formatRadarActivation(profile, message, { city: cityName, lat, lng })
        );
        console.log("[RADAR] Telegram service call completed.");
      } else {
        console.warn("[RADAR] Profile NOT found for user:", userId);
      }
    } catch (e) {
      console.warn("[RADAR] Telegram radar notification failed completely", e);
    }

    return inserted.id;
  },


  stopRadarBroadcast: async (userId: string): Promise<void> => {
    await supabase.from("radar_checkins").delete().eq("user_id", userId);
  },

  updateLocation: async (
    checkinId: string,
    lat: number,
    lng: number
  ): Promise<void> => {
    const fuzzy = applyGeoJitter(lat, lng);
    await supabase
      .from("radar_checkins")
      .update({ latitude: fuzzy.lat, longitude: fuzzy.lng })
      .eq("id", checkinId);
  },

  getMyActiveCheckin: async (userId: string): Promise<RadarSignal | null> => {
    const { data } = await supabase
      .from("radar_checkins")
      .select("*")
      .eq("user_id", userId)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return data as unknown as RadarSignal;
  },

  deleteActiveCheckin: async (userId: string): Promise<void> => {
    await supabase.from("radar_checkins").delete().eq("user_id", userId);
  },

  getRadarSignals: async (): Promise<RadarSignal[]> => {
    const { data: userData, error: userError } = await supabase
      .from("radar_checkins")
      .select("*, profile:profiles!inner(name, avatar, role, is_vip, is_banned)")
      .eq("profile.is_banned", false)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false });

    const { data: clubData, error: clubError } = await supabase
      .from("club_profiles")
      .select("*, profile:profiles!inner(name, avatar, role, is_vip, is_banned)")
      .eq("profile.is_banned", false);

    const signals: RadarSignal[] = [];

    if (!userError && userData) {
      signals.push(...userData.map((item: any) => ({
        id: item.id,
        user_id: item.user_id,
        latitude: item.latitude,
        longitude: item.longitude,
        message: item.message,
        expires_at: item.expires_at,
        flare_expires_at: item.flare_expires_at,
        profile: item.profile
      })));
    }

    if (!clubError && clubData) {
      signals.push(...clubData.map((item: any) => ({
        id: `club-${item.id}`,
        user_id: item.id,
        latitude: item.latitude || 45.4642,
        longitude: item.longitude || 9.1900,
        message: `${item.city} - ${item.address}`,
        expires_at: new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000).toISOString(),
        profile: {
          ...item.profile,
          role: UserRole.CLUB as any
        }
      })));
    }

    return signals;
  },

  getPrivateMessages: async (
    myId: string,
    otherId: string
  ): Promise<PrivateMessage[]> => {
    const cutoff = new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from("private_messages")
      .select("*")
      .or(
        `and(sender_id.eq.${myId},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${myId})`
      )
      .gt("created_at", cutoff)
      .order("created_at", { ascending: true });
    return error
      ? []
      : data.map((msg: any) => ({
        ...msg,
        is_black_rose: msg.content.startsWith(":::BLACK_ROSE:::"),
        content: msg.content.replace(":::BLACK_ROSE:::", "")
      }));
  },

  getUnreadMessageCount: async (userId: string): Promise<number> => {
    const cutoff = new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString();

    // Trigger cleanup via RPC (SECURITY DEFINER)
    supabase.rpc('cleanup_old_messages').then();

    const { count, error } = await supabase
      .from("private_messages")
      .select("id", { count: 'exact', head: true })
      .eq("receiver_id", userId)
      .eq("is_read", false)
      .gt("created_at", cutoff);

    if (error) {
      console.error("Error fetching unread count:", error);
      return 0;
    }
    return count || 0;
  },

  markMessagesAsRead: async (myId: string, otherId: string): Promise<void> => {
    // Usiamo RPC per bypassare RLS
    const { error } = await supabase.rpc('mark_chat_read', {
      p_me: myId,
      p_other: otherId
    });

    if (error) console.error("Error marking messages as read via RPC:", error);
  },

  sendPrivateMessage: async (
    senderId: string,
    receiverId: string,
    content: string,
    senderName?: string,
    isBlackRose = false,
    imageUrl?: string,
    isEphemeral = false
  ): Promise<void> => {
    // Check if either user is banned
    const { data: participants, error: banCheckError } = await supabase
      .from('profiles')
      .select('id, is_banned')
      .in('id', [senderId, receiverId]);

    if (banCheckError) throw banCheckError;
    if (participants?.some(p => p.is_banned)) {
      throw new Error("L'interazione con questo profilo non è possibile poiché è stato sospeso.");
    }

    const finalContent = isBlackRose ? `:::BLACK_ROSE:::${content}` : content;
    const { error } = await supabase
      .from("private_messages")
      .insert([{
        sender_id: senderId,
        receiver_id: receiverId,
        content: finalContent,
        image_url: imageUrl,
        is_ephemeral: isEphemeral,
        is_read: false
      }]);
    if (error) throw error;
    if (senderName) {
      fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receiverId,
          senderName,
          messagePreview: content.substring(0, 50)
        })
      }).catch((e) => console.error(e));
    }
  },
  getInbox: async (): Promise<InboxConversation[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: convs, error } = await supabase.rpc("get_my_conversations");
    if (error || !convs) return [];

    const partnerIds = convs.map((c: any) => c.partner_id);

    // Fetch partners profiles
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, name, avatar, role, is_verified, is_vip, is_banned")
      .in("id", partnerIds)
      .eq("is_banned", false);

    // Recupera i conteggi non letti per questi partner (con cutoff 36h)
    const cutoff = new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString();
    const { data: unreadData } = await supabase
      .from("private_messages")
      .select("sender_id")
      .eq("receiver_id", user.id)
      .not("is_read", "is", true)
      .gt("created_at", cutoff);

    const unreadMap = (unreadData || []).reduce((acc: any, curr: any) => {
      acc[curr.sender_id] = (acc[curr.sender_id] || 0) + 1;
      return acc;
    }, {});

    return convs
      .map((c: any) => {
        const profile = profiles?.find((p) => p.id === c.partner_id);
        if (!profile) return null;
        return {
          partner: {
            id: profile.id,
            name: profile.name,
            avatar: profile.avatar,
            role: profile.role,
            isVerified: profile.is_verified,
            isVip: profile.is_vip
          },
          last_message_at: c.last_message_at,
          unread_count: unreadMap[profile.id] || 0,
          has_black_rose: false
        };
      })
      .filter(Boolean) as InboxConversation[];
  },

  getAiHistory: async (companionId: string): Promise<AiMessage[]> => {
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) return [];
    const { data } = await supabase
      .from("ai_messages")
      .select("*")
      .eq("user_id", user.id)
      .eq("companion_id", companionId)
      .order("created_at", { ascending: true })
      .limit(50);
    return (data as AiMessage[]) || [];
  },

  saveAiMessage: async (
    companionId: string,
    role: "user" | "model",
    content: string
  ): Promise<void> => {
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase
      .from("ai_messages")
      .insert({ user_id: user.id, companion_id: companionId, role: role, content: content });
  },

  requestPayout: async (payPalEmail: string): Promise<void> => {
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Utente non autenticato");

    const response = await fetch("/api/request-payout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id, payPalEmail })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || "Errore durante la richiesta di payout");
    }
  },

  // --- SECRET CIRCLES ---
  createCircle: async (name: string, description: string, theme: string): Promise<string> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Utente non autenticato");

    const code = Math.random().toString(36).substring(2, 8).toUpperCase(); // Es: X7Y2Z1

    const { data, error } = await supabase
      .from('circles')
      .insert({
        name,
        description,
        theme,
        code,
        created_by: user.id
      })
      .select()
      .single();

    if (error) throw error;

    // Auto-join creator as admin
    await supabase.from('circle_members').insert({
      circle_id: data.id,
      user_id: user.id,
      role: 'ADMIN'
    });

    return data.code;
  },

  joinCircle: async (code: string): Promise<void> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Utente non autenticato");

    // Find circle by code
    const { data: circle, error: circleError } = await supabase
      .from('circles')
      .select('id')
      .eq('code', code)
      .single();

    if (circleError || !circle) throw new Error("Codice cerchio non valido.");

    const { error: joinError } = await supabase
      .from('circle_members')
      .insert({
        circle_id: circle.id,
        user_id: user.id,
        role: 'MEMBER'
      });

    if (joinError) {
      if (joinError.code === '23505') throw new Error("Sei già membro di questo cerchio.");
      throw joinError;
    }
  },

  getMyCircles: async (): Promise<any[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('circles')
      .select('*, circle_members!inner(role)')
      .eq('circle_members.user_id', user.id);

    if (error) return [];
    return data;
  },

  getCircleMembers: async (circleId: string): Promise<any[]> => {
    const { data, error } = await supabase
      .from('circle_members')
      .select('*, profile:profiles!inner(*)')
      .eq('circle_id', circleId)
      .eq('profile.is_banned', false);

    if (error) return [];
    return data.map(m => ({
      ...m,
      profile: {
        ...m.profile,
        role: m.profile.role as UserRole,
        isVip: m.profile.is_vip
      }
    }));
  },

  getCircleMessages: async (circleId: string): Promise<any[]> => {
    const thirtySixHoursAgo = new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('circle_messages')
      .select('*, profile:profiles(*)')
      .eq('circle_id', circleId)
      .gt('created_at', thirtySixHoursAgo)
      .order('created_at', { ascending: true });

    if (error) return [];
    return data.map(m => ({
      ...m,
      profile: {
        ...m.profile,
        role: m.profile.role as UserRole,
        isVip: m.profile.is_vip
      }
    }));
  },

  sendCircleMessage: async (circleId: string, content?: string, imageFile?: File, isEphemeral: boolean = false): Promise<void> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Utente non autenticato");

    let imageUrl = null;
    if (imageFile) {
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${circleId}/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('circle-media')
        .upload(fileName, imageFile, {
          contentType: imageFile.type,
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('circle-media')
        .getPublicUrl(fileName);

      // Add timestamp to prevent caching issues (same as vault)
      imageUrl = `${publicUrl}?t=${Date.now()}`;
    }

    const { data: profile } = await supabase.from('profiles').select('is_banned').eq('id', user.id).single();
    if (profile?.is_banned) throw new Error("Il tuo account è sospeso. Non puoi inviare messaggi.");

    const { error } = await supabase
      .from('circle_messages')
      .insert({
        circle_id: circleId,
        user_id: user.id,
        content,
        image_url: imageUrl,
        is_ephemeral: isEphemeral
      });

    if (error) throw error;
  },

  deleteCircle: async (circleId: string): Promise<void> => {
    const { error } = await supabase
      .from('circles')
      .delete()
      .eq('id', circleId);

    if (error) throw error;
  },

  // --- NOTIFICATIONS ---
  getNotifications: async (): Promise<Notification[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    return error ? [] : data;
  },

  markNotificationRead: async (id: string): Promise<void> => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
  },

  createNotification: async (userId: string, type: string, content: string, metadata = {}): Promise<void> => {
    await supabase.from('notifications').insert({ user_id: userId, type, content, metadata });
  },

  // --- SECURITY & MODERATION ---
  blockUser: async (blockedId: string): Promise<void> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");
    await supabase.from('blocked_users').insert({ blocker_id: user.id, blocked_id: blockedId });
  },

  unblockUser: async (blockedId: string): Promise<void> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");
    await supabase.from('blocked_users').delete().eq('blocker_id', user.id).eq('blocked_id', blockedId);
  },

  getBlockedUserIds: async (): Promise<string[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    const { data } = await supabase.from('blocked_users').select('blocked_id').eq('blocker_id', user.id);
    return data?.map(b => b.blocked_id) || [];
  },

  reportContent: async (targetId: string, targetType: string, reason: string): Promise<void> => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('reports').insert({
      reporter_id: user?.id || null,
      target_id: targetId,
      target_type: targetType,
      reason: reason
    });
    if (error) throw error;
  },

  getReports: async (): Promise<Report[]> => {
    const { data, error } = await supabase
      .from('reports')
      .select('*, reporter_profile:profiles!reporter_id(name), target_profile:profiles!target_id(name)')
      .order('created_at', { ascending: false });
    if (error) {
      console.error("Error fetching reports:", error);
      return [];
    }
    return data || [];
  },

  updateReportStatus: async (reportId: string, status: string, adminNotes: string): Promise<void> => {
    const { error } = await supabase.from('reports').update({ status, admin_notes: adminNotes }).eq('id', reportId);
    if (error) throw error;
  },

  banUser: async (userId: string, reason: string): Promise<void> => {
    await supabase.from('profiles').update({ is_banned: true, ban_reason: reason }).eq('id', userId);
  },

  unbanUser: async (userId: string): Promise<void> => {
    await supabase.from('profiles').update({ is_banned: false, ban_reason: null }).eq('id', userId);
  },

  activateFlare: async (checkinId: string): Promise<void> => {
    const flareExpiry = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    const { error } = await supabase
      .from('radar_checkins')
      .update({ flare_expires_at: flareExpiry })
      .eq('id', checkinId);
    if (error) throw error;
  },

  revealEphemeralMessage: async (messageId: string, type: 'CIRCLE' | 'PRIVATE'): Promise<void> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const table = type === 'CIRCLE' ? 'circle_messages' : 'private_messages';

    // Fetch current reveals
    const { data: msg } = await supabase.from(table).select('ephemeral_reveals').eq('id', messageId).single();
    const currentReveals = msg?.ephemeral_reveals || {};

    if (!currentReveals[user.id]) {
      currentReveals[user.id] = new Date().toISOString();
      await supabase.from(table).update({ ephemeral_reveals: currentReveals }).eq('id', messageId);
    }
  },

  // --- CLUBS & EVENTS ---
  getClubs: async (): Promise<ClubProfile[]> => {
    const { data, error } = await supabase
      .from('club_profiles')
      .select('*, profile:profiles!id(name, avatar, bio)');
    if (error) return [];
    return data.map(c => ({
      ...c,
      name: c.profile.name,
      avatar: c.profile.avatar,
      bio: c.profile.bio,
      owner_id: c.id
    }));
  },

  getClubEvents: async (clubId?: string): Promise<ClubEvent[]> => {
    // 1. Trigger cleanup
    api.cleanupOldEvents().catch(console.error);

    let query = supabase.from('club_events').select('*');
    if (clubId) query = query.eq('club_id', clubId);

    const sixMonthsFromNow = new Date();
    sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);

    const { data, error } = await query
      .lte('date', sixMonthsFromNow.toISOString())
      .order('date', { ascending: true });
    if (error) return [];
    return data;
  },

  cleanupOldEvents: async (): Promise<void> => {
    try {
      await supabase.rpc('cleanup_old_club_events');
    } catch (e) {
      // Fallback if RPC is not defined
      const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      await supabase.from('club_events').delete().lt('date', cutoff);
    }
  },

  createClubEvent: async (event: Partial<ClubEvent>): Promise<void> => {
    const { error } = await supabase.from('club_events').insert(event);
    if (error) throw error;
  },

  updateClubEvent: async (eventId: string, updates: Partial<ClubEvent>): Promise<void> => {
    const { error } = await supabase
      .from('club_events')
      .update(updates)
      .eq('id', eventId);
    if (error) throw error;
  },

  deleteClubEvent: async (eventId: string): Promise<void> => {
    const { error } = await supabase
      .from('club_events')
      .delete()
      .eq('id', eventId);
    if (error) throw error;
  },

  registerClub: async (
    data: { email: string; name: string; password?: string; address: string; city: string; phone: string; photos: string[]; latitude: number; longitude: number }
  ): Promise<User> => {
    const user = await api.register({
      email: data.email,
      name: data.name,
      password: data.password,
      role: UserRole.CLUB
    });

    const { error } = await supabase.from('club_profiles').insert({
      id: user.id,
      address: data.address,
      city: data.city,
      phone: data.phone,
      photos: data.photos,
      latitude: data.latitude,
      longitude: data.longitude
    });

    if (error) throw error;

    // Notify Telegram
    telegramService.sendMessage(telegramService.formatNewClub(data));

    return user;
  },

  getClubProfile: async (userId: string): Promise<ClubProfile | null> => {
    const { data, error } = await supabase
      .from('club_profiles')
      .select('*, profile:profiles!id(name, avatar, bio)')
      .eq('id', userId)
      .single();

    if (error || !data) return null;
    return {
      ...data,
      name: data.profile.name,
      avatar: data.profile.avatar,
      bio: data.profile.bio,
      owner_id: data.id
    };
  },

  updateClubProfile: async (userId: string, data: Partial<ClubProfile>): Promise<void> => {
    const updateData: any = {};
    if (data.address !== undefined) updateData.address = data.address;
    if (data.city !== undefined) updateData.city = data.city;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.photos !== undefined) updateData.photos = data.photos;
    if (data.latitude !== undefined) updateData.latitude = data.latitude;
    if (data.longitude !== undefined) updateData.longitude = data.longitude;

    const { error } = await supabase
      .from('club_profiles')
      .update(updateData)
      .eq('id', userId);

    if (error) throw error;
  }
};
