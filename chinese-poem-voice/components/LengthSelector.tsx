
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
    <div className="relative min-w-[100px]">
      <div className="relative">
        <select
          value={length}
          onChange={(e) => onChange(Number(e.target.value))}
          disabled={disabled}
          className="block w-full rounded bg-stone-800 border border-stone-700 py-1.5 pl-8 pr-2 text-xs font-mono text-stone-300 focus:border-tech-500 focus:outline-none disabled:opacity-50 appearance-none"
        >
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt} {language === 'zh' ? 'mins' : 'mins'}
            </option>
          ))}
        </select>
        <Clock className="w-3 h-3 text-stone-500 absolute left-2.5 top-2" />
      </div>
    </div>
  );
};

export default LengthSelector;
