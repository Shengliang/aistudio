
import React, { useRef, useEffect, useState } from 'react';
import { Play, Pause, Volume2, X, Loader2 } from './Icons';

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
      // If autoPlay is on, we attempt to play whenever src changes
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
    <div className="fixed bottom-0 left-0 right-0 bg-[#111] border-t border-stone-800 shadow-2xl p-4 z-50 animate-slide-up">
      <div className="max-w-3xl mx-auto flex items-center gap-4">
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

        <button
          onClick={togglePlay}
          disabled={!src || isLoading}
          className="flex-shrink-0 w-12 h-12 bg-tech-500 text-black rounded-full flex items-center justify-center hover:bg-tech-400 transition-colors shadow-lg shadow-tech-900/20 disabled:opacity-50 disabled:cursor-wait"
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : isPlaying ? (
            <Pause className="w-5 h-5 fill-current" />
          ) : (
            <Play className="w-5 h-5 ml-1 fill-current" />
          )}
        </button>

        <div className="flex-grow min-w-0">
          <div className="flex items-baseline justify-between mb-1">
            <h3 className="text-sm font-bold text-stone-200 truncate pr-2 font-mono">{title}</h3>
            <span className="text-xs text-stone-500 font-mono tabular-nums">
              {formatTime(audioRef.current?.currentTime || 0)} / {formatTime(duration)}
            </span>
          </div>
          <div className="relative w-full h-2 bg-stone-800 rounded-full overflow-hidden">
             <div 
               className="absolute top-0 left-0 h-full bg-tech-600 transition-all duration-100" 
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
           {subtitle && <p className="text-xs text-tech-600 mt-1 truncate font-mono">{subtitle}</p>}
        </div>

        <button 
          onClick={onClose}
          className="flex-shrink-0 p-2 text-stone-500 hover:text-stone-300 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default AudioPlayer;
