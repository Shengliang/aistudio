
import React, { useRef, useEffect, useState } from 'react';
import { Play, Pause, Volume2, X, Loader2, Terminal, Maximize2 } from './Icons';

interface AudioPlayerProps {
  src: string | undefined;
  title: string;
  subtitle?: string;
  onClose: () => void;
  onEnded?: () => void;
  autoPlay?: boolean;
  isLoading?: boolean;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ 
  src, 
  title, 
  subtitle, 
  onClose, 
  onEnded,
  autoPlay = true,
  isLoading = false
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  // Handle source changes
  useEffect(() => {
    if (src && audioRef.current) {
      if (autoPlay) {
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => setIsPlaying(true))
            .catch(e => console.error("Playback failed or interrupted", e));
        }
      }
    }
  }, [src, autoPlay]);

  const togglePlay = () => {
    if (audioRef.current && src) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const current = audioRef.current.currentTime;
      const total = audioRef.current.duration;
      setDuration(total || 0);
      setProgress(current / total * 100 || 0);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const seekTo = parseFloat(e.target.value);
    if (audioRef.current && duration) {
      audioRef.current.currentTime = (seekTo / 100) * duration;
      setProgress(seekTo);
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const min = Math.floor(time / 60);
    const sec = Math.floor(time % 60);
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-[#0c0c0c] border-t border-stone-800 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] p-4 z-50 animate-slide-up">
      <div className="max-w-4xl mx-auto flex items-center gap-5">
        
        {/* Icon Box */}
        <div className="hidden md:flex w-12 h-12 bg-stone-900 rounded border border-stone-800 items-center justify-center text-tech-500">
           <Terminal className="w-6 h-6" />
        </div>

        <audio
          ref={audioRef}
          src={src}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onTimeUpdate={handleTimeUpdate}
          onEnded={() => {
            setIsPlaying(false);
            onEnded?.();
          }}
        />

        {/* Play Button */}
        <button
          onClick={togglePlay}
          disabled={!src || isLoading}
          className="flex-shrink-0 w-14 h-14 bg-tech-600 hover:bg-tech-500 text-white rounded-full flex items-center justify-center transition-all shadow-lg shadow-tech-900/50 disabled:opacity-50 disabled:cursor-wait disabled:bg-stone-800"
        >
          {isLoading ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : isPlaying ? (
            <Pause className="w-6 h-6 fill-current" />
          ) : (
            <Play className="w-6 h-6 ml-1 fill-current" />
          )}
        </button>

        {/* Info & Scrubber */}
        <div className="flex-grow min-w-0">
          <div className="flex items-baseline justify-between mb-2">
            <div>
                <h3 className="text-sm font-bold text-stone-200 truncate font-display tracking-tight">{title}</h3>
                {subtitle && <p className="text-xs text-tech-400 truncate font-mono mt-0.5">{subtitle}</p>}
            </div>
            <span className="text-xs text-stone-500 font-mono tabular-nums">
              {formatTime(audioRef.current?.currentTime || 0)} / {formatTime(duration)}
            </span>
          </div>
          
          {/* Progress Bar */}
          <div className="relative w-full h-1.5 bg-stone-800 rounded-full overflow-hidden group">
             <div 
               className="absolute top-0 left-0 h-full bg-tech-500 transition-all duration-100 group-hover:bg-tech-400" 
               style={{ width: `${progress}%` }} 
             />
             <input 
               type="range" 
               min="0" 
               max="100" 
               value={progress} 
               onChange={handleSeek}
               disabled={!src || isLoading}
               className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
             />
          </div>
        </div>

        {/* Close */}
        <button 
          onClick={onClose}
          className="flex-shrink-0 p-2 text-stone-600 hover:text-stone-300 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default AudioPlayer;
