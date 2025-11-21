
import React from 'react';
import { Database, RefreshCw, X, Clock, Server } from './Icons';
import { Language, SearchResult } from '../types';

interface CacheModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadCache: () => void;
  onGenerateNew: () => void;
  cachedData: SearchResult | null;
  language: Language;
}

const CacheModal: React.FC<CacheModalProps> = ({ 
  isOpen, 
  onClose, 
  onLoadCache, 
  onGenerateNew, 
  cachedData,
  language 
}) => {
  if (!isOpen || !cachedData) return null;

  const isOffline = !navigator.onLine;

  const formatDate = (ts?: number) => {
    if (!ts) return '';
    return new Date(ts).toLocaleString(language === 'zh' ? 'zh-TW' : 'en-US');
  };

  // Safely access topic data
  const title = cachedData.topic?.title || "Unknown Topic";
  const techStack = cachedData.topic?.techStack || "General";
  const overview = cachedData.topic?.overview || "";

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-tech-200">
        <div className="bg-tech-50 p-4 border-b border-tech-100 flex justify-between items-center">
          <h3 className="font-bold text-tech-900 flex items-center gap-2">
            <Database className="w-5 h-5 text-tech-600" />
            {language === 'zh' ? '發現存檔' : 'Saved Content Found'}
          </h3>
          <button onClick={onClose} className="text-tech-400 hover:text-tech-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <p className="text-tech-700 mb-4 text-sm leading-relaxed">
            {language === 'zh' 
              ? '我們發現您之前已經生成過這個主題。您希望直接從存檔加載（速度快/離線可用），還是重新生成（需要聯網）？'
              : 'We found a previously generated version of this topic. Would you like to load it from storage (Fast/Offline) or generate a new one?'}
          </p>

          <div className="bg-stone-50 rounded-lg p-3 mb-6 border border-tech-100">
            <div className="font-bold text-tech-900 flex justify-between items-start">
              <span>{title}</span>
              <span className="text-[10px] px-2 py-0.5 bg-tech-200 text-tech-600 rounded-full font-mono">{techStack}</span>
            </div>
            <div className="text-xs text-tech-500 flex items-center gap-1 mt-2">
              <Clock className="w-3 h-3" />
              {formatDate(cachedData.timestamp)}
            </div>
            <div className="text-xs text-tech-600 mt-2 line-clamp-2 italic font-serif">
              "{overview}"
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={onLoadCache}
              className="flex items-center justify-center gap-2 bg-tech-600 text-white py-3 rounded-xl font-medium hover:bg-tech-700 transition-colors shadow-sm"
            >
              <Server className="w-4 h-4" />
              {language === 'zh' ? '加載存檔' : 'Load Saved'}
            </button>

            <button
              onClick={onGenerateNew}
              disabled={isOffline}
              className={`
                flex items-center justify-center gap-2 border border-tech-300 py-3 rounded-xl font-medium transition-colors
                ${isOffline ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : 'bg-white text-tech-700 hover:bg-tech-50 hover:text-tech-900'}
              `}
            >
              <RefreshCw className="w-4 h-4" />
              {language === 'zh' ? '重新生成' : 'Generate New'}
            </button>
          </div>
          
          {isOffline && (
            <p className="text-xs text-red-500 text-center mt-3">
              {language === 'zh' ? '* 目前處於離線狀態，只能加載存檔' : '* You are offline. Can only load saved content.'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default CacheModal;
