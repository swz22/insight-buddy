"use client";

import { useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";
import { Play, Pause, SkipBack, SkipForward, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AudioPlayerProps {
  audioUrl?: string;
  url?: string;
  className?: string;
}

export function AudioPlayer({ audioUrl, url: urlProp, className }: AudioPlayerProps) {
  const url = audioUrl || urlProp;
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [volume, setVolume] = useState(1);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!url) {
      setError("No audio URL provided");
      setIsLoading(false);
      return;
    }

    let wavesurfer: WaveSurfer | null = null;
    let mounted = true;

    const initWaveSurfer = async () => {
      if (!containerRef.current || !mounted) return;

      try {
        // Create WaveSurfer instance
        wavesurfer = WaveSurfer.create({
          container: containerRef.current,
          waveColor: "#94a3b8",
          progressColor: "#a855f7",
          cursorColor: "#06b6d4",
          barWidth: 2,
          barRadius: 3,
          cursorWidth: 2,
          height: 80,
          barGap: 3,
          normalize: true,
          backend: "WebAudio",
        });

        // Set up event listeners
        wavesurfer.on("ready", () => {
          if (mounted && wavesurferRef.current) {
            setIsLoading(false);
            setDuration(wavesurferRef.current.getDuration());
            setError(null);
          }
        });

        wavesurfer.on("audioprocess", () => {
          if (mounted && wavesurfer) {
            setCurrentTime(wavesurfer.getCurrentTime());
          }
        });

        wavesurfer.on("play", () => mounted && setIsPlaying(true));
        wavesurfer.on("pause", () => mounted && setIsPlaying(false));
        wavesurfer.on("finish", () => mounted && setIsPlaying(false));

        wavesurfer.on("error", (err: Error) => {
          console.error("WaveSurfer error:", err);
          if (mounted) {
            setError(err.message || "Failed to load audio");
            setIsLoading(false);
          }
        });

        // Store reference
        if (mounted) {
          wavesurferRef.current = wavesurfer;
        }

        // Load audio
        await wavesurfer.load(url);
      } catch (err) {
        console.error("Failed to initialize audio player:", err);
        if (mounted) {
          setError("Failed to initialize audio player");
          setIsLoading(false);
        }
      }
    };

    // Initialize with a small delay to ensure component is mounted
    const timer = setTimeout(() => {
      initWaveSurfer();
    }, 100);

    // Keyboard shortcuts
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (!wavesurferRef.current) return;

      switch (e.key) {
        case " ":
          e.preventDefault();
          wavesurferRef.current.playPause();
          break;
        case "ArrowLeft":
          e.preventDefault();
          wavesurferRef.current.skip(-10);
          break;
        case "ArrowRight":
          e.preventDefault();
          wavesurferRef.current.skip(10);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyPress);

    // Cleanup
    return () => {
      mounted = false;
      clearTimeout(timer);
      window.removeEventListener("keydown", handleKeyPress);

      if (wavesurfer) {
        try {
          wavesurfer.destroy();
        } catch (err) {
          // Ignore destroy errors
          console.debug("WaveSurfer cleanup error:", err);
        }
      }
    };
  }, [url]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handlePlayPause = () => {
    wavesurferRef.current?.playPause();
  };

  const handleSkip = (seconds: number) => {
    wavesurferRef.current?.skip(seconds);
  };

  const handlePlaybackRateChange = () => {
    const rates = [0.5, 0.75, 1, 1.25, 1.5, 2];
    const currentIndex = rates.indexOf(playbackRate);
    const nextIndex = (currentIndex + 1) % rates.length;
    const newRate = rates[nextIndex];
    setPlaybackRate(newRate);
    wavesurferRef.current?.setPlaybackRate(newRate);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    wavesurferRef.current?.setVolume(newVolume);
  };

  if (error) {
    return (
      <div className={cn("bg-white/[0.03] backdrop-blur-sm rounded-lg p-4 border border-white/10", className)}>
        <div className="text-center text-red-400">
          <p>{error}</p>
          <p className="text-sm text-white/50 mt-2">Please try refreshing the page</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("bg-white/[0.03] backdrop-blur-sm rounded-lg p-4 border border-white/10", className)}>
      {/* Waveform Container */}
      <div ref={containerRef} className="mb-4" />

      {/* Controls */}
      <div className="space-y-4">
        {/* Playback Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleSkip(-10)}
              disabled={isLoading}
              className="hover:bg-white/10"
            >
              <SkipBack className="w-4 h-4" />
            </Button>

            <Button size="sm" variant="glow" onClick={handlePlayPause} disabled={isLoading} className="hover:scale-110">
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : isPlaying ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4" />
              )}
            </Button>

            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleSkip(10)}
              disabled={isLoading}
              className="hover:bg-white/10"
            >
              <SkipForward className="w-4 h-4" />
            </Button>
          </div>

          {/* Time Display */}
          <div className="text-sm text-white/60">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>
        </div>

        {/* Additional Controls */}
        <div className="flex items-center justify-between">
          {/* Playback Speed */}
          <Button
            size="sm"
            variant="ghost"
            onClick={handlePlaybackRateChange}
            disabled={isLoading}
            className="hover:bg-white/10 text-xs"
          >
            {playbackRate}x
          </Button>

          {/* Volume Control */}
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-white/60" />
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={volume}
              onChange={handleVolumeChange}
              className="w-24 accent-purple-500"
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Keyboard Shortcuts Help */}
        <div className="text-xs text-white/40 text-center">Space: Play/Pause • ←/→: Skip 10s</div>
      </div>
    </div>
  );
}
