
import React, { useState, useRef, useEffect } from 'react';
import { Scroll, Loader2, Volume2, Menu, History, Settings, ClipboardCopy, Feather, Play, Pause, ChevronLeft, ChevronRight, Brain, Users, BookOpen } from './components/Icons';
import SearchBox from './components/SearchBox';
import VoiceSelector from './components/VoiceSelector';
import LanguageSelector from './components/LanguageSelector';
import LengthSelector from './components/LengthSelector';
import AudioPlayer from './components/AudioPlayer';
import TopicNavigation from './components/TopicNavigation';
import AboutModal from './components/AboutModal';
import CacheModal from './components/CacheModal';
import HistorySidebar from './components/HistorySidebar';
import SettingsModal from './components/SettingsModal';
import { SearchResult, VoiceName, Language, PlaylistItem } from './types';
import { searchDBTopic, generateSegmentSpeech, checkCacheExistence, getSavedHistory } from './services/geminiService';
import { splitTextIntoChunks } from './utils/audioUtils';

const App: React.FC = () => {
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  
  const [audioUrl, setAudioUrl] = useState<string | undefined>(undefined);
  const [playlist, setPlaylist] = useState<PlaylistItem[]>([]);
  const [currentChunkIndex, setCurrentChunkIndex] = useState(0);
  const [isBuffering, setIsBuffering] = useState(false);
  const [currentAudioTitle, setCurrentAudioTitle] = useState<string>("");
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  
  const audioCache = useRef<Record<number, string>>({});
  const audioPromises = useRef<Record<number, Promise<string>>>({});
  const scrollRefs = useRef<(HTMLDivElement | null)[]>([]);
  const mainContainerRef = useRef<HTMLDivElement>(null);

  const [selectedVoice, setSelectedVoice] = useState<VoiceName>(VoiceName.Fenrir); // Master Default
  const [podcastLength, setPodcastLength] = useState<number>(3); 
  
  const [language, setLanguage] = useState<Language>('zh'); // Default to Chinese
  const [error, setError] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const [pendingCacheData, setPendingCacheData] = useState<SearchResult | null>(null);
  const [pendingQuery, setPendingQuery] = useState<string>('');

  const CLIENT_VERSION = "8.0.0-Poem";
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (searchResult && scrollRefs.current[currentChunkIndex] && mainContainerRef.current) {
      const activeEl = scrollRefs.current[currentChunkIndex];
      const container = mainContainerRef.current;
      
      if (activeEl && container) {
        const activeRect = activeEl.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        const offsetTop = activeRect.top - containerRect.top + container.scrollTop;
        const centeredTop = offsetTop - (container.clientHeight / 2) + (activeRect.height / 2);
        container.scrollTo({ top: centeredTop, behavior: 'smooth' });
      }
    }
  }, [currentChunkIndex, searchResult]);

  const resetAudioState = () => {
    setAudioUrl(undefined);
    setPlaylist([]);
    setCurrentChunkIndex(0);
    audioCache.current = {};
    audioPromises.current = {};
    setIsGeneratingAudio(false);
    setIsBuffering(false);
    setCurrentAudioTitle("");
    scrollRefs.current = [];
  };

  const handleSearchRequest = (query: string) => {
    const cached = checkCacheExistence(query, language);
    if (cached) {
      setPendingQuery(query);
      setPendingCacheData(cached);
      return;
    }
    executeSearch(query, false);
  };

  const executeSearch = async (query: string, forceRefresh: boolean = false) => {
    setIsSearching(true);
    setSearchResult(null);
    setError(null);
    resetAudioState();
    setPendingCacheData(null);

    try {
      const result = await searchDBTopic(query, language, podcastLength, forceRefresh);
      setSearchResult(result);
    } catch (err: any) {
      setError(language === 'zh' ? `失敗: ${err.message}` : `Failed: ${err.message}`);
    } finally {
      setIsSearching(false);
    }
  };

  const parseScriptToPlaylist = (fullScript: string): PlaylistItem[] => {
    try {
      if (!fullScript) return [];
      let cleanScript = fullScript.replace(/[\*\#\_]/g, '');
      // Normalize speaker labels: Master/Teacher -> Teacher, Student/Candidate -> Student
      cleanScript = cleanScript.replace(/(Master|Teacher|Interviewer).*?[:：]/gi, 'Master:');
      cleanScript = cleanScript.replace(/(Student|Candidate).*?[:：]/gi, 'Student:');

      const parts = cleanScript.split(/(Master:|Student:)/).filter(p => p.trim());
      
      const items: PlaylistItem[] = [];
      let currentRole: 'Teacher' | 'Student' = 'Teacher';

      if (parts.length > 0 && !parts[0].includes(':')) {
          const chunks = splitTextIntoChunks(parts[0]);
          chunks.forEach(c => items.push({ text: c, role: 'Teacher', voice: selectedVoice }));
      }

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i].trim();
        
        if (part.startsWith('Master')) { currentRole = 'Teacher'; continue; }
        if (part.startsWith('Student')) { currentRole = 'Student'; continue; }

        const codeParts = part.split(/(```[\s\S]*?```)/g);
        
        codeParts.forEach(subPart => {
          if (subPart.startsWith('```')) {
             if (items.length > 0) {
                 // Extract poem text
                 const snippet = subPart.replace(/^```\w*\s*|\s*```$/g, '').trim();
                 items[items.length - 1].codeSnippet = snippet;
             }
          } else if (subPart.trim()) {
              const textChunks = splitTextIntoChunks(subPart.trim());
              textChunks.forEach(chunk => {
                  if (chunk.trim()) {
                    items.push({
                        text: chunk,
                        role: currentRole,
                        voice: currentRole === 'Teacher' ? selectedVoice : VoiceName.Kore
                    });
                  }
              });
          }
        });
      }
      return items;
    } catch (e) {
      return [{ text: fullScript, role: 'Teacher', voice: selectedVoice }];
    }
  };

  const handlePlay = () => {
    if (!searchResult?.passage.context) return;
    const items = parseScriptToPlaylist(searchResult.passage.context);
    if (items.length === 0) { setError("Empty script"); return; }
    startAudioPlayback(items, searchResult.passage.reference);
  };

  const fetchAudioChunk = async (index: number, item: PlaylistItem): Promise<string> => {
    if (audioCache.current[index]) return audioCache.current[index];
    if (audioPromises.current[index]) return audioPromises.current[index];
    const promise = generateSegmentSpeech(item.text, item.voice)
      .then(url => { audioCache.current[index] = url; return url; });
    audioPromises.current[index] = promise;
    return promise;
  };

  const startAudioPlayback = async (items: PlaylistItem[], title: string) => {
    resetAudioState();
    setPlaylist(items);
    setIsGeneratingAudio(true);
    setIsBuffering(true);
    setCurrentAudioTitle(title);
    setCurrentChunkIndex(0);

    try {
      const firstChunkUrl = await fetchAudioChunk(0, items[0]);
      setAudioUrl(firstChunkUrl);
      setIsBuffering(false);
      for (let i = 1; i < Math.min(items.length, 3); i++) fetchAudioChunk(i, items[i]);
    } catch (err) {
      setError("Audio generation failed.");
      setIsBuffering(false);
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  const handleAudioEnded = async () => {
    const nextIndex = currentChunkIndex + 1;
    if (nextIndex < playlist.length) {
      setCurrentChunkIndex(nextIndex);
      if (audioCache.current[nextIndex]) {
        setAudioUrl(audioCache.current[nextIndex]);
      } else {
        setIsBuffering(true);
        try {
          const url = await fetchAudioChunk(nextIndex, playlist[nextIndex]);
          setAudioUrl(url);
        } finally { setIsBuffering(false); }
      }
      const lookAhead = nextIndex + 1;
      if (lookAhead < playlist.length) fetchAudioChunk(lookAhead, playlist[lookAhead]);
    }
  };

  const handleCopyToClipboard = async () => {
     if (!searchResult) return;
     try {
       await navigator.clipboard.writeText(searchResult.passage.context || "");
       alert("Copied!");
     } catch (e) { console.error(e); }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex text-stone-300 font-sans selection:bg-tech-900 selection:text-tech-100">
      <TopicNavigation 
        language={language} 
        onSelectTopic={handleSearchRequest} 
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      
      <HistorySidebar isOpen={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} onSelectHistory={handleSearchRequest} language={language} />
      <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} language={language} />
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} language={language} />
      
      <CacheModal
        isOpen={!!pendingCacheData}
        onClose={() => setPendingCacheData(null)}
        onLoadCache={() => pendingCacheData && executeSearch(pendingQuery, false)}
        onGenerateNew={() => executeSearch(pendingQuery, true)}
        cachedData={pendingCacheData}
        language={language}
      />

      <div ref={mainContainerRef} className="flex-1 relative flex flex-col min-w-0 h-screen overflow-y-auto custom-scrollbar bg-[#0a0a0a]">
        {/* Header */}
        <header className="sticky top-0 z-20 bg-[#0a0a0a]/95 backdrop-blur border-b border-stone-800">
          <div className="max-w-6xl mx-auto px-4 py-3 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
             <div className="flex items-center gap-3">
               <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-2 text-stone-500"><Menu /></button>
               <div className="w-10 h-10 bg-stone-900 rounded-full border border-stone-800 flex items-center justify-center text-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.1)]">
                 <Scroll className="w-5 h-5" />
               </div>
               <div>
                 <h1 className="text-xl font-bold font-serif tracking-tight text-stone-100">
                    Chinese Poem <span className="text-amber-500">Voice</span>
                 </h1>
                 <span className="text-[10px] text-stone-500 font-mono uppercase tracking-widest">中華詩詞之聲</span>
               </div>
             </div>
             
             <div className="flex items-center gap-3 flex-wrap">
               <button onClick={() => setIsHistoryOpen(true)} className="p-2 hover:bg-stone-900 rounded text-stone-500"><History className="w-5 h-5" /></button>
               <button onClick={() => setIsSettingsOpen(true)} className="p-2 hover:bg-stone-900 rounded text-stone-500"><Settings className="w-5 h-5" /></button>
               <LanguageSelector language={language} onChange={setLanguage} />
               <LengthSelector length={podcastLength} onChange={setPodcastLength} language={language} />
               <VoiceSelector selectedVoice={selectedVoice} onChange={setSelectedVoice} disabled={isGeneratingAudio} />
             </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-grow max-w-4xl mx-auto w-full px-4 py-8 pb-32">
          
          {!searchResult && !isSearching && (
             <div className="text-center py-20 animate-fade-in">
                <div className="inline-block p-4 bg-stone-900 rounded-full mb-6 border border-stone-800">
                  <Feather className="w-12 h-12 text-stone-600" />
                </div>
                <h2 className="text-2xl font-serif text-stone-200 mb-4">{language === 'zh' ? '品味千年詩詞之美' : 'Experience the Beauty of Chinese Poetry'}</h2>
                <p className="text-stone-500 mb-8 max-w-md mx-auto text-sm font-serif">
                   {language === 'zh' ? '與國學大師對話，深入解析唐詩宋詞的意境與歷史背景。' : 'Engage with a Literature Master to explore the imagery and history of classical poems.'}
                </p>
                <div className="flex justify-center gap-4 text-xs text-amber-600 font-serif">
                   <button onClick={() => handleSearchRequest("李白 靜夜思")} className="hover:underline hover:text-amber-400">[ 李白 靜夜思 ]</button>
                   <button onClick={() => handleSearchRequest("蘇軾 水調歌頭")} className="hover:underline hover:text-amber-400">[ 蘇軾 水調歌頭 ]</button>
                   <button onClick={() => handleSearchRequest("杜甫 春望")} className="hover:underline hover:text-amber-400">[ 杜甫 春望 ]</button>
                </div>
             </div>
          )}

          <SearchBox onSearch={handleSearchRequest} isSearching={isSearching} language={language} />

          {isSearching && (
            <div className="flex justify-center items-center gap-3 py-12 text-amber-500 font-serif">
              <Loader2 className="animate-spin w-5 h-5" />
              <span>{language === 'zh' ? '正在研墨賦詩...' : 'Composing...'}</span>
            </div>
          )}

          {error && <div className="bg-red-900/20 text-red-400 p-4 rounded border border-red-900/50 my-4 text-center text-sm">{error}</div>}

          {searchResult && (
            <div className="space-y-6 mt-8 animate-slide-up">
               <div className="bg-[#121212] rounded-xl shadow-2xl border border-stone-800 overflow-hidden">
                  
                  {/* Header */}
                  <div className="bg-stone-900/50 p-6 flex flex-col md:flex-row justify-between items-start md:items-center border-b border-stone-800 gap-4">
                    <div className="flex items-center gap-4 w-full md:w-auto">
                      <div className="bg-amber-900/20 p-2 rounded border border-amber-900/30">
                         <Scroll className="w-6 h-6 text-amber-500" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold font-serif text-stone-100">{searchResult.topic.title}</h2>
                        <div className="flex items-center gap-2 text-xs font-mono mt-1">
                            <span className="text-amber-400 px-2 py-0.5 bg-amber-900/20 rounded-full">{searchResult.topic.techStack}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 w-full md:w-auto justify-center">
                      <button onClick={handlePlay} disabled={isGeneratingAudio} className="bg-amber-700 hover:bg-amber-600 text-white px-5 py-2 rounded-full flex items-center gap-2 shadow-lg shadow-amber-900/20 transition-all disabled:opacity-50 font-serif text-sm">
                         {isGeneratingAudio ? <Loader2 className="animate-spin w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                         <span>{language === 'zh' ? '開始賞析' : 'Start Lesson'}</span>
                      </button>
                      <button onClick={handleCopyToClipboard} className="p-2 bg-stone-800 border border-stone-700 rounded-full text-stone-400 hover:text-white hover:bg-stone-700">
                        <ClipboardCopy className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Overview */}
                  <div className="p-6 bg-[#161616] border-b border-stone-800">
                     <h3 className="text-xs font-bold text-stone-500 uppercase tracking-widest mb-2 font-serif">{language === 'zh' ? '賞析概要' : 'Overview'}</h3>
                     <p className="text-stone-300 leading-relaxed font-serif text-lg italic opacity-80">
                        {searchResult.topic.overview}
                     </p>
                  </div>

                  {/* Transcript */}
                  <div className="bg-[#0e0e0e] p-6 font-serif text-base leading-relaxed overflow-hidden relative min-h-[400px]">
                     <div className="space-y-8">
                        {playlist.length > 0 ? (
                            playlist.map((item, idx) => (
                                <div 
                                    key={idx} 
                                    ref={(el) => { scrollRefs.current[idx] = el; }}
                                    className={`transition-all duration-500 p-4 rounded-lg border-l-2 ${
                                        idx === currentChunkIndex 
                                            ? 'bg-stone-900 border-amber-500 opacity-100 shadow-lg' 
                                            : 'bg-transparent border-transparent opacity-50'
                                    }`}
                                >
                                    <div className={`text-xs font-bold mb-2 uppercase tracking-wider ${item.role === 'Teacher' ? 'text-amber-500' : 'text-teal-500'}`}>
                                        {item.role === 'Teacher' ? (language === 'zh' ? '國學大師' : 'Master') : (language === 'zh' ? '學生' : 'Student')}
                                    </div>
                                    <p className="text-stone-300 whitespace-pre-wrap">{item.text}</p>
                                    
                                    {/* Poem Display Block */}
                                    {item.codeSnippet && (
                                        <div className="mt-6 mb-4 text-center">
                                            <div className="inline-block relative p-8 bg-[#1a1a1a] border border-stone-800 rounded-sm shadow-inner">
                                                <div className="absolute top-2 left-2 text-stone-700 opacity-50"><Scroll className="w-4 h-4"/></div>
                                                <div className="font-serif text-2xl text-stone-200 leading-loose tracking-widest whitespace-pre-wrap">
                                                    {item.codeSnippet}
                                                </div>
                                                <div className="absolute bottom-2 right-2 text-stone-700 opacity-50"><Feather className="w-4 h-4"/></div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))
                        ) : (
                            <div className="whitespace-pre-wrap text-stone-400">
                                {searchResult.passage.context}
                            </div>
                        )}
                     </div>
                  </div>
               </div>
            </div>
          )}
        </main>
      </div>

      {playlist.length > 0 && (
        <AudioPlayer 
          src={audioUrl} 
          isLoading={isBuffering}
          title={currentAudioTitle}
          subtitle={playlist[currentChunkIndex]?.role === 'Teacher' ? 'Master Speaking...' : 'Student Asking...'}
          onClose={resetAudioState}
          onEnded={handleAudioEnded}
        />
      )}
      
      <footer className="fixed bottom-0 right-0 z-50 bg-[#0a0a0a] px-3 py-1 border-t border-l border-stone-800 rounded-tl text-[10px] text-stone-600 font-mono flex items-center gap-2">
         <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-amber-500' : 'bg-red-500'}`}></div>
         v{CLIENT_VERSION}
         <button onClick={() => setIsAboutOpen(true)} className="hover:text-stone-400 ml-2">about</button>
      </footer>
    </div>
  );
};

export default App;
