import React from 'react';
import { useTranslation } from 'react-i18next';
import { Languages } from 'lucide-react';

const LanguageSwitcher: React.FC = () => {
    const { i18n } = useTranslation();

    const toggleLanguage = () => {
        const newLang = i18n.language === 'it' ? 'en' : 'it';
        i18n.changeLanguage(newLang);
    };

    const currentLang = i18n.language;

    return (
        <button
            onClick={toggleLanguage}
            className="flex items-center gap-2 group transition-all"
            title={currentLang === 'it' ? 'Switch to English' : 'Passa all\'Italiano'}
        >
            <div className="w-5 h-5 rounded-full overflow-hidden flex items-center justify-center bg-neutral-900 border border-neutral-800 text-xs">
                {currentLang === 'it' ? (
                    <span className="leading-none">🇮🇹</span>
                ) : (
                    <span className="leading-none">🇬🇧</span>
                )}
            </div>
            <span className="text-[9px] uppercase font-bold tracking-widest text-neutral-500 group-hover:text-white">
                {currentLang === 'it' ? 'IT' : 'EN'}
            </span>
        </button>
    );
};

export default LanguageSwitcher;
