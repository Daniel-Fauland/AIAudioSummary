"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Play, Pause, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

interface AudioPlayerProps {
  src: string;
  className?: string;
}

// Thumb overrides scoped to the audio player — leaves the global Slider unchanged.
// Thumb is hidden by default and fades in when the slider track is hovered or focused.
const THUMB_CLS = [
  "[&_[data-slot=slider-thumb]]:size-3",
  "[&_[data-slot=slider-thumb]]:bg-primary",
  "[&_[data-slot=slider-thumb]]:border-0",
  "[&_[data-slot=slider-thumb]]:shadow-none",
  "[&_[data-slot=slider-thumb]]:opacity-0",
  "[&_[data-slot=slider-thumb]]:scale-75",
  "[&_[data-slot=slider-thumb]]:transition-all",
  "[&_[data-slot=slider-thumb]]:duration-150",
  "[&:hover_[data-slot=slider-thumb]]:opacity-100",
  "[&:hover_[data-slot=slider-thumb]]:scale-100",
  "[&:focus-within_[data-slot=slider-thumb]]:opacity-100",
  "[&:focus-within_[data-slot=slider-thumb]]:scale-100",
].join(" ");

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || isNaN(seconds)) return "00:00";
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
}

export function AudioPlayer({ src, className }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => setDuration(audio.duration);
    const onEnded = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("ended", onEnded);
    };
  }, []);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().catch(() => {});
      setIsPlaying(true);
    }
  }, [isPlaying]);

  const handleSeek = useCallback((value: number[]) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = value[0];
    setCurrentTime(value[0]);
  }, []);

  const handleVolume = useCallback(
    (value: number[]) => {
      const audio = audioRef.current;
      if (!audio) return;
      const v = value[0];
      setVolume(v);
      audio.volume = v;
      if (v === 0) {
        setMuted(true);
        audio.muted = true;
      } else if (muted) {
        setMuted(false);
        audio.muted = false;
      }
    },
    [muted],
  );

  const toggleMute = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const next = !muted;
    setMuted(next);
    audio.muted = next;
  }, [muted]);

  return (
    <div
      className={`flex w-full max-w-[320px] items-center gap-2 rounded-lg border border-border bg-card-elevated px-3 py-2 ${className ?? ""}`}
    >
      {/* Hidden audio element */}
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio ref={audioRef} src={src} preload="metadata" />

      {/* Play / Pause */}
      <Button
        variant="ghost"
        size="icon"
        onClick={togglePlay}
        className="h-8 w-8 shrink-0 text-foreground-secondary hover:text-foreground"
        aria-label={isPlaying ? "Pause" : "Play"}
      >
        {isPlaying ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4" />
        )}
      </Button>

      {/* Time */}
      <span className="shrink-0 font-mono text-xs text-foreground-muted tabular-nums">
        {formatTime(currentTime)}&thinsp;/&thinsp;{formatTime(duration)}
      </span>

      {/* Seek bar */}
      <Slider
        min={0}
        max={duration || 1}
        step={0.1}
        value={[currentTime]}
        onValueChange={handleSeek}
        className={`flex-1 ${THUMB_CLS}`}
        aria-label="Seek"
      />

      {/* Mute toggle */}
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleMute}
        className="h-8 w-8 shrink-0 text-foreground-secondary hover:text-foreground"
        aria-label={muted ? "Unmute" : "Mute"}
      >
        {muted || volume === 0 ? (
          <VolumeX className="h-4 w-4" />
        ) : (
          <Volume2 className="h-4 w-4" />
        )}
      </Button>

      {/* Volume slider */}
      <Slider
        min={0}
        max={1}
        step={0.05}
        value={[muted ? 0 : volume]}
        onValueChange={handleVolume}
        className={`w-14 shrink-0 ${THUMB_CLS}`}
        aria-label="Volume"
      />
    </div>
  );
}
