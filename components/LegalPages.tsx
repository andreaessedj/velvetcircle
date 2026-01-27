import React from 'react';
import { useTranslation } from 'react-i18next';
import { Shield, Scale, FileText, ChevronLeft, Instagram } from 'lucide-react';

interface LegalPageProps {
  type: 'RULES' | 'TERMS' | 'PRIVACY';
  onBack: () => void;
}

const LegalPages: React.FC<LegalPageProps> = ({ type, onBack }) => {
  const { t } = useTranslation();

  const renderRules = () => (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center gap-4 mb-8">
        <Scale className="w-10 h-10 text-crimson-600" />
        <h2 className="text-4xl font-serif text-white">{t('legal.rules.title')}</h2>
      </div>

      <section className="space-y-4">
        <h3 className="text-xl font-serif text-crimson-500 uppercase tracking-widest">{t('legal.rules.section1.title')}</h3>
        <p className="text-neutral-300 leading-relaxed">
          {t('legal.rules.section1.content')}
        </p>
      </section>

      <section className="space-y-4">
        <h3 className="text-xl font-serif text-crimson-500 uppercase tracking-widest">{t('legal.rules.section2.title')}</h3>
        <p className="text-neutral-300 leading-relaxed">
          {t('legal.rules.section2.content')}
        </p>
      </section>

      <section className="space-y-4">
        <h3 className="text-xl font-serif text-crimson-500 uppercase tracking-widest">{t('legal.rules.section3.title')}</h3>
        <p className="text-neutral-300 leading-relaxed">
          {t('legal.rules.section3.content')}
        </p>
      </section>

      <section className="space-y-4">
        <h3 className="text-xl font-serif text-crimson-500 uppercase tracking-widest">{t('legal.rules.section4.title')}</h3>
        <p className="text-neutral-300 leading-relaxed">
          {t('legal.rules.section4.content')}
        </p>
      </section>
    </div>
  );

  const renderTerms = () => (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center gap-4 mb-8">
        <FileText className="w-10 h-10 text-gold-500" />
        <h2 className="text-4xl font-serif text-white">{t('legal.terms.title')}</h2>
      </div>

      <section className="space-y-4">
        <h3 className="text-xl font-serif text-gold-500 uppercase tracking-widest">{t('legal.terms.section1.title')}</h3>
        <p className="text-neutral-300 leading-relaxed">
          {t('legal.terms.section1.content')}
        </p>
      </section>

      <section className="space-y-4">
        <h3 className="text-xl font-serif text-gold-500 uppercase tracking-widest">{t('legal.terms.section2.title')}</h3>
        <p className="text-neutral-300 leading-relaxed">
          {t('legal.terms.section2.content')}
        </p>
      </section>

      <section className="space-y-4">
        <h3 className="text-xl font-serif text-gold-500 uppercase tracking-widest">{t('legal.terms.section3.title')}</h3>
        <p className="text-neutral-300 leading-relaxed">
          {t('legal.terms.section3.content')}
        </p>
      </section>
    </div>
  );

  const renderPrivacy = () => (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center gap-4 mb-8">
        <Shield className="w-10 h-10 text-neutral-400" />
        <h2 className="text-4xl font-serif text-white">{t('legal.privacy.title')}</h2>
      </div>

      <section className="space-y-4">
        <h3 className="text-xl font-serif text-neutral-400 uppercase tracking-widest">{t('legal.privacy.section1.title')}</h3>
        <p className="text-neutral-300 leading-relaxed">
          {t('legal.privacy.section1.content')}
        </p>
      </section>

      <section className="space-y-4">
        <h3 className="text-xl font-serif text-neutral-400 uppercase tracking-widest">{t('legal.privacy.section2.title')}</h3>
        <p className="text-neutral-300 leading-relaxed">
          {t('legal.privacy.section2.content')}
        </p>
      </section>

      <section className="space-y-4">
        <h3 className="text-xl font-serif text-neutral-400 uppercase tracking-widest">{t('legal.privacy.section3.title')}</h3>
        <p className="text-neutral-300 leading-relaxed">
          {t('legal.privacy.section3.content')}
        </p>
      </section>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto py-10 px-6 bg-black/50 border border-neutral-800 shadow-2xl">
      <button
        onClick={onBack}
        className="mb-8 flex items-center gap-2 text-neutral-500 hover:text-white transition-colors uppercase text-xs tracking-widest font-bold"
      >
        <ChevronLeft className="w-4 h-4" /> {t('common.back_to_club')}
      </button>

      {type === 'RULES' && renderRules()}
      {type === 'TERMS' && renderTerms()}
      {type === 'PRIVACY' && renderPrivacy()}

      <div className="mt-20 pt-10 border-t border-neutral-900 flex flex-col items-center gap-6">
        <p className="text-neutral-600 font-serif italic">{t('legal.follow_shadow')}</p>
        <a
          href="https://instagram.com/velvetcirclereal"
          target="_blank"
          rel="noopener noreferrer"
          className="p-4 bg-neutral-900 rounded-full border border-neutral-800 hover:border-crimson-600 hover:text-crimson-500 transition-all group"
        >
          <Instagram className="w-6 h-6 group-hover:scale-110 transition-transform" />
        </a>
      </div>
    </div>
  );
};

export default LegalPages;
