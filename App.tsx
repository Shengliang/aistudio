import React, { useState, useRef, useEffect } from 'react';
import { BookOpen, Loader2, Volume2, ImageIcon, Menu, ChevronLeft, ChevronRight, Info } from './components/Icons';
import SearchBox from './components/SearchBox';
import VoiceSelector from './components/VoiceSelector';
import LanguageSelector from './components/LanguageSelector';
import LengthSelector from './components/LengthSelector';
import AudioPlayer from './components/AudioPlayer';
import BibleNavigation from './components/BibleNavigation';
import AboutModal from './components/AboutModal';
import { SearchResult, VoiceName, Language } from './types';
import { searchBiblePassage, generateSegmentSpeech, generateBibleImage } from './services/geminiService';
import { splitTextIntoChunks } from './utils/audioUtils';
import { getAdjacentChapterQuery } from './utils/bibleNavigation';

const App: React.FC = () => {
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  
  // --- Audio Streaming State ---
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | undefined>(undefined);
  const [playlist, setPlaylist] = useState<string[]>([]);
  const [currentChunkIndex, setCurrentChunkIndex] = useState(0);
  const [isBuffering, setIsBuffering] = useState(false);
  
  // Cache for audio blobs: index -> url
  const audioCache = useRef<Record<number, string>>({});
  // Keep track of active promises to avoid double fetching
  const audioPromises = useRef<Record<number, Promise<string>>>({});

  const [selectedVoice, setSelectedVoice] = useState<VoiceName>(VoiceName.Fenrir);
  const [podcastLength, setPodcastLength] = useState<number>(1); // Default to 1 minute for speed
  
  // Image State
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  const [language, setLanguage] = useState<Language>('en');
  const [error, setError] = useState<string | null>(null);

  // Layout State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);

  // Client version for debugging
  const CLIENT_VERSION = "2.2.0";

  // Reset audio state when search changes
  const resetAudioState = () => {
    setAudioUrl(undefined);
    setPlaylist([]);
    setCurrentChunkIndex(0);
    audioCache.current = {};
    audioPromises.current = {};
    setIsGeneratingAudio(false);
    setIsBuffering(false);
  };

  const handleSearch = async (query: string) => {
    setIsSearching(true);
    setError(null);
    setSearchResult(null);
    resetAudioState();
    setGeneratedImageUrl(null);

    try {
      const result = await searchBiblePassage(query, language, podcastLength);
      setSearchResult(result);
      
      // Auto-trigger image generation for a richer experience
      handleGenerateImage(result.passage.text);
    } catch (err: any) {
      console.error(err);
      // Check if it's a server config error (HTML returned)
      if (err.message && err.message.includes('Received HTML')) {
         setError(language === 'zh' 
          ? `伺服器配置錯誤。請檢查伺服器日誌。 [v${CLIENT_VERSION}]` 
          : `Server Configuration Error. Please check logs. [v${CLIENT_VERSION}]`);
      } else {
        setError(language === 'zh' 
          ? `找不到相關經文或連線失敗。 (${err.message})` 
          : `Could not find relevant passage or connection failed. (${err.message})`);
      }
    } finally {
      setIsSearching(false);
    }
  };

  const handleNavigate = (direction: 'next' | 'prev') => {
    if (!searchResult) return;
    
    const nextQuery = getAdjacentChapterQuery(searchResult.passage.reference, direction, language);
    
    if (nextQuery) {
      handleSearch(nextQuery);
    } else {
      // Fallback: If we can't parse locally (e.g. complex verse range), try asking the AI via search
      const suffix = direction === 'next' ? 'next chapter' : 'previous chapter';
      const fallbackQuery = `${searchResult.passage.reference} ${suffix}`;
      handleSearch(fallbackQuery);
    }
  };

  const handleGenerateImage = async (prompt: string) => {
    setIsGeneratingImage(true);
    try {
      const url = await generateBibleImage(prompt);
      setGeneratedImageUrl(url);
    } catch (err) {
      console.error("Image gen failed", err);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // Helper to fetch audio for a specific chunk index
  const fetchAudioChunk = async (index: number, text: string): Promise<string> => {
    // Check cache first
    if (audioCache.current[index]) return audioCache.current[index];
    // Check active promise
    if (audioPromises.current[index]) return audioPromises.current[index];

    // Fetch
    const promise = generateSegmentSpeech(text, selectedVoice)
      .then(url => {
        audioCache.current[index] = url;
        return url;
      })
      .catch(err => {
        console.error(`Failed to fetch chunk ${index}`, err);
        throw err;
      });
    
    audioPromises.current[index] = promise;
    return promise;
  };

  const handlePlay = async () => {
    if (!searchResult) return;
    if (playlist.length > 0) {
      // Already has a playlist, assume standard behavior (toggle via player)
      // If closed, player will reopen with existing state
    }

    resetAudioState();
    setIsGeneratingAudio(true);
    setError(null);

    // 1. Prepare text
    const fullText = `${searchResult.passage.reference}. ${searchResult.passage.text}. ${language === 'zh' ? '靈修分享:' : 'Devotional Content:'} ${searchResult.passage.context}`;
    
    // 2. Split into chunks
    const chunks = splitTextIntoChunks(fullText);
    setPlaylist(chunks);

    if (chunks.length === 0) {
      setIsGeneratingAudio(false);
      return;
    }

    try {
      // 3. Fetch first chunk immediately
      const firstChunkUrl = await fetchAudioChunk(0, chunks[0]);
      setAudioUrl(firstChunkUrl);
      setCurrentChunkIndex(0);
      
      // 4. Start pre-fetching the next few chunks in background
      for (let i = 1; i < Math.min(chunks.length, 3); i++) {
        fetchAudioChunk(i, chunks[i]);
      }
    } catch (err) {
      setError(language === 'zh' ? "語音生成失敗。" : "Failed to start audio streaming.");
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  const handleAudioEnded = async () => {
    const nextIndex = currentChunkIndex + 1;
    
    if (nextIndex < playlist.length) {
      // Move to next chunk
      setCurrentChunkIndex(nextIndex);
      
      // Check if next audio is ready
      if (audioCache.current[nextIndex]) {
        setAudioUrl(audioCache.current[nextIndex]);
      } else {
        // Buffering needed
        setIsBuffering(true);
        try {
          const url = await fetchAudioChunk(nextIndex, playlist[nextIndex]);
          setAudioUrl(url);
        } catch (e) {
          console.error("Buffering failed", e);
        } finally {
          setIsBuffering(false);
        }
      }

      // Pre-fetch subsequent chunk (keep buffer ahead)
      const lookAheadIndex = nextIndex + 1;
      if (lookAheadIndex < playlist.length) {
        fetchAudioChunk(lookAheadIndex, playlist[lookAheadIndex]);
      }
    } else {
      // End of playlist
    }
  };

  const suggestions = language === 'zh' 
    ? ['焦慮時的安慰', '今日的力量', '約翰福音 3:16']
    : ['Comfort in anxiety', 'Strength for today', 'John 3:16'];

  return (
    <div className="min-h-screen bg-[#FAFAF9] flex">
      
      {/* Navigation Sidebar */}
      <BibleNavigation 
        language={language} 
        onSelectPassage={handleSearch} 
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* About/Readme Modal */}
      <AboutModal 
        isOpen={isAboutOpen} 
        onClose={() => setIsAboutOpen(false)} 
        language={language}
      />

      {/* Main Content Area */}
      <div className="flex-1 relative flex flex-col min-w-0 h-screen overflow-y-auto custom-scrollbar">
        
        {/* Header background pattern */}
        <div className="absolute inset-0 z-0 opacity-5 bg-[radial-gradient(#725548_1px,transparent_1px)] [background-size:16px_16px] h-full pointer-events-none"></div>
        
        <header className="relative z-10 bg-white border-b border-bible-100 shadow-sm sticky top-0 shrink-0">
          <div className="max-w-5xl mx-auto px-4 py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="md:hidden p-2 -ml-2 text-bible-600 hover:bg-bible-50 rounded-lg"
              >
                <Menu className="w-6 h-6" />
              </button>
              <div className="w-10 h-10 bg-bible-800 rounded-lg flex items-center justify-center text-white shadow-md">
                <BookOpen className="w-6 h-6" />
              </div>
              <h1 className="text-2xl font-display font-bold text-bible-900 tracking-tight hidden sm:block">Scripture Voice</h1>
              <h1 className="text-xl font-display font-bold text-bible-900 tracking-tight sm:hidden">Scripture</h1>
            </div>
            
            <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto justify-end">
               <div className="flex-shrink-0">
                <LanguageSelector language={language} onChange={(lang) => {
                  setLanguage(lang);
                  resetAudioState();
                }} />
               </div>
               <div className="w-28 flex-shrink-0">
                 <LengthSelector 
                   length={podcastLength}
                   onChange={(l) => {
                     setPodcastLength(l);
                   }}
                   language={language}
                   disabled={isSearching || isGeneratingAudio}
                 />
               </div>
               <div className="w-32 md:w-40 flex-shrink-0">
                  <VoiceSelector 
                    selectedVoice={selectedVoice} 
                    onChange={(v) => {
                      resetAudioState();
                      setSelectedVoice(v);
                    }}
                    disabled={isGeneratingAudio || playlist.length > 0}
                  />
               </div>
            </div>
          </div>
        </header>

        <main className="relative z-10 w-full max-w-4xl mx-auto px-4 pt-8 pb-24 flex-grow">
          
          <div className="text-center mb-8">
             <h2 className="text-3xl md:text-4xl font-serif font-medium text-bible-900 mb-3">
               {language === 'zh' ? '聆聽神的話語' : 'Listen to the Word'}
             </h2>
             <p className="text-bible-600 max-w-md mx-auto text-sm md:text-base">
               {language === 'zh' 
                 ? '搜索任何主題、經文，或從左側選擇章節。' 
                 : 'Search any topic, verse, or select a chapter from the index.'}
             </p>
          </div>

          <div className="mb-6">
            <SearchBox onSearch={handleSearch} isSearching={isSearching} language={language} />
          </div>
          
          {/* Loading / Info Message */}
          {isSearching && (
             <div className="text-center mb-8 text-bible-500 text-sm animate-pulse flex items-center justify-center gap-2">
               <Loader2 className="w-4 h-4 animate-spin" />
               {language === 'zh' 
                 ? `正在生成 ${podcastLength} 分鐘的靈修內容，請稍候...` 
                 : `Generating ${podcastLength} min devotional content, please wait...`
               }
             </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-8 text-center animate-fade-in flex flex-col items-center gap-2">
              <p>{error}</p>
              {error.includes("HTML") && (
                <div className="flex gap-4 text-sm font-medium underline">
                  <a href="/api/debug/logs" target="_blank" rel="noopener noreferrer">
                    View Server Logs [v{CLIENT_VERSION}]
                  </a>
                  <a href="/status" target="_blank" rel="noopener noreferrer">
                    Check Server Status
                  </a>
                </div>
              )}
            </div>
          )}

          {searchResult && (
            <div className="animate-fade-in-up space-y-6">
              <div className="bg-white rounded-2xl shadow-xl border border-bible-100 overflow-hidden">
                
                {/* Verse Header */}
                <div className="bg-bible-50 px-4 py-4 border-b border-bible-100 flex flex-col md:flex-row items-center justify-between gap-4">
                  
                  {/* Navigation & Title */}
                  <div className="flex items-center justify-between w-full md:w-auto md:justify-start gap-2 md:gap-4 flex-1">
                    <button 
                      onClick={() => handleNavigate('prev')}
                      disabled={isSearching}
                      className="p-2 text-bible-400 hover:text-bible-700 hover:bg-bible-100 rounded-full transition-colors"
                      title={language === 'zh' ? "上一章" : "Previous Chapter"}
                    >
                      <ChevronLeft className="w-6 h-6" />
                    </button>

                    <div className="text-center md:text-left">
                      <h3 className="text-xl md:text-2xl font-display font-bold text-bible-900">
                        {searchResult.passage.reference}
                      </h3>
                      <span className="text-xs font-bold tracking-wider text-bible-500 uppercase">
                        {searchResult.passage.version}
                      </span>
                    </div>

                    <button 
                      onClick={() => handleNavigate('next')}
                      disabled={isSearching}
                      className="p-2 text-bible-400 hover:text-bible-700 hover:bg-bible-100 rounded-full transition-colors"
                      title={language === 'zh' ? "下一章" : "Next Chapter"}
                    >
                      <ChevronRight className="w-6 h-6" />
                    </button>
                  </div>
                  
                  {/* Play Button (Primary Action) */}
                  {playlist.length === 0 && (
                    <button
                      onClick={handlePlay}
                      disabled={isGeneratingAudio}
                      className="flex items-center gap-2 bg-bible-800 text-white px-6 py-2.5 rounded-full font-medium hover:bg-bible-900 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-70 disabled:transform-none w-full md:w-auto justify-center flex-shrink-0"
                    >
                      {isGeneratingAudio ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>{language === 'zh' ? '準備播放中...' : 'Preparing...'}</span>
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-5 h-5" />
                          <span>{language === 'zh' ? `播放 (${podcastLength} 分鐘)` : `Play (${podcastLength} min)`}</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* Generated Image Section (If available) */}
                {(generatedImageUrl || isGeneratingImage) && (
                  <div className="w-full h-56 md:h-80 bg-stone-200 relative overflow-hidden group">
                    {isGeneratingImage ? (
                      <div className="absolute inset-0 flex items-center justify-center bg-stone-100">
                        <div className="text-center text-bible-400">
                          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                          <span className="text-sm font-medium">{language === 'zh' ? '正在繪製經文意境...' : 'Visualizing verse...'}</span>
                        </div>
                      </div>
                    ) : generatedImageUrl ? (
                      <>
                        <img 
                          src={generatedImageUrl} 
                          alt="Biblical Visualization" 
                          className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                        />
                        <div className="absolute bottom-2 right-2 bg-black/50 backdrop-blur-md text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                          <ImageIcon className="w-3 h-3" />
                          <span>AI Generated</span>
                        </div>
                      </>
                    ) : null}
                  </div>
                )}

                {/* Verse Body */}
                <div className="p-8 md:p-10">
                   <blockquote className="relative">
                      <span className="absolute -top-4 -left-4 text-6xl text-bible-100 font-serif opacity-50">“</span>
                      <p className="text-xl md:text-2xl leading-relaxed font-serif text-bible-800 text-center italic">
                        {searchResult.passage.text}
                      </p>
                      <span className="absolute -bottom-8 -right-4 text-6xl text-bible-100 font-serif opacity-50">”</span>
                   </blockquote>
                </div>

                {/* Context Footer */}
                <div className="bg-stone-100 px-6 py-6 text-bible-600 border-t border-bible-100">
                  <div className="flex items-baseline gap-2 mb-3">
                     <span className="text-sm font-bold uppercase tracking-wider text-bible-800 bg-bible-200 px-2 py-0.5 rounded">
                       {language === 'zh' ? '靈修內容' : 'Devotional'}
                     </span>
                     <span className="text-xs text-bible-400">
                        ({podcastLength} {language === 'zh' ? '分鐘' : 'min'})
                     </span>
                  </div>
                  <div className="prose prose-stone prose-sm max-w-none leading-relaxed whitespace-pre-wrap text-justify font-serif">
                    {searchResult.passage.context}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {!searchResult && !isSearching && (
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
               {suggestions.map((suggestion) => (
                 <button 
                   key={suggestion}
                   onClick={() => handleSearch(suggestion)}
                   className="p-4 bg-white rounded-xl border border-bible-200 text-bible-600 hover:border-bible-400 hover:text-bible-900 transition-colors shadow-sm text-sm font-medium"
                 >
                   "{suggestion}"
                 </button>
               ))}
            </div>
          )}
        </main>
      </div>

      {/* Sticky Audio Player with Playlist support */}
      {playlist.length > 0 && (
        <AudioPlayer 
          src={audioUrl} 
          isLoading={isBuffering}
          title={searchResult?.passage.reference || "Scripture Podcast"}
          subtitle={`${language === 'zh' ? '正在播放片段' : 'Playing part'} ${currentChunkIndex + 1} / ${playlist.length}`}
          onClose={resetAudioState}
          onEnded={handleAudioEnded}
        />
      )}
      
      {/* Footer showing versions and Readme */}
      <footer className="fixed bottom-2 right-4 z-50 text-[11px] text-bible-400 bg-white/80 backdrop-blur px-3 py-1 rounded-full shadow-sm border border-bible-200 flex items-center gap-3">
        <span className="font-mono opacity-80">v{CLIENT_VERSION}</span>
        <div className="w-px h-3 bg-bible-300"></div>
        <button 
          onClick={() => setIsAboutOpen(true)}
          className="flex items-center gap-1 hover:text-bible-800 transition-colors cursor-pointer font-medium"
        >
          <Info className="w-3 h-3" />
          {language === 'zh' ? '如何運作?' : 'How it works?'}
        </button>
      </footer>
    </div>
  );
};

export default App;