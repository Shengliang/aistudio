
import React from 'react';
import { Language } from '../types';
import { Globe } from './Icons';

interface LanguageSelectorProps {
  language: Language;
  onChange: (lang: Language) => void;
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({ language, onChange }) => {
  return (
    <div className="flex items-center bg-stone-800 rounded border border-stone-700 overflow-hidden">
      <button
        onClick={() => onChange('en')}
        className={`px-3 py-1.5 text-xs font-mono transition-all ${
          language === 'en'
            ? 'bg-tech-700 text-white font-bold'
            : 'text-stone-500 hover:text-stone-300'
        }`}
      >
        EN
      </button>
      <button
        onClick={() => onChange('zh')}
        className={`px-3 py-1.5 text-xs font-mono transition-all ${
          language === 'zh'
            ? 'bg-tech-700 text-white font-bold'
            : 'text-stone-500 hover:text-stone-300'
        }`}
      >
        中文
      </button>
    </div>
  );
};

export default LanguageSelector;
