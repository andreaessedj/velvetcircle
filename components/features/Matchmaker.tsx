import React, { useState, useEffect } from 'react';
import { User } from '../../types';
import { analyzeLibertineMatch } from '../../services/geminiService';
import { api } from '../../services/db';
import { Sparkles, X, Heart, Info, Loader } from 'lucide-react';

interface MatchmakerProps {
  currentUser: User;
}

const Matchmaker: React.FC<MatchmakerProps> = ({ currentUser }) => {
  const [profiles, setProfiles] = useState<User[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [analysis, setAnalysis] = useState<{score: number, advice: string} | null>(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [showInfo, setShowInfo] = useState(false);

  useEffect(() => {
    const loadProfiles = async () => {
        try {
            const data = await api.getUsers();
            // Filtra se stesso dai risultati
            const others = data.filter(u => u.id !== currentUser.id);
            setProfiles(others);
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingProfiles(false);
        }
    };
    loadProfiles();
  }, [currentUser.id]);

  const currentProfile = profiles[currentIndex];

  const handleAnalyze = async () => {
    if (!currentProfile) return;
    setLoadingAnalysis(true);
    const result = await analyzeLibertineMatch(
        currentUser.bio, currentUser.desires, 
        currentProfile.bio || '', currentProfile.desires || []
    );
    setAnalysis(result);
    setLoadingAnalysis(false);
  };

  const nextProfile = () => {
    setAnalysis(null);
    setCurrentIndex((prev) => (prev + 1) % profiles.length);
  };

  if (loadingProfiles) return <div className="flex justify-center items-center h-full"><Loader className="animate-spin text-crimson-600" /></div>;

  if (!currentProfile) return <div className="text-center text-neutral-500 py-20 font-serif">Nessun altro profilo nei paraggi.</div>;

  return (
    <div className="max-w-5xl mx-auto h-full flex flex-col">
      <div className="mb-6 flex justify-between items-end">
        <div>
            <h2 className="text-3xl font-serif text-white mb-1">Encounters</h2>
            <p className="text-neutral-500 text-sm tracking-wide uppercase">Trova chi condivide le tue fantasie</p>
        </div>
        <div className="text-crimson-600 text-sm font-serif">{currentIndex + 1} / {profiles.length}</div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 flex-1">
        {/* Profile Card */}
        <div className="flex-1 bg-neutral-900 border border-neutral-800 shadow-2xl relative group overflow-hidden">
          <div className="h-[400px] relative">
             <img src={currentProfile.avatar} alt={currentProfile.name} className="w-full h-full object-cover filter brightness-[0.8] group-hover:brightness-100 transition-all duration-700" />
             <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-90" />
             <div className="absolute bottom-0 left-0 p-8 w-full">
                <div className="flex justify-between items-center mb-2">
                    <h3 className="text-3xl font-serif text-white">{currentProfile.name}</h3>
                    <button onClick={() => setShowInfo(!showInfo)} className="text-neutral-400 hover:text-white"><Info className="w-6 h-6"/></button>
                </div>
                <span className="inline-block bg-crimson-900/80 text-white text-xs px-3 py-1 font-serif tracking-widest uppercase mb-4 border border-crimson-700">
                    {currentProfile.role?.replace('_', ' ')}
                </span>
                
                <div className={`transition-all duration-500 overflow-hidden ${showInfo ? 'max-h-96 opacity-100' : 'max-h-24 opacity-80'}`}>
                    <p className="text-neutral-300 text-lg leading-relaxed italic font-serif mb-4">"{currentProfile.bio}"</p>
                    
                    <div className="grid grid-cols-2 gap-4 mt-4">
                        <div>
                            <span className="text-xs text-green-700 uppercase tracking-widest font-bold block mb-2">Desideri</span>
                            <div className="flex flex-wrap gap-1">
                                {currentProfile.desires?.map(d => <span key={d} className="text-xs bg-neutral-800 text-neutral-300 px-2 py-1 border border-neutral-700">{d}</span>)}
                            </div>
                        </div>
                        <div>
                            <span className="text-xs text-crimson-700 uppercase tracking-widest font-bold block mb-2">Limiti</span>
                            <div className="flex flex-wrap gap-1">
                                {currentProfile.limits?.map(l => <span key={l} className="text-xs bg-neutral-800 text-neutral-400 px-2 py-1 border border-neutral-700">{l}</span>)}
                            </div>
                        </div>
                    </div>
                </div>
             </div>
          </div>

          <div className="p-6 bg-black flex gap-4 border-t border-neutral-800">
            <button 
              onClick={nextProfile}
              className="flex-1 py-4 border border-neutral-700 text-neutral-500 hover:bg-neutral-900 hover:text-white transition-colors flex items-center justify-center gap-2 uppercase tracking-widest text-sm"
            >
              <X className="w-5 h-5"/> Passa
            </button>
            <button 
              onClick={handleAnalyze}
              disabled={loadingAnalysis || analysis !== null}
              className="flex-[2] py-4 bg-crimson-900 text-white hover:bg-crimson-800 transition-all flex items-center justify-center gap-2 border border-crimson-700 disabled:opacity-50 uppercase tracking-widest text-sm font-bold shadow-[0_0_15px_rgba(185,28,28,0.3)]"
            >
              {loadingAnalysis ? (
                  <span className="animate-pulse">Consultando gli astri...</span>
              ) : (
                  <><Sparkles className="w-4 h-4"/> Compatibilità</>
              )}
            </button>
          </div>
        </div>

        {/* AI Result */}
        <div className={`w-full lg:w-80 transition-all duration-500 ${analysis ? 'opacity-100 translate-x-0' : 'opacity-50 translate-x-10 lg:translate-x-0'}`}>
            {analysis ? (
                <div className="bg-neutral-900 border border-crimson-900/30 p-8 h-full flex flex-col items-center justify-center text-center animate-fade-in relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-crimson-600 to-transparent"></div>
                    
                    <h3 className="text-lg font-serif text-crimson-500 mb-6 tracking-widest uppercase">Affinità</h3>
                    
                    <div className="relative w-32 h-32 mb-8 flex items-center justify-center">
                        <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                            <circle cx="64" cy="64" r="60" stroke="#171717" strokeWidth="8" fill="transparent" />
                            <circle cx="64" cy="64" r="60" stroke="#b91c1c" strokeWidth="8" fill="transparent" strokeDasharray={377} strokeDashoffset={377 - (377 * analysis.score) / 100} className="transition-all duration-1000 ease-out" />
                        </svg>
                        <span className="text-4xl font-serif text-white">{analysis.score}%</span>
                    </div>

                    <p className="text-neutral-300 italic font-serif leading-relaxed mb-8">
                        "{analysis.advice}"
                    </p>

                    <button className="w-full py-4 bg-white text-black font-serif font-bold hover:bg-neutral-200 transition-colors flex items-center justify-center gap-2 uppercase tracking-widest text-xs">
                        <Heart className="w-4 h-4 text-crimson-600 fill-current" />
                        Invita
                    </button>
                </div>
            ) : (
                <div className="h-full border border-neutral-900 bg-neutral-950/50 flex flex-col items-center justify-center p-8 text-center text-neutral-600">
                    <Sparkles className="w-12 h-12 mb-4 opacity-20" />
                    <p className="font-serif text-sm">Richiedi l'analisi dell'IA per scoprire se le vostre fantasie coincidono.</p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default Matchmaker;
