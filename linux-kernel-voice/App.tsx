
import React, { useState, useRef, useEffect } from 'react';
import { Terminal, Loader2, Volume2, ImageIcon, Menu, ChevronLeft, ChevronRight, Info, FileText, Share2, Database, History, WifiOff, Download, ClipboardCopy, ExternalLink, Copy, Server, Settings, Key } from './components/Icons';
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
import { searchTopicOverview, generateLectureScript, generateSegmentSpeech, generateBibleImage, checkCacheExistence, getCachedImage } from './services/geminiService';
import { splitTextIntoChunks } from './utils/audioUtils';

const App: React.FC = () => {
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingLecture, setIsLoadingLecture] = useState(false);
  
  // Audio State
  const [audioUrl, setAudioUrl] = useState<string | undefined>(undefined);
  const [playlist, setPlaylist] = useState<PlaylistItem[]>([]);
  const [currentChunkIndex, setCurrentChunkIndex] = useState(0);
  const [isBuffering, setIsBuffering] = useState(false);
  const [currentAudioTitle, setCurrentAudioTitle] = useState<string>("");
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  
  const audioCache = useRef<Record<number, string>>({});
  const audioPromises = useRef<Record<number, Promise<string>>>({});
  const transcriptContainerRef = useRef<HTMLDivElement>(null);

  const [selectedTeacherVoice, setSelectedTeacherVoice] = useState<VoiceName>(VoiceName.Fenrir);
  const [podcastLength, setPodcastLength] = useState<number>(3); 
  
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

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

  const CLIENT_VERSION = "4.1.0-Linux";
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
    if (playlist.length > 0 && currentChunkIndex >= 0) {
      const elementId = `chunk-${currentChunkIndex}`;
      const element = document.getElementById(elementId);
      if (element && transcriptContainerRef.current) {
        const container = transcriptContainerRef.current;
        const elementTop = element.offsetTop;
        const elementHeight = element.clientHeight;
        const containerHeight = container.clientHeight;
        const targetScrollTop = element.offsetTop - (containerHeight / 2) + (elementHeight / 2); 
        container.scrollTo({ top: targetScrollTop, behavior: 'smooth' });
      }
    }
  }, [currentChunkIndex, playlist]);

  const resetAudioState = () => {
    setAudioUrl(undefined);
    setPlaylist([]);
    setCurrentChunkIndex(0);
    audioCache.current = {};
    audioPromises.current = {};
    setIsGeneratingAudio(false);
    setIsBuffering(false);
    setCurrentAudioTitle("");
  };

  const resetContentState = () => {
    setSearchResult(null);
    resetAudioState();
    setGeneratedImageUrl(null);
    setIsLoadingLecture(false);
    setIsGeneratingImage(false);
    setError(null);
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
    resetContentState();
    setPendingCacheData(null);

    try {
      const initialResult = await searchTopicOverview(query, language, forceRefresh);
      setSearchResult(initialResult);
      setIsSearching(false);

      const cachedImg = getCachedImage(initialResult.topic.title);
      if (cachedImg) setGeneratedImageUrl(cachedImg);

      setIsLoadingLecture(true);
      const script = await generateLectureScript(
        initialResult.topic.title, 
        initialResult.topic.overview, 
        language, 
        podcastLength,
        forceRefresh
      );
      
      setSearchResult(prev => {
        if (!prev) return null;
        return {
          ...prev,
          topic: {
            ...prev.topic,
            lectureScript: script
          }
        };
      });
    } catch (err: any) {
      setError(language === 'zh' ? `失敗: ${err.message}` : `Failed: ${err.message}`);
      setIsSearching(false);
    } finally {
      setIsLoadingLecture(false);
    }
  };

  const handleGenerateImage = async () => {
    if (!searchResult || isGeneratingImage) return;
    setIsGeneratingImage(true);
    try {
      const url = await generateBibleImage(searchResult.topic.title);
      setGeneratedImageUrl(url);
    } catch (e) {
      setError("Failed to generate architecture diagram");
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const parseScriptToPlaylist = (script: string): PlaylistItem[] => {
    const chunks: PlaylistItem[] = [];
    const studentVoice = VoiceName.Puck;
    
    const codeBlockRegex = /```(?:\w+)?\s*([\s\S]*?)```/g;
    
    let lastIndex = 0;
    let match;

    const processTextSegment = (textSegment: string) => {
      const lines = textSegment.split('\n');
      let currentRole: 'Teacher' | 'Student' | 'Narrator' = 'Narrator';
      
      lines.forEach(line => {
        const cleanLine = line.trim();
        if (!cleanLine) return;

        let content = cleanLine;
        
        if (cleanLine.startsWith("Teacher:")) {
          currentRole = 'Teacher';
          content = cleanLine.replace("Teacher:", "").trim();
        } else if (cleanLine.startsWith("Student:")) {
          currentRole = 'Student';
          content = cleanLine.replace("Student:", "").trim();
        }

        if (content) {
          const voice = currentRole === 'Teacher' ? selectedTeacherVoice : studentVoice;
          splitTextIntoChunks(content).forEach(c => {
             chunks.push({ text: c, voice, role: currentRole });
          });
        }
      });
    };

    while ((match = codeBlockRegex.exec(script)) !== null) {
       const textBefore = script.slice(lastIndex, match.index);
       processTextSegment(textBefore);
       const codeSnippet = match[1].trim();
       if (chunks.length > 0) {
         chunks[chunks.length - 1].codeSnippet = codeSnippet;
       } else {
         chunks.push({ text: "(Analyzing Source)", voice: selectedTeacherVoice, role: 'Teacher', codeSnippet });
       }
       lastIndex = codeBlockRegex.lastIndex;
    }
    const textAfter = script.slice(lastIndex);
    processTextSegment(textAfter);
    return chunks;
  };

  const handlePlay = () => {
    if (!searchResult?.topic.lectureScript) return;
    if (playlist.length > 0) return; 

    const items = parseScriptToPlaylist(searchResult.topic.lectureScript);
    startAudioPlayback(items, searchResult.topic.title);
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
    setIsGeneratingAudio(true);
    setCurrentAudioTitle(title);
    setPlaylist(items);

    try {
      const firstChunkUrl = await fetchAudioChunk(0, items[0]);
      setAudioUrl(firstChunkUrl);
      setCurrentChunkIndex(0);
      for (let i = 1; i < Math.min(items.length, 3); i++) fetchAudioChunk(i, items[i]);
    } catch (err) {
      setError("Audio generation failed");
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

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex text-stone-300 font-sans selection:bg-tech-900 selection:text-tech-500">
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

      <div className="flex-1 relative flex flex-col min-w-0 h-screen overflow-y-auto custom-scrollbar bg-[#0a0a0a]">
        {/* Header */}
        <header className="sticky top-0 z-20 bg-[#0c0c0c]/95 backdrop-blur border-b border-stone-800 shadow-md">
          <div className="max-w-6xl mx-auto px-4 py-3 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
             <div className="flex items-center gap-3">
               <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-2 text-stone-400"><Menu /></button>
               <div className="w-10 h-10 bg-stone-900 border border-stone-700 rounded flex items-center justify-center text-tech-500 shadow-inner">
                 <Terminal className="w-6 h-6" />
               </div>
               <div>
                 <h1 className="text-xl font-bold tracking-tight text-stone-100">Linux Kernel Voice</h1>
                 <span className="text-[10px] text-tech-600 font-mono uppercase flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-tech-500 rounded-full animate-pulse"></span>
                    System Internals Training
                 </span>
               </div>
             </div>
             
             <div className="flex items-center gap-3 flex-wrap">
               <button onClick={() => setIsHistoryOpen(true)} className="p-2 hover:bg-stone-800 rounded text-stone-400 hover:text-white transition-colors"><History className="w-5 h-5" /></button>
               <button onClick={() => setIsSettingsOpen(true)} className="p-2 hover:bg-stone-800 rounded text-stone-400 hover:text-white transition-colors"><Settings className="w-5 h-5" /></button>
               <LanguageSelector language={language} onChange={setLanguage} />
               <LengthSelector length={podcastLength} onChange={setPodcastLength} language={language} />
               <VoiceSelector selectedVoice={selectedTeacherVoice} onChange={setSelectedTeacherVoice} disabled={isGeneratingAudio} />
             </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-grow max-w-5xl mx-auto w-full px-4 py-8 pb-32">
          
          {!searchResult && !isSearching && (
             <div className="text-center py-20">
                <div className="inline-block p-4 bg-stone-900 rounded-full mb-6 border border-stone-800 shadow-xl">
                  <Terminal className="w-12 h-12 text-tech-600" />
                </div>
                <h2 className="text-3xl md:text-4xl font-bold text-stone-200 mb-4 font-mono">Kernel Space Awaits</h2>
                <p className="text-stone-500 mb-8 max-w-lg mx-auto leading-relaxed">
                  Master Process Scheduling, Memory Management, and eBPF via deep-dive audio lectures from a virtual Senior Maintainer.
                </p>
                <div className="flex justify-center gap-4 text-xs font-mono text-stone-600">
                   <span>[ CONFIG_SCHED_DEBUG=y ]</span>
                   <span>[ CONFIG_MMU=y ]</span>
                </div>
             </div>
          )}

          <SearchBox onSearch={handleSearchRequest} isSearching={isSearching} language={language} />

          {isSearching && (
            <div className="flex justify-center items-center gap-3 py-12 text-tech-500 font-mono text-sm">
              <Loader2 className="animate-spin w-5 h-5" />
              <span className="animate-pulse">compiling_lecture... [OK]</span>
            </div>
          )}

          {error && <div className="bg-red-900/20 text-red-400 p-4 rounded border border-red-900/50 my-4 text-center font-mono text-sm">{error}</div>}

          {searchResult && (
            <div className="space-y-6 mt-8 animate-fade-in-up">
               <div className="bg-[#0e0e0e] rounded-lg shadow-2xl border border-stone-800 overflow-hidden">
                  {/* Title Bar */}
                  <div className="bg-stone-900/80 p-5 flex flex-col md:flex-row justify-between items-start md:items-center border-b border-stone-800 gap-4">
                    <div>
                      <h2 className="text-2xl font-bold font-mono mb-2 text-stone-100 tracking-tight">{searchResult.topic.title}</h2>
                      <div className="inline-flex items-center gap-2 px-3 py-1 bg-black rounded text-xs font-mono text-tech-500 border border-stone-800">
                        <Server className="w-3 h-3" />
                        {searchResult.topic.techStack}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={handlePlay} disabled={isGeneratingAudio || isLoadingLecture} className="bg-tech-700 hover:bg-tech-600 text-white px-5 py-2 rounded flex items-center gap-2 font-bold disabled:opacity-50 transition-colors shadow-lg shadow-tech-900/20 font-mono text-sm">
                         {isGeneratingAudio ? <Loader2 className="animate-spin w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                         <span>{language === 'zh' ? '開始編譯' : 'Start Compilation'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Overview */}
                  <div className="p-6 md:p-8 border-b border-stone-800 bg-[#0c0c0c]">
                     <h3 className="text-xs font-bold uppercase text-stone-500 tracking-widest mb-3 font-mono">Kernel Abstract</h3>
                     <p className="text-lg text-stone-300 leading-relaxed font-sans">{searchResult.topic.overview}</p>
                  </div>

                  {/* Architecture Diagram */}
                  <div className="bg-black border-b border-stone-800 p-0 relative group min-h-[250px] flex items-center justify-center overflow-hidden">
                     {isGeneratingImage ? (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50"><Loader2 className="animate-spin text-tech-500 w-8 h-8" /></div>
                     ) : generatedImageUrl ? (
                        <div className="relative w-full h-full group">
                          <img src={generatedImageUrl} className="w-full h-full object-contain max-h-[450px] opacity-90 group-hover:opacity-100 transition-opacity" alt="Architecture" />
                          <div className="absolute bottom-2 right-2 bg-black/80 text-stone-500 text-[10px] px-2 py-1 rounded font-mono border border-stone-800">Generated by Imagen 4</div>
                        </div>
                     ) : (
                        <div className="flex flex-col items-center justify-center h-72 w-full bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9IiMyMjMiLz48L3N2Zz4=')]">
                           <button onClick={handleGenerateImage} className="bg-stone-900 border border-stone-700 text-tech-500 px-5 py-3 rounded hover:border-tech-600 hover:text-tech-400 transition-all flex items-center gap-2 shadow-xl font-mono text-sm group">
                              <ImageIcon className="w-4 h-4 group-hover:scale-110 transition-transform" />
                              <span>Generate_Sys_Arch_Diagram()</span>
                           </button>
                        </div>
                     )}
                  </div>

                  {/* Lecture Script (Terminal Style) */}
                  <div className="bg-[#050505] p-0 border-t border-stone-800 text-stone-300">
                     <div className="flex items-center justify-between px-4 py-2 bg-[#0a0a0a] border-b border-stone-800">
                        <div className="flex items-center gap-2 font-mono text-xs text-stone-500">
                           <div className="w-2 h-2 rounded-full bg-red-500/50"></div>
                           <div className="w-2 h-2 rounded-full bg-yellow-500/50"></div>
                           <div className="w-2 h-2 rounded-full bg-green-500/50"></div>
                           <span className="ml-2">root@kernel:~# tail -f lecture.log</span>
                        </div>
                     </div>
                     
                     <div ref={transcriptContainerRef} className="p-6 space-y-8 font-mono text-sm leading-relaxed h-[500px] overflow-y-auto custom-scrollbar scroll-smooth relative">
                        {isLoadingLecture ? (
                           <div className="animate-pulse text-tech-600 flex gap-2"><span>_</span> Loading modules...</div>
                        ) : (
                          playlist.length > 0 ? (
                            playlist.map((chunk, idx) => (
                              <div 
                                key={idx} 
                                id={`chunk-${idx}`}
                                className={`
                                  p-4 rounded border-l-2 transition-all duration-500 relative
                                  ${idx === currentChunkIndex 
                                    ? 'bg-[#111] border-tech-500 text-stone-100 shadow-lg shadow-black/50' 
                                    : 'bg-transparent border-transparent opacity-50 hover:opacity-80'}
                                `}
                              >
                                <div className="flex items-center justify-between mb-2">
                                   <span className={`text-[10px] uppercase font-bold tracking-wider block ${chunk.role === 'Teacher' ? 'text-blue-400' : chunk.role === 'Student' ? 'text-emerald-400' : 'text-stone-500'}`}>
                                     {chunk.role === 'Teacher' ? 'root@maintainer:~#' : chunk.role === 'Student' ? 'user@dev:$' : '# System'}
                                   </span>
                                   {idx === currentChunkIndex && <div className="w-1.5 h-1.5 bg-tech-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.8)]"></div>}
                                </div>
                                
                                <p className="mb-4 leading-7 text-base font-sans font-light">{chunk.text}</p>

                                {chunk.codeSnippet && (
                                  <div className="mt-2 rounded bg-[#080808] border border-stone-800 overflow-hidden shadow-inner group">
                                    <div className="flex justify-between items-center px-3 py-1.5 bg-[#111] border-b border-stone-800">
                                      <span className="text-[10px] text-stone-500 font-mono">source_code.c</span>
                                      <button onClick={() => navigator.clipboard.writeText(chunk.codeSnippet || "")} className="text-stone-600 hover:text-stone-300 transition-colors"><Copy className="w-3 h-3" /></button>
                                    </div>
                                    <pre className="p-4 overflow-x-auto text-xs text-tech-300 font-mono leading-5">
                                      <code>{chunk.codeSnippet}</code>
                                    </pre>
                                  </div>
                                )}
                              </div>
                            ))
                          ) : (
                            <div className="text-stone-500 whitespace-pre-wrap opacity-80 font-sans">
                              {searchResult.topic.lectureScript}
                            </div>
                          )
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
          subtitle={playlist[currentChunkIndex]?.role === 'Teacher' ? 'Maintainer Speaking...' : playlist[currentChunkIndex]?.role === 'Student' ? 'Student Asking...' : 'Playing...'}
          onClose={resetAudioState}
          onEnded={handleAudioEnded}
        />
      )}
      
      <footer className="fixed bottom-0 right-0 z-50 bg-black/80 backdrop-blur px-3 py-1 border-t border-l border-stone-800 rounded-tl text-[10px] text-stone-600 font-mono flex items-center gap-2">
         <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-tech-600' : 'bg-red-500'}`}></div>
         v{CLIENT_VERSION}
      </footer>
    </div>
  );
};

export default App;
