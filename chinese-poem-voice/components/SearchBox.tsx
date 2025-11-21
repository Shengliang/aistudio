
import React, { useState, useEffect, useRef } from 'react';
import { Search, Mic, Loader2 } from './Icons';
import { Language } from '../types';

interface SearchBoxProps {
  onSearch: (query: string) => void;
  isSearching: boolean;
  language: Language;
}

const SearchBox: React.FC<SearchBoxProps> = ({ onSearch, isSearching, language }) => {
  const [query, setQuery] = useState('');
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      
      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setQuery(transcript);
        setIsListening(false);
        onSearch(transcript);
      };

      recognitionRef.current.onerror = (event: any) => {
        setIsListening(false);
      };
      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, [onSearch]); 

  useEffect(() => {
    if (recognitionRef.current) {
      recognitionRef.current.lang = language === 'zh' ? 'zh-TW' : 'en-US';
    }
  }, [language]);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Voice search is not supported in this browser.");
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setQuery('');
      recognitionRef.current.lang = language === 'zh' ? 'zh-TW' : 'en-US';
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) onSearch(query);
  };

  return (
    <form onSubmit={handleSubmit} className="relative group z-10">
      <div className={`absolute -inset-0.5 bg-gradient-to-r from-amber-900 to-amber-700 rounded-xl blur opacity-20 group-hover:opacity-50 transition duration-500 ${isListening ? 'animate-pulse opacity-60' : ''}`}></div>
      <div className="relative flex items-center bg-[#121212] rounded-xl border border-stone-800 shadow-sm focus-within:border-amber-700 transition-all">
        <Search className="w-5 h-5 text-stone-500 ml-4" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={language === 'zh' ? "輸入詩名或作者 (例如：李白 將進酒)..." : "Enter poem or author (e.g., Li Bai)..."}
          className="flex-grow py-4 px-4 text-lg bg-transparent focus:outline-none text-stone-200 placeholder-stone-600 font-serif"
        />
        <div className="pr-2 flex items-center gap-2">
          <button
            type="button"
            onClick={toggleListening}
            className={`p-3 rounded-lg transition-all duration-300 ${
              isListening 
                ? 'bg-red-900/30 text-red-500 animate-pulse' 
                : 'text-stone-500 hover:bg-stone-800 hover:text-stone-300'
            }`}
          >
            <Mic className={`w-5 h-5 ${isListening ? 'fill-current' : ''}`} />
          </button>
          <button
            type="submit"
            disabled={!query.trim() || isSearching}
            className="bg-amber-800 text-white p-3 rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
             {isSearching ? <Loader2 className="w-5 h-5 animate-spin" /> : <span className="font-bold text-sm px-2 font-serif">{language === 'zh' ? '搜尋' : 'SEARCH'}</span>}
          </button>
        </div>
      </div>
    </form>
  );
};

export default SearchBox;
