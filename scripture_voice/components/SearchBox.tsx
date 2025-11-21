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

  // Initialize speech recognition
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
        console.error("Speech recognition error", event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, [onSearch]); 

  // Update language whenever it changes
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
      // Ensure language is strictly set before starting
      recognitionRef.current.lang = language === 'zh' ? 'zh-TW' : 'en-US';
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative group z-10">
      <div className={`absolute -inset-1 bg-gradient-to-r from-bible-300 to-bible-500 rounded-xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200 ${isListening ? 'animate-pulse opacity-70' : ''}`}></div>
      <div className="relative flex items-center bg-white rounded-xl border border-bible-200 shadow-sm focus-within:ring-2 focus-within:ring-bible-500/50 transition-all">
        <Search className="w-5 h-5 text-bible-400 ml-4" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={language === 'zh' ? "搜尋經文 (例如：'愛是恆久忍耐', '約翰福音 3:16')..." : "Search verse (e.g., 'Love is patient', 'John 3:16')..."}
          className="flex-grow py-4 px-4 text-lg bg-transparent focus:outline-none text-bible-900 placeholder-bible-300 font-medium"
        />
        <div className="pr-2 flex items-center gap-2">
          <button
            type="button"
            onClick={toggleListening}
            className={`p-3 rounded-lg transition-all duration-300 ${
              isListening 
                ? 'bg-red-50 text-red-500 animate-pulse shadow-inner' 
                : 'text-bible-400 hover:bg-bible-50 hover:text-bible-700'
            }`}
            title={language === 'zh' ? "語音搜尋" : "Voice Search"}
          >
            <Mic className={`w-5 h-5 ${isListening ? 'fill-current' : ''}`} />
          </button>
          <button
            type="submit"
            disabled={!query.trim() || isSearching}
            className="bg-bible-800 text-white p-3 rounded-lg hover:bg-bible-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
             {isSearching ? <Loader2 className="w-5 h-5 animate-spin" /> : <span className="font-semibold text-sm px-2">{language === 'zh' ? '搜尋' : 'Find'}</span>}
          </button>
        </div>
      </div>
      {isListening && (
        <div className="absolute top-full left-0 right-0 text-center mt-2">
          <span className="inline-block bg-bible-800 text-white text-xs px-2 py-1 rounded-full animate-bounce">
            {language === 'zh' ? '聆聽中...' : 'Listening...'}
          </span>
        </div>
      )}
    </form>
  );
};

export default SearchBox;