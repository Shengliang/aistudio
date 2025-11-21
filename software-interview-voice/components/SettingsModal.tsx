
import React, { useState, useEffect } from 'react';
import { X, Save, Key, Check, Trash2 } from './Icons';
import { Language } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, language }) => {
  const [apiKey, setApiKey] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const storedKey = localStorage.getItem('user_api_key');
      if (storedKey) setApiKey(storedKey);
    }
  }, [isOpen]);

  const handleSave = () => {
    localStorage.setItem('user_api_key', apiKey.trim());
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
      window.location.reload(); // Reload to apply new key
    }, 1000);
  };

  const handleClear = () => {
    localStorage.removeItem('user_api_key');
    setApiKey('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-stone-900 rounded-xl shadow-2xl w-full max-w-md border border-stone-700 text-stone-200">
        <div className="p-4 border-b border-stone-700 flex justify-between items-center">
          <h3 className="font-bold font-mono flex items-center gap-2">
            <Key className="w-4 h-4 text-tech-400" />
            {language === 'zh' ? 'API 設定' : 'API Configuration'}
          </h3>
          <button onClick={onClose} className="text-stone-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-mono uppercase text-stone-500">
              Google Gemini API Key
            </label>
            <input 
              type="password" 
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full bg-black border border-stone-700 rounded p-3 text-sm font-mono text-tech-400 focus:border-tech-500 focus:outline-none"
            />
            <p className="text-[10px] text-stone-500">
              {language === 'zh' 
                ? '您的 Key 僅存儲在本地瀏覽器中，用於直接調用 Google Gemini。' 
                : 'Your key is stored locally in your browser to access Google Gemini directly.'}
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleSave}
              className="flex-1 bg-tech-700 hover:bg-tech-600 text-white py-2 rounded flex items-center justify-center gap-2 font-mono text-sm transition-colors"
            >
              {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {saved ? 'Saved!' : 'Save Key'}
            </button>
            <button
              onClick={handleClear}
              className="px-3 py-2 border border-red-900/30 text-red-500 hover:bg-red-900/10 rounded"
              title="Clear Key"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
