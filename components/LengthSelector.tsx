import React from 'react';
import { Clock } from './Icons';
import { Language } from '../types';

interface LengthSelectorProps {
  length: number;
  onChange: (length: number) => void;
  language: Language;
  disabled?: boolean;
}

const LengthSelector: React.FC<LengthSelectorProps> = ({ length, onChange, language, disabled }) => {
  const options = [1, 3, 5, 10, 15];

  return (
    <div className="relative">
      <label className="block text-xs font-medium text-bible-600 mb-1 uppercase tracking-wider flex items-center gap-1">
        <Clock className="w-3 h-3" />
        {language === 'zh' ? '時長' : 'Length'}
      </label>
      <select
        value={length}
        onChange={(e) => onChange(Number(e.target.value))}
        disabled={disabled}
        className="block w-full rounded-lg border-bible-300 bg-white py-2 pl-3 pr-8 text-sm focus:border-bible-500 focus:outline-none focus:ring-2 focus:ring-bible-500/50 disabled:opacity-50 shadow-sm transition-shadow cursor-pointer"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt} {language === 'zh' ? '分鐘' : 'min'}
          </option>
        ))}
      </select>
    </div>
  );
};

export default LengthSelector;