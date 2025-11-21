import React, { useEffect, useState } from 'react';
import { History, X, ChevronRight, Clock, Trash2 } from 'lucide-react';
import { Language, HistoryItem } from '../types';
import { getSavedHistory } from '../services/geminiService';

interface HistorySidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectHistory: (query: string) => void;
  language: Language;
}

const HistorySidebar: React.FC<HistorySidebarProps> = ({ isOpen, onClose, onSelectHistory, language }) => {
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    if (isOpen) {
      setHistory(getSavedHistory(language));
    }
  }, [isOpen, language]);

  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/30 z-30 backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      <aside 
        className={`
          fixed top-0 right-0 h-screen z-40 w-72 bg-white border-l border-bible-200 flex flex-col shadow-2xl
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        <div className="p-4 border-b border-bible-100 flex items-center justify-between bg-bible-50">
          <div className="flex items-center gap-2 text-bible-900 font-display font-bold">
            <History className="w-5 h-5" />
            <span>{language === 'zh' ? '歷史存檔' : 'Saved History'}</span>
          </div>
          <button onClick={onClose} className="p-1 text-bible-400 hover:text-bible-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
          {history.length === 0 ? (
            <div className="text-center py-10 text-bible-400 text-sm">
              {language === 'zh' ? '尚無存檔記錄' : 'No saved history yet'}
            </div>
          ) : (
            history.map((item) => (
              <button
                key={item.key}
                onClick={() => {
                  onSelectHistory(item.query); // This will trigger the checkCacheExistence flow in App.tsx
                  onClose();
                }}
                className="w-full text-left bg-white border border-bible-100 rounded-lg p-3 hover:border-bible-400 hover:shadow-md transition-all group"
              >
                <div className="flex justify-between items-start">
                  <span className="font-bold text-bible-800 group-hover:text-bible-900">
                    {item.reference}
                  </span>
                  <ChevronRight className="w-4 h-4 text-bible-300 group-hover:text-bible-500" />
                </div>
                <div className="flex items-center gap-1 mt-2 text-xs text-bible-500">
                  <Clock className="w-3 h-3" />
                  {new Date(item.timestamp).toLocaleDateString()}
                </div>
              </button>
            ))
          )}
        </div>
      </aside>
    </>
  );
};

export default HistorySidebar;