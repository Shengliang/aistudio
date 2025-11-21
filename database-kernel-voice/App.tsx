
import React, { useState, useRef, useEffect } from 'react';
import { Terminal, Loader2, Volume2, Menu, ChevronLeft, ChevronRight, Info, Share2, Database, History, Settings, ClipboardCopy, Download, Play, Pause, Code as CodeIcon, Cpu, HardDrive, Server } from './components/Icons';
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
  
  // Audio State
  const [audioUrl, setAudioUrl] = useState<string | undefined>(undefined);
  const [playlist, setPlaylist] = useState<PlaylistItem[]>([]);
  const [currentChunkIndex, setCurrentChunkIndex] = useState(0);
  const [isBuffering, setIsBuffering] = useState(false);
  const [currentAudioTitle, setCurrentAudioTitle] = useState<string>("");
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  
  const audioCache = useRef<Record<number, string>>({});
  const audioPromises = useRef<Record<number, Promise<string>>>({});
  const scrollRefs = useRef<(HTMLDivElement | null)[]>([]);

  const [selectedVoice, setSelectedVoice] = useState<VoiceName>(VoiceName.Fenrir); // Teacher Default
  const [podcastLength, setPodcastLength] = useState<number>(3); 
  
  // UI State
  const [language, setLanguage] = useState<Language>('en');
  const [error, setError] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Cache Logic
  const [pendingCacheData, setPendingCacheData] = useState<SearchResult | null>(null);
  const [pendingQuery, setPendingQuery] = useState<string>('');

  const CLIENT_VERSION = "6.5.0-DBKernel";
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

  // Auto-scroll to active chunk
  useEffect(() => {
    if (searchResult && scrollRefs.current[currentChunkIndex]) {
      const activeEl = scrollRefs.current[currentChunkIndex];
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
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

      console.log("Parsing script:", fullScript.substring(0, 100) + "...");

      // 1. Clean up script
      // Remove markdown formatting chars but keep structure
      let cleanScript = fullScript.replace(/[\*\#\_]/g, '');
      
      // Normalize labels to "Teacher:" and "Student:"
      // Handles "Teacher (Host):", "Student 1:", etc.
      cleanScript = cleanScript.replace(/(Teacher|Student).*?[:：]/gi, '$1:');

      // 2. Split by roles
      // The regex captures the delimiter so we can know who is speaking
      const parts = cleanScript.split(/(Teacher:|Student:)/).filter(p => p.trim());
      
      const items: PlaylistItem[] = [];
      let currentRole: 'Teacher' | 'Student' = 'Teacher'; // Default start

      // Handle case where script starts with text but no label
      if (parts.length > 0 && parts[0] !== 'Teacher:' && parts[0] !== 'Student:') {
          const chunks = splitTextIntoChunks(parts[0]);
          chunks.forEach(c => items.push({ text: c, role: 'Teacher', voice: selectedVoice }));
      }

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i].trim();
        
        if (part === 'Teacher:') { currentRole = 'Teacher'; continue; }
        if (part === 'Student:') { currentRole = 'Student'; continue; }

        // Detect code blocks ```c ... ```
        const codeParts = part.split(/(```[\s\S]*?```)/g);
        
        codeParts.forEach(subPart => {
          if (subPart.startsWith('```')) {
             // Attach code snippet to the last text item if possible
             if (items.length > 0) {
                 // Strip ```c and ```
                 const snippet = subPart.replace(/^```\w*\s*|\s*```$/g, '').trim();
                 items[items.length - 1].codeSnippet = snippet;
             }
          } else if (subPart.trim()) {
              // Split speech into chunks for TTS limits
              const textChunks = splitTextIntoChunks(subPart.trim());
              textChunks.forEach(chunk => {
                  if (chunk.trim()) {
                    items.push({
                        text: chunk,
                        role: currentRole,
                        voice: currentRole === 'Teacher' ? selectedVoice : VoiceName.Puck
                    });
                  }
              });
          }
        });
      }
      
      console.log("Parsed items count:", items.length);

      // Fallback: If parsing failed (e.g. AI didn't use labels), treat as monologue
      if (items.length === 0 && fullScript.trim()) {
          console.warn("Parsing found no items, using fallback monologue.");
          const textChunks = splitTextIntoChunks(fullScript);
          return textChunks.map(chunk => ({
              text: chunk,
              role: 'Teacher',
              voice: selectedVoice
          }));
      }

      return items;
    } catch (e) {
      console.error("Parse error:", e);
      // Ultimate fallback
      return [{ text: "Error parsing script. Playing full text.", role: 'Teacher', voice: selectedVoice }];
    }
  };

  const handlePlay = () => {
    if (!searchResult?.passage.context) {
        setError("No lecture script available. Please regenerate.");
        return;
    }

    // Reset error state before starting
    setError(null);

    console.log("Starting playback processing...");
    const items = parseScriptToPlaylist(searchResult.passage.context);
    
    if (items.length === 0) {
        setError("Could not parse lecture script. Please try generating again.");
        return;
    }
    
    startAudioPlayback(items, searchResult.passage.reference);
  };

  const fetchAudioChunk = async (index: number, item: PlaylistItem): Promise<string> => {
    if (audioCache.current[index]) return audioCache.current[index];
    if (audioPromises.current[index]) return audioPromises.current[index];

    console.log(`Fetching audio chunk ${index}:`, item.text.substring(0, 20));
    const promise = generateSegmentSpeech(item.text, item.voice)
      .then(url => { audioCache.current[index] = url; return url; });
    
    audioPromises.current[index] = promise;
    return promise;
  };

  const startAudioPlayback = async (items: PlaylistItem[], title: string) => {
    resetAudioState();
    
    // Set UI state immediately
    setPlaylist(items);
    setIsGeneratingAudio(true);
    setIsBuffering(true);
    setCurrentAudioTitle(title);
    setCurrentChunkIndex(0);

    try {
      console.log("Requesting first chunk...");
      const firstChunkUrl = await fetchAudioChunk(0, items[0]);
      setAudioUrl(firstChunkUrl);
      setIsBuffering(false);
      
      // Pre-fetch next few chunks
      for (let i = 1; i < Math.min(items.length, 3); i++) fetchAudioChunk(i, items[i]);
    } catch (err) {
      console.error("Playback failed:", err);
      setError("Audio generation failed. Check your network or API key.");
      setIsBuffering(false);
      // Keep playlist to allow retry or reading
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
       const text = searchResult.passage.context || "";
       await navigator.clipboard.writeText(text);
       alert("Script copied!");
     } catch (e) { console.error(e); }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex text-stone-300 font-sans selection:bg-tech-900 selection:text-tech-100">
      <TopicNavigation 
        language={language} 
        onSelectTopic={handleSearchRequest} 
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      
      <HistorySidebar
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        onSelectHistory={handleSearchRequest}
        language={language}
      />

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

      <div className="flex-1 relative flex flex-col min-w-0 h-screen overflow-y-auto custom-scrollbar bg-[#050505]">
        {/* Header */}
        <header className="sticky top-0 z-20 bg-[#050505]/95 backdrop-blur border-b border-stone-800">
          <div className="max-w-6xl mx-auto px-4 py-3 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
             <div className="flex items-center gap-3">
               <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-2 text-stone-500"><Menu /></button>
               <div className="w-10 h-10 bg-stone-900 rounded border border-stone-800 flex items-center justify-center text-tech-500 shadow-[0_0_15px_rgba(61,146,166,0.2)]">
                 <Database className="w-6 h-6" />
               </div>
               <div>
                 <h1 className="text-xl font-bold font-display tracking-tight text-stone-100">
                    DB Internals <span className="text-tech-500">Voice</span>
                 </h1>
                 <span className="text-[10px] text-stone-500 font-mono uppercase tracking-widest">Database Engineering AI</span>
               </div>
             </div>
             
             <div className="flex items-center gap-3 flex-wrap">
               <button onClick={() => setIsHistoryOpen(true)} className="p-2 hover:bg-stone-900 rounded text-stone-500 transition-colors"><History className="w-5 h-5" /></button>
               <button onClick={() => setIsSettingsOpen(true)} className="p-2 hover:bg-stone-900 rounded text-stone-500 transition-colors"><Settings className="w-5 h-5" /></button>
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
                  <Server className="w-12 h-12 text-stone-600" />
                </div>
                <h2 className="text-2xl font-display text-stone-200 mb-4">Kernel Masterclass</h2>
                <p className="text-stone-500 mb-8 max-w-md mx-auto font-mono text-sm">
                  Deep dive into MySQL, PostgreSQL, and Distributed Systems internals.
                </p>
                <div className="flex justify-center gap-4 text-xs text-tech-600 font-mono">
                   <button onClick={() => handleSearchRequest("InnoDB Buffer Pool")} className="hover:underline hover:text-tech-400">[ InnoDB Buffer Pool ]</button>
                   <button onClick={() => handleSearchRequest("Postgres VACUUM")} className="hover:underline hover:text-tech-400">[ Postgres VACUUM ]</button>
                   <button onClick={() => handleSearchRequest("Raft Consensus")} className="hover:underline hover:text-tech-400">[ Raft Consensus ]</button>
                </div>
             </div>
          )}

          <SearchBox onSearch={handleSearchRequest} isSearching={isSearching} language={language} />

          {isSearching && (
            <div className="flex justify-center items-center gap-3 py-12 text-tech-500 font-mono">
              <Loader2 className="animate-spin w-5 h-5" />
              <span>{language === 'zh' ? '編譯中...' : 'Compiling lecture...'}</span>
            </div>
          )}

          {error && <div className="bg-red-900/20 text-red-400 p-4 rounded border border-red-900/50 my-4 text-center font-mono text-sm">{error}</div>}

          {searchResult && (
            <div className="space-y-6 mt-8 animate-slide-up">
               <div className="bg-[#0a0a0a] rounded-xl shadow-2xl border border-stone-800 overflow-hidden">
                  
                  {/* Header */}
                  <div className="bg-stone-900/50 p-6 flex flex-col md:flex-row justify-between items-start md:items-center border-b border-stone-800 gap-4">
                    <div className="flex items-center gap-4 w-full md:w-auto">
                      <div className="bg-tech-900/30 p-2 rounded border border-tech-800">
                         <HardDrive className="w-6 h-6 text-tech-500" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold font-display text-stone-100">{searchResult.topic.title}</h2>
                        <div className="flex items-center gap-2 text-xs font-mono mt-1">
                            <span className="text-tech-400 px-1.5 py-0.5 bg-tech-900/50 rounded">{searchResult.topic.techStack}</span>
                            <span className="text-stone-500">{new Date().toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 w-full md:w-auto justify-center">
                      <button onClick={handlePlay} disabled={isGeneratingAudio} className="bg-tech-700 hover:bg-tech-600 text-white px-5 py-2 rounded flex items-center gap-2 shadow-lg shadow-tech-900/50 transition-all disabled:opacity-50 font-mono text-sm">
                         {isGeneratingAudio ? <Loader2 className="animate-spin w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                         <span>{language === 'zh' ? '播放課程' : 'Start Lecture'}</span>
                      </button>
                      <button onClick={handleCopyToClipboard} className="p-2 bg-stone-800 border border-stone-700 rounded text-stone-400 hover:text-white hover:bg-stone-700">
                        <ClipboardCopy className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Overview */}
                  <div className="p-6 bg-[#0f0f0f] border-b border-stone-800">
                     <h3 className="text-xs font-bold text-stone-500 uppercase tracking-widest mb-2 font-mono">Synopsis</h3>
                     <p className="text-stone-300 leading-relaxed font-serif text-lg">
                        {searchResult.topic.overview}
                     </p>
                  </div>

                  {/* Terminal Transcript */}
                  <div className="bg-[#050505] p-6 font-mono text-sm leading-relaxed overflow-hidden relative min-h-[400px]">
                     <div className="absolute top-0 left-0 w-full h-4 bg-gradient-to-b from-[#050505] to-transparent z-10"></div>
                     <div className="space-y-6">
                        {/* If playlist is generated, show live blocks, otherwise show full script */}
                        {playlist.length > 0 ? (
                            playlist.map((item, idx) => (
                                <div 
                                    key={idx} 
                                    ref={(el) => { scrollRefs.current[idx] = el; }}
                                    className={`transition-all duration-500 p-4 rounded border-l-4 ${
                                        idx === currentChunkIndex 
                                            ? 'bg-stone-900 border-tech-500 opacity-100 scale-100' 
                                            : 'bg-transparent border-transparent opacity-40 scale-95'
                                    }`}
                                >
                                    <div className={`text-xs font-bold mb-2 uppercase tracking-wider ${item.role === 'Teacher' ? 'text-tech-400' : 'text-green-400'}`}>
                                        {item.role === 'Teacher' ? 'Kernel Architect' : 'Junior DBA'}
                                    </div>
                                    <p className="text-stone-300 whitespace-pre-wrap">{item.text}</p>
                                    
                                    {item.codeSnippet && (
                                        <div className="mt-4 bg-[#1e1e1e] rounded border border-stone-700 p-3 overflow-x-auto">
                                            <div className="flex items-center justify-between mb-2 pb-2 border-b border-stone-700">
                                                <div className="flex gap-1.5">
                                                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/50"></div>
                                                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50"></div>
                                                    <div className="w-2.5 h-2.5 rounded-full bg-green-500/50"></div>
                                                </div>
                                                <span className="text-[10px] text-stone-500">source.c</span>
                                            </div>
                                            <pre className="text-xs text-stone-400">
                                                <code>{item.codeSnippet}</code>
                                            </pre>
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
                     <div className="absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-[#050505] to-transparent z-10"></div>
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
          subtitle={playlist[currentChunkIndex]?.role === 'Teacher' ? 'Prof. Fenrir Speaking...' : 'Student Asking...'}
          onClose={resetAudioState}
          onEnded={handleAudioEnded}
        />
      )}
      
      <footer className="fixed bottom-0 right-0 z-50 bg-[#050505] px-3 py-1 border-t border-l border-stone-800 rounded-tl text-[10px] text-stone-600 font-mono flex items-center gap-2">
         <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-tech-500' : 'bg-red-500'}`}></div>
         v{CLIENT_VERSION}
         <button onClick={() => setIsAboutOpen(true)} className="hover:text-stone-400 ml-2">sys_info</button>
      </footer>
    </div>
  );
};

export default App;
