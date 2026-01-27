import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Instagram, Shield, Scale, FileText, LifeBuoy } from 'lucide-react';
import { DashboardView } from '../types';
import { api } from '../services/db';
import LanguageSwitcher from './LanguageSwitcher';

interface FooterProps {
  onViewChange: (view: DashboardView) => void;
  onContactClick: () => void;
}

const Footer: React.FC<FooterProps> = ({ onViewChange, onContactClick }) => {
  const { t } = useTranslation();
  const [statCount, setStatCount] = useState<number | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const count = await api.getSiteStats();
        setStatCount(count);
      } catch (e) {
        console.error("Footer: stats error", e);
      }
    };
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed bottom-0 left-0 md:left-72 right-0 bg-black/95 backdrop-blur-md border-t border-neutral-900 z-[100] px-4 py-2 md:py-1 flex flex-col md:flex-row items-center justify-between gap-1">

      {/* Group: Copy & Stats */}
      <div className="flex items-center gap-3">
        <span className="text-[7px] md:text-[9px] text-neutral-500 font-mono tracking-widest uppercase">
          © {new Date().getFullYear()} VELVET CIRCLE
          {statCount !== null && (
            <span className="text-crimson-600 font-bold ml-1">
              • {statCount.toLocaleString()}
            </span>
          )}
        </span>
      </div>

      {/* Group: Language & Links */}
      <div className="flex items-center gap-4 md:gap-8">

        {/* Switch Lingua sempre visibile */}
        <div className="flex items-center scale-90 md:scale-100">
          <LanguageSwitcher />
        </div>

        <div className="w-px h-3 bg-neutral-800"></div>

        {/* Legal Links Group */}
        <div className="flex items-center gap-4 md:gap-6">
          <button
            onClick={() => onViewChange('RULES')}
            className="text-neutral-500 hover:text-white transition-colors flex items-center gap-1"
          >
            <Scale className="w-3 h-3 group-hover:text-crimson-600" />
            <span className="text-[8px] md:text-[9px] uppercase font-bold">{t('footer.rules')}</span>
          </button>

          <button
            onClick={() => onViewChange('PRIVACY')}
            className="text-neutral-500 hover:text-white transition-colors flex items-center gap-1"
          >
            <Shield className="w-3 h-3 group-hover:text-blue-500" />
            <span className="text-[8px] md:text-[9px] uppercase font-bold">{t('footer.privacy')}</span>
          </button>

          <button
            onClick={onContactClick}
            className="text-crimson-600 hover:text-crimson-400 transition-colors font-bold flex items-center gap-1"
          >
            <LifeBuoy className="w-3 h-3 group-hover:rotate-12 transition-transform" />
            <span className="text-[8px] md:text-[9px] uppercase tracking-tight">{t('footer.support')}</span>
          </button>
        </div>

        {/* Social */}
        <a
          href="https://instagram.com/velvetcirclereal"
          target="_blank"
          rel="noopener noreferrer"
          className="text-neutral-500 hover:text-crimson-500 transition-all p-1"
        >
          <Instagram className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
};

export default Footer;
