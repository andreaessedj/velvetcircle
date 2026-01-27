import { supabase } from '../lib/supabase';
import { User } from '../types';

export type NotificationType = 'message' | 'credits' | 'photo_sold' | 'vault_request' | 'visitor' | 'match';

export interface Notification {
    id: string;
    type: NotificationType;
    title: string;
    message: string;
    timestamp: Date;
    read: boolean;
    data?: any;
}

class NotificationService {
    private listeners: ((notification: Notification) => void)[] = [];
    private channel: any = null;
    private userId: string | null = null;
    private enabled: boolean = true;

    initialize(user: User) {
        this.userId = user.id;
        this.setupRealtimeListeners();
    }

    setEnabled(enabled: boolean) {
        this.enabled = enabled;
        if (!enabled && this.channel) {
            this.channel.unsubscribe();
            this.channel = null;
        } else if (enabled && this.userId) {
            this.setupRealtimeListeners();
        }
    }

    private setupRealtimeListeners() {
        if (!this.userId || !this.enabled) return;

        // Cleanup existing channel
        if (this.channel) {
            this.channel.unsubscribe();
        }

        // Listen to private messages
        this.channel = supabase
            .channel(`notifications:${this.userId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'private_messages',
                    filter: `receiver_id=eq.${this.userId}`
                },
                (payload) => {
                    this.notify({
                        id: payload.new.id,
                        type: 'message',
                        title: 'Nuovo Messaggio',
                        message: 'Hai ricevuto un nuovo messaggio privato',
                        timestamp: new Date(payload.new.created_at),
                        read: false,
                        data: payload.new
                    });
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'profiles',
                    filter: `id=eq.${this.userId}`
                },
                (payload) => {
                    // Check if credits increased
                    if (payload.new.credits > payload.old.credits) {
                        const diff = payload.new.credits - payload.old.credits;
                        this.notify({
                            id: `credits-${Date.now()}`,
                            type: 'credits',
                            title: 'Crediti Ricevuti',
                            message: `Hai ricevuto ${diff} crediti!`,
                            timestamp: new Date(),
                            read: false,
                            data: { amount: diff }
                        });
                    }
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'vault_access',
                    filter: `owner_id=eq.${this.userId}`
                },
                (payload) => {
                    this.notify({
                        id: payload.new.id,
                        type: 'vault_request',
                        title: 'Richiesta Vault',
                        message: 'Qualcuno ha richiesto accesso al tuo Vault',
                        timestamp: new Date(payload.new.created_at),
                        read: false,
                        data: payload.new
                    });
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'profile_visits',
                    filter: `visited_id=eq.${this.userId}`
                },
                (payload) => {
                    this.notify({
                        id: payload.new.id,
                        type: 'visitor',
                        title: 'Nuovo Visitatore',
                        message: 'Qualcuno ha visitato il tuo profilo',
                        timestamp: new Date(payload.new.visited_at),
                        read: false,
                        data: payload.new
                    });
                }
            )
            .subscribe();
    }

    private notify(notification: Notification) {
        if (!this.enabled) return;

        // Show browser notification if permission granted
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(notification.title, {
                body: notification.message,
                icon: '/favicon.ico',
                badge: '/favicon.ico',
                tag: notification.id,
                requireInteraction: false,
                silent: false
            });
        }

        // Notify all listeners
        this.listeners.forEach(listener => listener(notification));
    }

    async requestPermission(): Promise<boolean> {
        if (!('Notification' in window)) {
            console.log('This browser does not support notifications');
            return false;
        }

        if (Notification.permission === 'granted') {
            return true;
        }

        if (Notification.permission !== 'denied') {
            const permission = await Notification.requestPermission();
            return permission === 'granted';
        }

        return false;
    }

    onNotification(callback: (notification: Notification) => void) {
        this.listeners.push(callback);
        return () => {
            this.listeners = this.listeners.filter(l => l !== callback);
        };
    }

    cleanup() {
        if (this.channel) {
            this.channel.unsubscribe();
            this.channel = null;
        }
        this.listeners = [];
        this.userId = null;
    }
}

export const notificationService = new NotificationService();
