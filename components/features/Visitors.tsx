import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { User, Visitor } from '../../types';
import { api } from '../../services/db';
import { Ghost, Lock, Clock, MessageSquare, ChevronRight } from 'lucide-react';

interface VisitorsProps {
  currentUser: User;
  onOpenChat: (user: { id: string, name: string, avatar: string }) => void;
}

const Visitors: React.FC<VisitorsProps> = ({ currentUser, onOpenChat }) => {
  const { t } = useTranslation();
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      if (currentUser.isVip) {
        const data = await api.getVisitors();
        setVisitors(data);
      } else {
        // Fake data for non-VIP preview
        setVisitors(Array(5).fill({
          visitor_id: 'hidden',
          visited_at: new Date().toISOString(),
          visitor: { name: 'Membro Anonimo', avatar: '', role: 'COUPLE' }
        }));
      }
      setLoading(false);
    };
    loadData();
  }, [currentUser.isVip]);

  return (
    <div className="max-w-3xl mx-auto py-10 px-6">
      <div className="mb-10 text-center">
        <Ghost className="w-12 h-12 text-neutral-600 mx-auto mb-4" />
        <h2 className="text-3xl font-serif text-white mb-2">{t('visitors.title')}</h2>
        <p className="text-neutral-500 text-sm">{t('visitors.desc')}</p>
      </div>

      {!currentUser.isVip && (
        <div className="bg-neutral-900 border border-gold-900/30 p-8 text-center rounded relative overflow-hidden group mb-8">
          <div className="absolute inset-0 bg-gold-900/5 pointer-events-none group-hover:bg-gold-900/10 transition-colors"></div>
          <Lock className="w-8 h-8 text-gold-500 mx-auto mb-3" />
          <h3 className="text-lg font-serif text-gold-400 mb-2">{t('visitors.reserved')}</h3>
          <p className="text-neutral-400 text-sm mb-6" dangerouslySetInnerHTML={{ __html: t('visitors.vip_desc', { count: 5 }) }}></p>
          <button disabled className="bg-neutral-800 text-neutral-500 border border-neutral-700 px-6 py-2 text-xs uppercase font-bold tracking-widest cursor-not-allowed">
            {t('visitors.upgrade_btn')}
          </button>
        </div>
      )}

      <div className="space-y-4">
        {visitors.length === 0 && currentUser.isVip && !loading && (
          <div className="text-center py-12 text-neutral-600 font-serif italic border border-dashed border-neutral-800">
            {t('visitors.no_visitors')}
          </div>
        )}

        {visitors.map((v, i) => (
          <div key={i} className={`flex items-center gap-4 bg-neutral-900/30 border border-neutral-800 p-4 transition-all rounded-lg ${!currentUser.isVip ? 'blur-sm select-none opacity-50' : 'hover:bg-neutral-900 hover:border-crimson-900/30'}`}>
            {currentUser.isVip ? (
              <img src={v.visitor.avatar} className="w-12 h-12 rounded-full object-cover border border-neutral-700" alt={v.visitor.name} />
            ) : (
              <div className="w-12 h-12 rounded-full bg-neutral-800 border border-neutral-700"></div>
            )}

            <div className="flex-1">
              <h4 className="text-white font-serif">{currentUser.isVip ? v.visitor.name : t('visitors.anonymous')}</h4>
              <div className="flex items-center gap-3 text-xs text-neutral-500 mt-1">
                <span className="uppercase tracking-wide font-bold text-[10px] text-neutral-600">{t(`roles.${v.visitor.role}`)}</span>
                <span className="flex items-center gap-1 opacity-70"><Clock className="w-3 h-3" /> {new Date(v.visited_at).toLocaleDateString()}</span>
              </div>
            </div>

            {currentUser.isVip && (
              <button
                onClick={() => onOpenChat({ id: v.visitor_id, name: v.visitor.name, avatar: v.visitor.avatar })}
                className="p-3 text-neutral-400 hover:text-white hover:bg-crimson-900/50 rounded-full transition-colors"
              >
                <MessageSquare className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Visitors;
