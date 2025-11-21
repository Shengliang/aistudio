
import React from 'react';
import { VoiceName } from '../types';

interface VoiceSelectorProps {
  selectedVoice: VoiceName;
  onChange: (voice: VoiceName) => void;
  disabled?: boolean;
}

const VoiceSelector: React.FC<VoiceSelectorProps> = ({ selectedVoice, onChange, disabled }) => {
  return (
    <div className="relative min-w-[120px]">
      <select
        id="voice-select"
        value={selectedVoice}
        onChange={(e) => onChange(e.target.value as VoiceName)}
        disabled={disabled}
        className="block w-full rounded bg-stone-800 border border-stone-700 py-1.5 pl-3 pr-8 text-xs font-mono text-stone-300 focus:border-tech-500 focus:outline-none disabled:opacity-50"
      >
        {Object.values(VoiceName).map((voice) => (
          <option key={voice} value={voice}>
            Voice: {voice}
          </option>
        ))}
      </select>
    </div>
  );
};

export default VoiceSelector;
