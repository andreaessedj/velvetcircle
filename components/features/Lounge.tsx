import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { User, Confession, VaultItem } from '../../types';
import { api } from '../../services/db';
import {
  Sparkles,
  Radar,
  VenetianMask,
  Crown,
  Check,
  ChevronRight,
  ChevronLeft,
  Users,
  Zap,
  Heart,
  Star
} from 'lucide-react';

interface LoungeProps {
  currentUser: User;
  onViewChange: (view: any) => void;
  onOpenChat: (user: { id: string, name: string, avatar: string }) => void;
}

const Lounge: React.FC<LoungeProps> = ({ currentUser, onViewChange, onOpenChat }) => {
  const { t } = useTranslation();
  const [randomVaultPhotos, setRandomVaultPhotos] = useState<{ url: string, userName: string, userId: string, avatar: string }[]>([]);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [radarCount, setRadarCount] = useState(0);
  const [dailyConfession, setDailyConfession] = useState<Confession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. Fetch all users to find free Vault photos
        const users = await api.getUsers();
        const freePhotos: { url: string, userName: string, userId: string, avatar: string }[] = [];

        users.forEach(u => {
          if (u.gallery && u.gallery.length > 0) {
            u.gallery.forEach(item => {
              if (item.price === 0 && item.type === 'IMAGE' && item.url) {
                freePhotos.push({
                  url: item.url,
                  userName: u.name,
                  userId: u.id,
                  avatar: u.avatar
                });
              }
            });
          }
        });

        // Shuffle and take a few
        setRandomVaultPhotos(freePhotos.sort(() => Math.random() - 0.5).slice(0, 10));

        // 2. Fetch Radar Signals count
        const signals = await api.getRadarSignals();
        setRadarCount(signals.length);

        // 3. Fetch confessions and pick one (random for today)
        const confessions = await api.getConfessions();
        if (confessions.length > 0) {
          // Use a seed based on the date to keep it "daily"
          const today = new Date().toDateString();
          let seed = 0;
          for (let i = 0; i < today.length; i++) seed += today.charCodeAt(i);
          setDailyConfession(confessions[seed % confessions.length]);
        }
      } catch (err) {
        console.error("Dashboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Auto-rotate Vault photos
  useEffect(() => {
    if (randomVaultPhotos.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentPhotoIndex(prev => (prev + 1) % randomVaultPhotos.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [randomVaultPhotos]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-12 h-12 border-4 border-crimson-900 border-t-crimson-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-20 animate-fade-in">
      {/* 1. VAULT STORIES: Vertical Instagram-style carousel */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-2xl font-serif text-white mb-1">Vault Stories</h3>
            <p className="text-sm text-neutral-500 italic">Scopri i contenuti pubblici della community</p>
          </div>
          {randomVaultPhotos.length > 3 && (
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPhotoIndex(prev => Math.max(0, prev - 1))}
                disabled={currentPhotoIndex === 0}
                className="p-2 rounded-full bg-neutral-900 border border-neutral-800 text-white hover:bg-neutral-800 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentPhotoIndex(prev => Math.min(randomVaultPhotos.length - 3, prev + 1))}
                disabled={currentPhotoIndex >= randomVaultPhotos.length - 3}
                className="p-2 rounded-full bg-neutral-900 border border-neutral-800 text-white hover:bg-neutral-800 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {randomVaultPhotos.length > 0 ? (
          <div className="relative overflow-hidden">
            <div
              className="flex gap-4 transition-transform duration-500 ease-out"
              style={{ transform: `translateX(-${currentPhotoIndex * (100 / 3 + 1.33)}%)` }}
            >
              {randomVaultPhotos.map((photo, idx) => (
                <div
                  key={idx}
                  className="flex-shrink-0 w-[calc(33.333%-11px)] group cursor-pointer"
                  onClick={() => onOpenChat({ id: photo.userId, name: photo.userName, avatar: photo.avatar })}
                >
                  <div className="relative aspect-[9/16] rounded-2xl overflow-hidden border border-neutral-800 shadow-2xl bg-neutral-950 hover:border-gold-500/50 transition-all duration-300 hover:scale-[1.02]">
                    {/* Image */}
                    <img
                      src={photo.url}
                      alt={photo.userName}
                      className="w-full h-full object-cover"
                    />

                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-60 group-hover:opacity-40 transition-opacity"></div>

                    {/* User Info */}
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <img
                          src={photo.avatar}
                          alt={photo.userName}
                          className="w-10 h-10 rounded-full border-2 border-white/80 object-cover shadow-lg"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="text-white font-serif text-sm font-bold truncate drop-shadow-lg">{photo.userName}</h4>
                          <p className="text-[10px] text-white/80 uppercase tracking-wider font-black">Free Vault</p>
                        </div>
                      </div>

                      {/* View Button */}
                      <button
                        className="w-full py-2 bg-white/90 hover:bg-white text-black text-[10px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center justify-center gap-2 group-hover:scale-105"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenChat({ id: photo.userId, name: photo.userName, avatar: photo.avatar });
                        }}
                      >
                        <Heart className="w-3 h-3" /> View Profile
                      </button>
                    </div>

                    {/* Sparkle indicator */}
                    <div className="absolute top-3 right-3 p-1.5 bg-black/50 backdrop-blur-sm rounded-full border border-white/20">
                      <Sparkles className="w-3 h-3 text-gold-400" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-neutral-600 border border-dashed border-neutral-800 rounded-2xl">
            <Sparkles className="w-12 h-12 mb-4 opacity-20" />
            <p className="font-serif italic">Nuove storie in arrivo nel Vault...</p>
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 2. RADAR STATS */}
        <div
          onClick={() => onViewChange('RADAR')}
          className="lg:col-span-1 glass-card p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:border-crimson-600/50 transition-all group overflow-hidden"
        >
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-crimson-900/10 rounded-full blur-3xl group-hover:bg-crimson-900/20 transition-colors"></div>
          <div className="relative z-10">
            <div className="w-20 h-20 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center mb-6 mx-auto group-hover:scale-110 transition-transform duration-500">
              <Radar className="w-10 h-10 text-crimson-600 animate-pulse" />
            </div>
            <h4 className="text-[10px] uppercase font-black tracking-[0.4em] text-neutral-500 mb-2">Live Now</h4>
            <div className="text-6xl font-serif text-white mb-2">{radarCount}</div>
            <p className="text-sm text-neutral-400 font-serif italic mb-6">Membri attivi sul Radar in questo momento</p>
            <div className="flex items-center gap-2 text-crimson-500 text-[10px] font-black uppercase tracking-widest">
              Join the Radar <ChevronRight className="w-3 h-3" />
            </div>
          </div>
        </div>

        {/* 3. DAILY CONFESSION */}
        <div className="lg:col-span-2 glass-card p-8 relative flex flex-col justify-between overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-crimson-900 to-transparent"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-crimson-900/10 rounded border border-crimson-900/30">
                <VenetianMask className="w-5 h-5 text-crimson-500" />
              </div>
              <span className="text-[10px] uppercase font-black tracking-[0.3em] text-crimson-500">Confessione del Giorno</span>
            </div>

            {dailyConfession ? (
              <div className="space-y-6">
                <p className="text-2xl md:text-3xl font-serif text-white italic leading-relaxed">
                  "{dailyConfession.content.length > 250 ? dailyConfession.content.substring(0, 250) + '...' : dailyConfession.content}"
                </p>
                <div className="flex items-center gap-4 pt-4 border-t border-white/5">
                  <img src={dailyConfession.avatar} className="w-10 h-10 rounded-full border border-neutral-800" />
                  <div>
                    <p className="text-sm text-neutral-300 font-serif">{dailyConfession.author_alias}</p>
                    <div className="flex gap-2 mt-1">
                      {dailyConfession.tags.map(tag => (
                        <span key={tag} className="text-[9px] uppercase px-2 py-0.5 bg-neutral-900 text-neutral-500 rounded border border-neutral-800">{tag}</span>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => onViewChange('CONFESSIONAL')}
                    className="ml-auto p-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-500 hover:text-white rounded-full transition-all"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-neutral-600 font-serif italic text-lg py-10">Il confessionale attende nuove verità...</p>
            )}
          </div>
        </div>
      </div>

      {/* 4. VIP MEMBERSHIP SUMMARY */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-neutral-900 via-black to-black border border-gold-900/30 p-10 md:p-14 shadow-2xl group">
        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 group-hover:opacity-10 transition-all duration-1000">
          <Crown className="w-64 h-64 text-gold-500" />
        </div>

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold-950 border border-gold-900/50 text-gold-500 text-[10px] font-black uppercase tracking-widest mb-6">
              <Star className="w-3 h-3 fill-current" /> Premium Membership
            </div>
            <h2 className="text-4xl md:text-5xl font-serif text-white mb-6 leading-tight">
              Entra nel <span className="text-gold-500">Cerchio Interno</span>
            </h2>
            <p className="text-neutral-400 font-serif italic text-lg leading-relaxed mb-8">
              Velvet Gold è molto più di un abbonamento. È il passaporto per un'esperienza senza limiti, discreta e potenziata dall'intelligenza artificiale.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {[
                { title: "L'Oracolo", desc: "Match IA giornaliero" },
                { title: "Velvet Key", desc: "Invita i tuoi amici" },
                { title: "Shadow Mode", desc: "Chi spia il tuo profilo?" },
                { title: "Elite Badge", desc: "Distinguiti nel club" }
              ].map((feat, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="mt-1 bg-gold-900/20 p-1 rounded-full"><Check className="w-3 h-3 text-gold-500" /></div>
                  <div>
                    <h5 className="text-white text-sm font-bold">{feat.title}</h5>
                    <p className="text-xs text-neutral-500">{feat.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col items-center justify-center text-center bg-white/5 backdrop-blur-md rounded-2xl p-10 border border-white/10">
            <div className="text-gold-500 text-[10px] uppercase font-black tracking-[0.4em] mb-4">Solo per i veri intenditori</div>
            <div className="text-7xl font-serif text-white mb-2">€5</div>
            <div className="text-neutral-500 uppercase text-[9px] font-black tracking-[0.3em] mb-10">All inclusive / Mese</div>

            <button
              onClick={() => onViewChange('MEMBERSHIP')}
              className="w-full py-5 bg-gold-600 hover:bg-gold-500 text-black font-black uppercase text-xs tracking-[0.2em] rounded-xl transition-all shadow-[0_15px_30px_rgba(234,179,8,0.2)] hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3"
            >
              <Zap className="w-4 h-4 fill-current" /> Attiva Privilegi
            </button>
            <p className="text-[9px] text-neutral-600 mt-6 uppercase tracking-[0.1em]">Discrezione totale garantita sull'estratto conto</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Lounge;
