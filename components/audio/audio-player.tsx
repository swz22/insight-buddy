"use client";

import { useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";
import { Play, Pause, RotateCcw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AudioPlayerProps {
  audioUrl: string;
  className?: string;
  mini?: boolean;
}

export function AudioPlayer({ audioUrl, className, mini = false }: AudioPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current || !audioUrl) return;

    let mounted = true;
    let wavesurfer: WaveSurfer | null = null;

    const initWaveSurfer = async () => {
      if (!mounted || !containerRef.current) return;

      try {
        const url = audioUrl.startsWith("http") ? audioUrl : `${window.location.origin}${audioUrl}`;

        wavesurfer = WaveSurfer.create({
          container: containerRef.current,
          waveColor: "rgba(255, 255, 255, 0.3)",
          progressColor: "rgba(147, 51, 234, 0.8)",
          cursorColor: "rgba(147, 51, 234, 1)",
          barWidth: 2,
          barRadius: 3,
          cursorWidth: 2,
          height: mini ? 40 : 80,
          barGap: 3,
          normalize: true,
          backend: "WebAudio",
          interact: true,
          dragToSeek: true,
          hideScrollbar: true,
          autoScroll: true,
          autoCenter: true,
          sampleRate: 8000,
        });

        wavesurfer.on("ready", () => {
          if (mounted) {
            const dur = wavesurfer?.getDuration() || 0;
            setDuration(dur);
            setIsLoading(false);
            setError(null);
          }
        });

        wavesurfer.on("audioprocess", () => {
          if (mounted && wavesurfer) {
            setCurrentTime(wavesurfer.getCurrentTime());
          }
        });

        wavesurfer.on("play", () => {
          if (mounted) setIsPlaying(true);
        });

        wavesurfer.on("pause", () => {
          if (mounted) setIsPlaying(false);
        });

        wavesurfer.on("finish", () => {
          if (mounted) setIsPlaying(false);
        });

        wavesurfer.on("error", (err: Error) => {
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
        }
      }
    };
  }, [audioUrl, mini]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handlePlayPause = () => {
    if (wavesurferRef.current) {
      wavesurferRef.current.playPause();
    }
  };

  const handleRestart = () => {
    if (wavesurferRef.current) {
      wavesurferRef.current.seekTo(0);
      wavesurferRef.current.play();
    }
  };

  if (error) {
    return (
      <div className={cn("text-center py-4", className)}>
        <p className="text-red-400 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div ref={containerRef} className="w-full" />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            size={mini ? "sm" : "default"}
            variant="glass"
            onClick={handlePlayPause}
            disabled={isLoading}
            className="min-w-[44px]"
          >
            {isLoading ? (
              <Loader2 className={cn("animate-spin", mini ? "w-3 h-3" : "w-4 h-4")} />
            ) : isPlaying ? (
              <Pause className={mini ? "w-3 h-3" : "w-4 h-4"} />
            ) : (
              <Play className={mini ? "w-3 h-3" : "w-4 h-4"} />
            )}
          </Button>

          {!mini && (
            <Button size="sm" variant="ghost" onClick={handleRestart} disabled={isLoading}>
              <RotateCcw className="w-4 h-4" />
            </Button>
          )}
        </div>

        <div className={cn("text-white/60 font-mono", mini ? "text-xs" : "text-sm")}>
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>
      </div>
    </div>
  );
}
