
export enum UserRole {
  COUPLE = 'COUPLE',
  SINGLE_MALE = 'SINGLE_MALE',
  SINGLE_FEMALE = 'SINGLE_FEMALE',
  ADMIN = 'ADMIN',
  CLUB = 'CLUB'
}

export interface VaultItem {
  id: string;
  url: string;
  price: number; // 0 = Gratis/Pubblico, >0 = Pay Per View
  uploadedAt: string;
  type?: 'IMAGE' | 'LINK';
}

export interface User {
  id: string;
  name: string; // "Marco & Anna" or "Luca"
  email?: string;
  avatar: string;
  role: UserRole;
  desires: string[]; // Cosa cercano (es. "Scambio", "Threesome")
  limits: string[];  // Cosa evitano (es. "No fumatori", "No BDSM")
  bio: string;
  isVerified: boolean;
  isVip: boolean; // NUOVO STATO VIP
  vipUntil?: string; // Data scadenza VIP
  boostUntil?: string; // NUOVA SCADENZA BOOST
  location?: string;
  gallery?: VaultItem[]; // Updated to support price and metadata
  unlockedMedia?: string[]; // IDs of photos unlocked by this user
  trustScore?: number; // Numero di garanzie ricevute
  credits: number; // Saldo crediti acquistabili
  is_banned?: boolean;
  ban_reason?: string;
  createdAt?: string;
}

export interface VaultAccess {
  id: string;
  owner_id: string;
  requester_id: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  created_at: string;
  requester?: {
    id: string;
    name: string;
    avatar: string;
    role: UserRole;
  }
}

export interface Event {
  id: string;
  title: string;
  date: string;
  location: string;
  image: string;
  attendees: number;
  type: 'PRIVATE_ROOM' | 'PARTY' | 'TRIP';
  price: string;
  description?: string;
}

export interface ClubProfile {
  id: string;
  address: string;
  city: string;
  phone: string;
  photos: string[];
  owner_id: string;
  name: string; // From profile
  avatar: string; // From profile
  bio?: string; // From profile
  latitude?: number;
  longitude?: number;
}

export interface ClubEvent {
  id: string;
  club_id: string;
  title: string;
  description?: string;
  date: string;
  images?: string[];
  price?: string;
  location?: string;
  attendees_count: number;
}

export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  content: string;
  timestamp: Date;
  isAi?: boolean;
  imageUrl?: string;
}

export interface PrivateMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  is_read: boolean;
  is_black_rose?: boolean; // Client-side derived property
  image_url?: string;
  is_ephemeral?: boolean;
  ephemeral_reveals?: Record<string, string>; // user_id -> revealed_at
}

export interface InboxConversation {
  partner: {
    id: string;
    name: string;
    avatar: string;
    role: UserRole;
    isVerified: boolean;
    isVip?: boolean;
  };
  last_message_at: string;
  has_black_rose?: boolean;
  unread_count?: number;
}

export interface Confession {
  id: string;
  author_alias: string; // Nome visualizzato
  author_role: UserRole;
  avatar: string;
  content: string;
  tags: string[]; // es. "Voyeur", "Exhibitionist", "Story"
  likes: number;
  created_at?: string;
}

export interface RadarSignal {
  id: string;
  user_id: string;
  latitude: number;
  longitude: number;
  message: string;
  expires_at: string;
  flare_expires_at?: string; // NUOVO: Scadenza del Flare VIP
  profile: {
    name: string;
    avatar: string;
    role: UserRole;
    isVip?: boolean;
    is_verified?: boolean;
  }
}

export interface Visitor {
  visitor_id: string;
  visited_at: string;
  visitor: {
    name: string;
    avatar: string;
    role: UserRole;
  }
}

export interface DailyMatch {
  id: string;
  match_id: string;
  reasoning: string;
  expires_at: string;
  match_profile?: User;
}

export interface InviteCode {
  code: string;
  is_used: boolean;
  created_at: string;
}

export interface AiMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  created_at: string;
}

export interface Circle {
  id: string;
  code: string;
  name: string;
  description: string;
  theme: string;
  created_at: string;
  created_by: string;
  member_count?: number; // Calculated field
}

export interface CircleMember {
  id: string;
  circle_id: string;
  user_id: string;
  joined_at: string;
  role: 'ADMIN' | 'MEMBER';
  profile?: User;
}

export interface CircleMessage {
  id: string;
  circle_id: string;
  user_id: string;
  content?: string;
  image_url?: string;
  created_at: string;
  profile?: User;
  is_ephemeral?: boolean;
  ephemeral_reveals?: Record<string, string>; // user_id -> revealed_at
}

export interface Notification {
  id: string;
  user_id: string;
  type: 'MESSAGE' | 'TIP' | 'VAULT_ACCESS' | 'VISITOR' | 'ORACLE_MATCH' | 'REPORT_RESULT' | 'SYSTEM';
  content: string;
  is_read: boolean;
  metadata: any;
  created_at: string;
}

export interface Report {
  id: string;
  reporter_id: string | null;
  target_id: string;
  target_type: 'USER' | 'MESSAGE' | 'CONFESSION' | 'CIRCLE_MESSAGE';
  reason: string;
  status: 'PENDING' | 'RESOLVED' | 'DISMISSED';
  admin_notes?: string;
  created_at: string;
  reporter_profile?: {
    name: string;
  };
  target_profile?: {
    name: string;
  };
}

export interface BlockedUser {
  id: string;
  blocker_id: string;
  blocked_id: string;
  created_at: string;
}

export type ViewState = 'LANDING' | 'AUTH' | 'DASHBOARD';
export type DashboardView = 'CLUB' | 'CONFESSIONAL' | 'RADAR' | 'CIRCLES' | 'MEMBERS' | 'MESSAGES' | 'MEMBERSHIP' | 'VISITORS' | 'ORACLE' | 'COMPANION' | 'RULES' | 'TERMS' | 'PRIVACY' | 'ADMIN_PANEL' | 'CLUB_LIST' | 'CLUB_EVENTS' | 'CLUB_PROFILE';
