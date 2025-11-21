import React from 'react';
import { Language } from '../types';
import { Globe } from './Icons';

interface LanguageSelectorProps {
  language: Language;
  onChange: (lang: Language) => void;
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({ language, onChange }) => {
  return (
    <div className="flex items-center gap-2 bg-bible-50 rounded-lg p-1 border border-bible-200">
      <div className="px-2 text-bible-400">
        <Globe className="w-4 h-4" />
      </div>
      <button
        onClick={() => onChange('en')}
        className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${
          language === 'en'
            ? 'bg-white text-bible-900 shadow-sm'
            : 'text-bible-500 hover:text-bible-700'
        }`}
      >
        English
      </button>
      <button
        onClick={() => onChange('zh')}
        className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${
          language === 'zh'
            ? 'bg-white text-bible-900 shadow-sm'
            : 'text-bible-500 hover:text-bible-700'
        }`}
      >
        中文
      </button>
    </div>
  );
};

export default LanguageSelector;
