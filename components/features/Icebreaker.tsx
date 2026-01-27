import React, { useState } from 'react';
import { generateScenario } from '../../services/geminiService';
import { Flame, RefreshCw, Feather } from 'lucide-react';

const Icebreaker: React.FC = () => {
  const [topic, setTopic] = useState('Dominazione soft');
  const [intensity, setIntensity] = useState('Sensuale');
  const [scenario, setScenario] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    const result = await generateScenario(topic, intensity);
    setScenario(result);
    setLoading(false);
  };

  return (
    <div className="max-w-3xl mx-auto py-8">
      <div className="text-center mb-12">
        <Flame className="w-12 h-12 text-crimson-600 mx-auto mb-4 animate-pulse" />
        <h2 className="text-4xl font-serif text-white mb-4">Kink Explorer AI</h2>
        <p className="text-neutral-400">
            Non sapete come iniziare? Lasciate che l'intelligenza artificiale dipinga uno scenario per voi.
        </p>
      </div>

      <div className="bg-neutral-900 p-1 rounded-none border border-neutral-800 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
        <div className="bg-black p-8 border border-neutral-800">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div>
                    <label className="block text-xs uppercase tracking-widest text-neutral-500 mb-2">Fantasia</label>
                    <select 
                        value={topic} 
                        onChange={(e) => setTopic(e.target.value)}
                        className="w-full bg-neutral-900 text-white border border-neutral-800 px-4 py-3 focus:border-crimson-900 focus:outline-none font-serif"
                    >
                        <option value="Dominazione soft">Dominazione & Sottomissione Soft</option>
                        <option value="Voyeurismo">Voyeurismo & Esibizionismo</option>
                        <option value="Threesome MMF">Threesome (Lui-Lei-Lui)</option>
                        <option value="Threesome FFM">Threesome (Lei-Lui-Lei)</option>
                        <option value="Roleplay Sconosciuti">Roleplay: "Sconosciuti al bar"</option>
                        <option value="Massaggio Tantra">Massaggio Sensoriale</option>
                    </select>
                </div>
                
                <div>
                    <label className="block text-xs uppercase tracking-widest text-neutral-500 mb-2">Atmosfera</label>
                    <select 
                        value={intensity} 
                        onChange={(e) => setIntensity(e.target.value)}
                        className="w-full bg-neutral-900 text-white border border-neutral-800 px-4 py-3 focus:border-crimson-900 focus:outline-none font-serif"
                    >
                        <option value="Romantica">Romantica & Lenta</option>
                        <option value="Sensuale">Sensuale & Intensa</option>
                        <option value="Provocatoria">Provocatoria & Diretta</option>
                        <option value="Misteriosa">Misteriosa & Dark</option>
                    </select>
                </div>
            </div>

            <button 
                onClick={handleGenerate}
                disabled={loading}
                className="w-full bg-crimson-900 hover:bg-crimson-800 text-white font-serif uppercase tracking-[0.2em] py-4 transition-all flex items-center justify-center gap-3 border border-crimson-700 disabled:opacity-50 hover:shadow-[0_0_20px_rgba(185,28,28,0.3)]"
            >
                {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Feather className="w-5 h-5" />}
                Genera Scenario
            </button>

            <div className="mt-12 min-h-[150px] relative flex items-center justify-center">
                {scenario ? (
                    <div className="animate-fade-in text-center">
                        <div className="w-16 h-1 bg-gradient-to-r from-transparent via-crimson-900 to-transparent mx-auto mb-6"></div>
                        <p className="text-xl md:text-2xl font-serif text-neutral-200 leading-relaxed italic">
                            "{scenario}"
                        </p>
                        <div className="w-16 h-1 bg-gradient-to-r from-transparent via-crimson-900 to-transparent mx-auto mt-6"></div>
                    </div>
                ) : (
                    <p className="text-neutral-700 text-sm font-serif italic text-center">
                        Seleziona i parametri e attendi l'ispirazione...
                    </p>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default Icebreaker;