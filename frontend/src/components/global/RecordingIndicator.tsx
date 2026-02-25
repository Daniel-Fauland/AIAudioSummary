"use client";

import { useGlobalRecording } from "@/contexts/GlobalRecordingContext";
import { useGlobalRealtime } from "@/contexts/GlobalRealtimeContext";
import { Pause, Play, Square } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export function RecordingIndicator() {
  const recording = useGlobalRecording();
  const realtime = useGlobalRealtime();
  const pathname = usePathname();
  const router = useRouter();

  const isRecording = recording.recorderState === "recording" || recording.recorderState === "paused";
  const isRealtimeActive = realtime.connectionStatus === "connected" || realtime.connectionStatus === "reconnecting" || realtime.connectionStatus === "connecting";

  // Don't show on the main page — the page has its own controls
  const isOnMainPage = pathname === "/";

  if (!isRecording && !isRealtimeActive) return null;
  if (isOnMainPage) return null;

  // Determine label and colors
  let label = "";
  let bgClass = "";
  let dotClass = "";
  if (isRecording && isRealtimeActive) {
    label = "Standard + Realtime";
    bgClass = "bg-destructive/10 border-destructive/20";
    dotClass = "bg-destructive";
  } else if (isRecording) {
    label = "Standard Recording";
    bgClass = "bg-destructive/10 border-destructive/20";
    dotClass = "bg-destructive";
  } else {
    label = "Realtime Session";
    bgClass = "bg-primary/10 border-primary/20";
    dotClass = "bg-primary";
  }

  // Determine elapsed time to show
  const elapsed = isRecording ? recording.elapsedSeconds : realtime.elapsedTime;

  return (
    <div
      className={`fixed top-16 left-0 right-0 z-40 border-b px-4 py-2 transition-all duration-300 animate-in slide-in-from-top-2 ${bgClass}`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between">
        {/* Left: pulsing dot + label */}
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 animate-pulse rounded-full ${dotClass}`} />
          <span className="text-sm font-medium text-foreground">{label}</span>
        </div>

        {/* Center: elapsed time */}
        <span className="font-mono text-sm tabular-nums text-foreground-secondary">
          {formatTime(elapsed)}
        </span>

        {/* Right: controls + nav */}
        <div className="flex items-center gap-2">
          {isRecording && (
            <>
              {recording.recorderState === "recording" ? (
                <button
                  onClick={recording.pauseRecording}
                  className="rounded-md p-1.5 text-foreground-secondary hover:bg-card-elevated hover:text-foreground transition-colors"
                  title="Pause recording"
                >
                  <Pause className="h-4 w-4" />
                </button>
              ) : (
                <button
                  onClick={recording.resumeRecording}
                  className="rounded-md p-1.5 text-foreground-secondary hover:bg-card-elevated hover:text-foreground transition-colors"
                  title="Resume recording"
                >
                  <Play className="h-4 w-4" />
                </button>
              )}
              <button
                onClick={recording.stopRecording}
                className="rounded-md p-1.5 text-destructive hover:bg-destructive/10 transition-colors"
                title="Stop recording"
              >
                <Square className="h-3.5 w-3.5 fill-current" />
              </button>
            </>
          )}
          {isRealtimeActive && !isRecording && (
            <>
              {realtime.isPaused ? (
                <button
                  onClick={realtime.resume}
                  className="rounded-md p-1.5 text-foreground-secondary hover:bg-card-elevated hover:text-foreground transition-colors"
                  title="Resume session"
                >
                  <Play className="h-4 w-4" />
                </button>
              ) : (
                <button
                  onClick={realtime.pause}
                  className="rounded-md p-1.5 text-foreground-secondary hover:bg-card-elevated hover:text-foreground transition-colors"
                  title="Pause session"
                >
                  <Pause className="h-4 w-4" />
                </button>
              )}
              <button
                onClick={() => realtime.disconnect(true)}
                className="rounded-md p-1.5 text-destructive hover:bg-destructive/10 transition-colors"
                title="Stop session"
              >
                <Square className="h-3.5 w-3.5 fill-current" />
              </button>
            </>
          )}

          <button
            onClick={() => router.push("/")}
            className="ml-2 text-xs text-primary hover:text-primary/80 underline underline-offset-2 transition-colors"
          >
            Back to app
          </button>
        </div>
      </div>
    </div>
  );
}
