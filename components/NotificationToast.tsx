import React, { useEffect, useState } from 'react';
import { Bell, X, Coins, MessageSquare, Lock, Eye, Heart } from 'lucide-react';
import { notificationService, Notification, NotificationType } from '../services/notificationService';

const NotificationToast: React.FC = () => {
    const [notifications, setNotifications] = useState<Notification[]>([]);

    useEffect(() => {
        const unsubscribe = notificationService.onNotification((notification) => {
            setNotifications(prev => [...prev, notification]);
            // Auto-remove after 5 seconds
            setTimeout(() => {
                setNotifications(prev => prev.filter(n => n.id !== notification.id));
            }, 5000);
        });

        return unsubscribe;
    }, []);

    const getIcon = (type: NotificationType) => {
        switch (type) {
            case 'message': return MessageSquare;
            case 'credits': return Coins;
            case 'photo_sold': return Coins;
            case 'vault_request': return Lock;
            case 'visitor': return Eye;
            case 'match': return Heart;
            default: return Bell;
        }
    };

    const getColor = (type: NotificationType) => {
        switch (type) {
            case 'message': return 'from-blue-900/80 to-blue-800/80 border-blue-700';
            case 'credits': return 'from-gold-900/80 to-gold-800/80 border-gold-700';
            case 'photo_sold': return 'from-green-900/80 to-green-800/80 border-green-700';
            case 'vault_request': return 'from-crimson-900/80 to-crimson-800/80 border-crimson-700';
            case 'visitor': return 'from-purple-900/80 to-purple-800/80 border-purple-700';
            case 'match': return 'from-pink-900/80 to-pink-800/80 border-pink-700';
            default: return 'from-neutral-900/80 to-neutral-800/80 border-neutral-700';
        }
    };

    if (notifications.length === 0) return null;

    return (
        <div className="fixed top-4 right-4 z-[200] space-y-2 pointer-events-none">
            {notifications.map((notification) => {
                const Icon = getIcon(notification.type);
                const colorClass = getColor(notification.type);

                return (
                    <div
                        key={notification.id}
                        className={`pointer-events-auto bg-gradient-to-r ${colorClass} border backdrop-blur-sm p-4 rounded-lg shadow-2xl min-w-[320px] max-w-md animate-fade-in`}
                    >
                        <div className="flex items-start gap-3">
                            <div className="bg-white/10 p-2 rounded-full flex-shrink-0">
                                <Icon className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-bold text-white mb-1">{notification.title}</h4>
                                <p className="text-xs text-neutral-200">{notification.message}</p>
                            </div>
                            <button
                                onClick={() => setNotifications(prev => prev.filter(n => n.id !== notification.id))}
                                className="text-white/50 hover:text-white transition-colors flex-shrink-0"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default NotificationToast;
