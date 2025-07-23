"use client";

import { useRef, useState } from "react";
import { Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MiniAudioPlayerProps {
  url: string;
  onPlayingChange?: (isPlaying: boolean) => void;
}

export function MiniAudioPlayer({ url, onPlayingChange }: MiniAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const handlePlayPause = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handlePlay = () => {
    setIsPlaying(true);
    onPlayingChange?.(true);
  };

  const handlePause = () => {
    setIsPlaying(false);
    onPlayingChange?.(false);
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
      <Button size="sm" variant="ghost" onClick={handlePlayPause} className="w-8 h-8 p-0">
        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
      </Button>

      <div className="flex-1 h-2 bg-gray-200/20 rounded-full relative overflow-hidden cursor-pointer group hover:h-3 transition-all">
        <div
          className="absolute left-0 top-0 h-full bg-gradient-to-r from-purple-500 to-cyan-500 transition-all duration-200"
          style={{ width: `${progress}%` }}
        />
      </div>

      <audio
        ref={audioRef}
        src={url}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onPlay={handlePlay}
        onPause={handlePause}
        onEnded={handlePause}
      />
    </div>
  );
}
