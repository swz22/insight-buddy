"use client";

import { useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";
import { Play, Pause, SkipBack, SkipForward, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AudioPlayerProps {
  url: string;
  className?: string;
}

export function AudioPlayer({ url, className }: AudioPlayerProps) {
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
    let wavesurfer: WaveSurfer | null = null;
    let mounted = true;

    const initWaveSurfer = async () => {
      if (!containerRef.current || !mounted) return;

      try {
        // Create WaveSurfer instance
        wavesurfer = WaveSurfer.create({
          container: containerRef.current,
          waveColor: "#94a3b8",
          progressColor: "#3b82f6",
          cursorColor: "#1e40af",
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
          if (mounted) {
            setIsLoading(false);
            setDuration(wavesurfer!.getDuration());
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
      <div className={cn("bg-gray-50 rounded-lg p-4", className)}>
        <div className="text-center text-red-600">
          <p>{error}</p>
          <p className="text-sm text-gray-500 mt-2">Please try refreshing the page</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("bg-gray-50 rounded-lg p-4", className)}>
      <div className="mb-4">
        <div ref={containerRef} className="w-full" />
        {isLoading && (
          <div className="h-20 flex items-center justify-center">
            <div className="text-sm text-gray-500">Loading waveform...</div>
          </div>
        )}
      </div>

      {!isLoading && (
        <>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>

            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSkip(-10)}
                disabled={isLoading}
                title="Skip back 10 seconds"
              >
                <SkipBack className="w-4 h-4" />
              </Button>

              <Button
                variant="outline"
                size="lg"
                onClick={handlePlayPause}
                disabled={isLoading}
                className="w-14 h-14"
                title={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSkip(10)}
                disabled={isLoading}
                title="Skip forward 10 seconds"
              >
                <SkipForward className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePlaybackRateChange}
                disabled={isLoading}
                className="min-w-[60px]"
                title="Playback speed"
              >
                {playbackRate}x
              </Button>

              <div className="flex items-center gap-2 flex-1">
                <Volume2 className="w-4 h-4 text-gray-600" />
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={volume}
                  onChange={handleVolumeChange}
                  className="flex-1"
                  disabled={isLoading}
                />
              </div>
            </div>
          </div>

          <div className="mt-4 text-xs text-gray-500 text-center">
            Press <kbd className="px-1 py-0.5 bg-gray-200 rounded">Space</kbd> to play/pause,{" "}
            <kbd className="px-1 py-0.5 bg-gray-200 rounded">←</kbd>{" "}
            <kbd className="px-1 py-0.5 bg-gray-200 rounded">→</kbd> to skip
          </div>
        </>
      )}
    </div>
  );
}
