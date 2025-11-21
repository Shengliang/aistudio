import React from 'react';
import { VoiceName } from '../types';

interface VoiceSelectorProps {
  selectedVoice: VoiceName;
  onChange: (voice: VoiceName) => void;
  disabled?: boolean;
}

const VoiceSelector: React.FC<VoiceSelectorProps> = ({ selectedVoice, onChange, disabled }) => {
  return (
    <div className="relative">
      <label htmlFor="voice-select" className="block text-xs font-medium text-bible-600 mb-1 uppercase tracking-wider">
        Narrator Voice
      </label>
      <select
        id="voice-select"
        value={selectedVoice}
        onChange={(e) => onChange(e.target.value as VoiceName)}
        disabled={disabled}
        className="block w-full rounded-lg border-bible-300 bg-white py-2 pl-3 pr-10 text-sm focus:border-bible-500 focus:outline-none focus:ring-2 focus:ring-bible-500/50 disabled:opacity-50 shadow-sm transition-shadow"
      >
        {Object.values(VoiceName).map((voice) => (
          <option key={voice} value={voice}>
            {voice}
          </option>
        ))}
      </select>
    </div>
  );
};

export default VoiceSelector;