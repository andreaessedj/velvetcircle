import React, { useState } from 'react';
import { ArrowRight, Lock, Eye, Flame, Key, GlassWater, Crown } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface LandingPageProps {
    onEnter: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onEnter }) => {
    const { t } = useTranslation();
    const [ageVerified, setAgeVerified] = useState(false);

    return (
        <div className="min-h-screen bg-black text-neutral-200 font-sans selection:bg-crimson-900 selection:text-white">
            {/* Background Ambience */}
            <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-velvet-900 via-black to-black opacity-60 z-0"></div>

            {/* Main Container */}
            <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 py-12">

                {/* Logo Area */}
                <div className="mb-12 text-center animate-fade-in">
                    <div className="inline-block p-4 rounded-full border border-crimson-900/50 bg-black/50 mb-6 shadow-[0_0_30px_rgba(220,38,38,0.2)]">
                        <Crown className="w-16 h-16 text-crimson-700" strokeWidth={1} />
                    </div>
                    <h1 className="text-5xl md:text-7xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-b from-neutral-100 to-neutral-600 mb-4 tracking-widest">
                        VELVET CIRCLE
                    </h1>
                    <p className="text-crimson-500 tracking-[0.2em] text-sm uppercase">{t('landing.private_members_club')}</p>
                </div>

                {!ageVerified ? (
                    /* Age Gate */
                    <div className="max-w-md w-full bg-neutral-900/80 backdrop-blur-md border border-crimson-900/30 p-8 rounded-none text-center shadow-2xl">
                        <Lock className="w-8 h-8 mx-auto text-neutral-500 mb-4" />
                        <h2 className="text-2xl font-serif text-white mb-4">{t('landing.access_reserved')}</h2>
                        <p className="text-neutral-400 mb-8 leading-relaxed">
                            {t('landing.age_gate_text')}
                        </p>
                        <div className="space-y-4">
                            <button
                                onClick={() => setAgeVerified(true)}
                                className="w-full py-4 bg-crimson-900 hover:bg-crimson-800 text-white font-serif uppercase tracking-widest transition-all border border-crimson-700 hover:shadow-[0_0_20px_rgba(220,38,38,0.4)]"
                            >
                                {t('landing.over_18')}
                            </button>
                            <button className="w-full py-3 text-neutral-500 hover:text-neutral-300 text-sm">
                                {t('landing.exit')}
                            </button>
                        </div>
                    </div>
                ) : (
                    /* Entry Actions */
                    <div className="max-w-4xl w-full animate-fade-in">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                            {[
                                { icon: Eye, title: t('landing.features.voyeur.title'), desc: t('landing.features.voyeur.desc') },
                                { icon: Flame, title: t('landing.features.scambio.title'), desc: t('landing.features.scambio.desc') },
                                { icon: Key, title: t('landing.features.prive.title'), desc: t('landing.features.prive.desc') }
                            ].map((f, i) => (
                                <div key={i} className="bg-neutral-900/50 border border-neutral-800 p-6 hover:border-crimson-900/50 transition-colors text-center group">
                                    <f.icon className="w-8 h-8 mx-auto text-neutral-600 group-hover:text-crimson-600 transition-colors mb-4" />
                                    <h3 className="text-lg font-serif text-neutral-300 mb-2">{f.title}</h3>
                                    <p className="text-sm text-neutral-500">{f.desc}</p>
                                </div>
                            ))}
                        </div>

                        <div className="text-center">
                            <button
                                onClick={onEnter}
                                className="group relative inline-flex items-center gap-4 px-12 py-5 bg-gradient-to-r from-crimson-900 to-velvet-900 text-neutral-200 font-serif text-xl border border-crimson-800 hover:border-crimson-500 transition-all shadow-[0_0_30px_rgba(0,0,0,0.8)]"
                            >
                                {t('landing.access_club')}
                                <ArrowRight className="w-5 h-5 text-crimson-500 group-hover:translate-x-1 transition-transform" />
                            </button>
                            <p className="mt-6 text-xs text-neutral-600">{t('landing.discretion_guaranteed')}</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LandingPage;