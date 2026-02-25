"use client";

import { useRef, useEffect, useCallback } from "react";
import { Mic, Square, Pause, Play, Download, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AudioPlayer } from "@/components/ui/audio-player";
import { useGlobalRecording } from "@/contexts/GlobalRecordingContext";

function resolveDeviceId(inputs: MediaDeviceInfo[], preferred: string): string {
  if (inputs.find((d) => d.deviceId === preferred)) return preferred;
  const fallback = inputs.find((d) => d.deviceId === "default");
  return fallback?.deviceId || inputs[0]?.deviceId || "";
}

function getExtensionForMime(mimeType: string): string {
  return mimeType.startsWith("audio/mp4") ? "mp4" : "webm";
}

interface AudioRecorderProps {
  onFileSelected: (file: File) => void;
  onSkipUpload: () => void;
  onOpenSettings: () => void;
  disabled?: boolean;
  uploading?: boolean;
  hasAssemblyAiKey: boolean;
}

const BAR_COUNT = 40;
const BAR_GAP = 2;
const STATIC_HEIGHTS = [
  0.3, 0.5, 0.4, 0.7, 0.6, 0.8, 0.5, 0.3, 0.6, 0.4, 0.9, 0.7, 0.5, 0.4,
  0.6, 0.8, 0.3, 0.5, 0.7, 0.4, 0.6, 0.5, 0.8, 0.3, 0.6, 0.4, 0.7, 0.5,
  0.3, 0.8, 0.6, 0.4, 0.5, 0.7, 0.3, 0.6, 0.8, 0.4, 0.5, 0.3,
];

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function deviceLabel(device: MediaDeviceInfo, index: number): string {
  return device.label || `Microphone ${index + 1}`;
}

function drawBars(
  canvas: HTMLCanvasElement,
  active: boolean,
  analyser?: AnalyserNode,
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const W = canvas.width;
  const H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  const barWidth = (W - BAR_GAP * (BAR_COUNT - 1)) / BAR_COUNT;
  const styles = getComputedStyle(document.documentElement);
  const activeColor = styles.getPropertyValue("--primary").trim() || "#FC520B";
  const inactiveColor = styles.getPropertyValue("--muted-foreground").trim() || "#71717A";

  if (active && analyser) {
    ctx.fillStyle = activeColor;
    const data = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(data);
    const step = Math.floor(data.length / BAR_COUNT);
    for (let i = 0; i < BAR_COUNT; i++) {
      const value = data[i * step] / 255;
      const barH = Math.max(4, value * H);
      const x = i * (barWidth + BAR_GAP);
      const y = (H - barH) / 2;
      ctx.fillRect(x, y, barWidth, barH);
    }
  } else {
    ctx.fillStyle = inactiveColor;
    for (let i = 0; i < BAR_COUNT; i++) {
      const barH = Math.max(4, STATIC_HEIGHTS[i % STATIC_HEIGHTS.length] * H);
      const x = i * (barWidth + BAR_GAP);
      const y = (H - barH) / 2;
      ctx.fillRect(x, y, barWidth, barH);
    }
  }
}

export function AudioRecorder({
  onFileSelected,
  onSkipUpload,
  onOpenSettings,
  disabled,
  uploading,
  hasAssemblyAiKey,
}: AudioRecorderProps) {
  const {
    recorderState,
    elapsedSeconds,
    recordedBlob,
    audioUrl,
    micDevices,
    selectedDeviceId,
    recordMode,
    supportsSystemAudio,
    analyserNode,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    resetRecording,
    setSelectedDeviceId,
    setRecordMode,
  } = useGlobalRecording();

  const animationFrameRef = useRef<number | null>(null);
  const liveCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const doneCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Waveform animation loop
  const scheduleDraw = useCallback(() => {
    if (!liveCanvasRef.current) {
      animationFrameRef.current = requestAnimationFrame(scheduleDraw);
      return;
    }
    drawBars(liveCanvasRef.current, true, analyserNode ?? undefined);
    animationFrameRef.current = requestAnimationFrame(scheduleDraw);
  }, [analyserNode]);

  // Start/stop animation based on recorder state
  useEffect(() => {
    if (recorderState === "recording" && analyserNode) {
      animationFrameRef.current = requestAnimationFrame(scheduleDraw);
    } else {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      // Draw static bars when paused
      if (recorderState === "paused" && liveCanvasRef.current) {
        drawBars(liveCanvasRef.current, false);
      }
    }
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [recorderState, analyserNode, scheduleDraw]);

  // Draw static waveform once "done" canvas is mounted
  useEffect(() => {
    if (recorderState === "done" && doneCanvasRef.current) {
      drawBars(doneCanvasRef.current, false);
    }
  }, [recorderState]);

  const handleDownload = useCallback(() => {
    if (!recordedBlob) return;
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const ext = getExtensionForMime(recordedBlob.type);
    const url = URL.createObjectURL(recordedBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `recording-${timestamp}.${ext}`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }, [recordedBlob]);

  const handleUseForTranscript = useCallback(() => {
    if (!recordedBlob) return;
    const ext = getExtensionForMime(recordedBlob.type);
    const file = new File([recordedBlob], `recording.${ext}`, {
      type: recordedBlob.type,
    });
    onFileSelected(file);
  }, [recordedBlob, onFileSelected]);

  const isDisabled = disabled || uploading;

  const micSelector = micDevices.length > 1 && (
    <Select
      value={resolveDeviceId(micDevices, selectedDeviceId)}
      onValueChange={setSelectedDeviceId}
      disabled={isDisabled}
    >
      <SelectTrigger className="h-9 w-52 text-sm">
        <SelectValue placeholder="Select microphone" />
      </SelectTrigger>
      <SelectContent>
        {micDevices.map((device, i) => (
          <SelectItem key={device.deviceId} value={device.deviceId}>
            {deviceLabel(device, i)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  // --- No AssemblyAI key ---
  if (!hasAssemblyAiKey) {
    return (
      <div className="flex min-h-[240px] flex-col items-center justify-center gap-4 rounded-lg border border-border bg-card p-6">
        <p
          className="text-sm text-warning cursor-pointer hover:underline"
          onClick={onOpenSettings}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") onOpenSettings();
          }}
          role="button"
          tabIndex={0}
        >
          Please add your AssemblyAI API key in Settings before you can
          record and transcribe audio.
        </p>
        <div className="mt-2 w-full border-t border-border pt-4 flex justify-center">
          <button
            type="button"
            onClick={onSkipUpload}
            className="text-sm text-foreground-muted hover:text-foreground-secondary underline underline-offset-4 transition-colors"
          >
            I already have a transcript — skip upload
          </button>
        </div>
      </div>
    );
  }

  // --- Uploading state ---
  if (uploading) {
    return (
      <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 rounded-lg border border-border bg-card p-6 opacity-50">
        <Mic className="h-12 w-12 text-foreground-muted" />
        <p className="text-sm text-foreground-secondary">
          Uploading recording...
        </p>
      </div>
    );
  }

  return (
    <div
      className={`flex min-h-[240px] flex-col items-center justify-center gap-4 rounded-lg border p-6 transition-colors duration-150 ${
        isDisabled
          ? "border-border bg-card opacity-50"
          : recorderState === "recording"
            ? "border-border-accent bg-primary-muted"
            : "border-border bg-card"
      }`}
    >
        {/* Idle */}
        {recorderState === "idle" && (
          <>
            <Mic className="h-12 w-12 text-foreground-muted" />
            <p className="text-sm text-foreground-secondary">
              {recordMode === "meeting"
                ? "Share your entire screen and check 'Also share system audio' in the dialog"
                : "Click the button to start recording"}
            </p>
            <p className="text-xs text-foreground-muted">
              {recordMode === "meeting"
                ? "Best used with headphones to avoid mic feedback"
                : "Best used when playing audio through speakers"}
            </p>
            <div className="flex flex-col items-center gap-1">
              <p className="text-xs font-medium text-foreground-muted">Audio Source</p>
              <div className="flex rounded-md border border-border text-xs">
                <button
                  type="button"
                  onClick={() => setRecordMode("mic")}
                  className={`px-3 py-1.5 rounded-l-md transition-colors ${
                    recordMode === "mic"
                      ? "bg-card-elevated text-foreground"
                      : "text-foreground-muted hover:text-foreground-secondary"
                  }`}
                >
                  Mic Only
                </button>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => supportsSystemAudio && setRecordMode("meeting")}
                      disabled={!supportsSystemAudio}
                      className={`px-3 py-1.5 rounded-r-md transition-colors ${
                        recordMode === "meeting"
                          ? "bg-card-elevated text-foreground"
                          : supportsSystemAudio
                            ? "text-foreground-muted hover:text-foreground-secondary"
                            : "text-foreground-muted opacity-40 cursor-not-allowed"
                      }`}
                    >
                      Mic + Meeting Audio
                    </button>
                  </TooltipTrigger>
                  {!supportsSystemAudio ? (
                    <TooltipContent>
                      Only supported on Chromium-based browsers like Google Chrome, Brave, or Edge
                    </TooltipContent>
                  ) : null}
                </Tooltip>
              </div>
            </div>
            {micSelector}
            <Button
              onClick={startRecording}
              disabled={isDisabled}
            >
              {recordMode === "meeting" ? "Share Screen & Record" : "Start Recording"}
            </Button>
            <div className="w-full border-t border-border pt-4 flex justify-center">
              <button
                type="button"
                onClick={onSkipUpload}
                className="text-sm text-foreground-muted hover:text-foreground-secondary underline underline-offset-4 transition-colors"
              >
                I already have a transcript — skip upload
              </button>
            </div>
          </>
        )}

        {/* Recording / Paused */}
        {(recorderState === "recording" || recorderState === "paused") && (
          <>
            <div className="flex items-center gap-2">
              {recorderState === "recording" ? (
                <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-destructive" />
              ) : (
                <span className="h-2.5 w-2.5 rounded-full bg-foreground-muted" />
              )}
              <span className="font-mono text-lg font-medium text-foreground">
                {formatTime(elapsedSeconds)}
              </span>
              {recorderState === "paused" && (
                <span className="text-xs text-foreground-muted">Paused</span>
              )}
            </div>

            <canvas
              ref={liveCanvasRef}
              width={320}
              height={60}
              className="w-full max-w-[320px]"
            />

            <div className="flex gap-2">
              {recorderState === "recording" ? (
                <Button
                  variant="secondary"
                  onClick={pauseRecording}
                  className="gap-2"
                >
                  <Pause className="h-4 w-4" />
                  Pause
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  onClick={resumeRecording}
                  className="gap-2"
                >
                  <Play className="h-4 w-4" />
                  Resume
                </Button>
              )}
              <Button
                variant="destructive"
                onClick={stopRecording}
                className="gap-2"
              >
                <Square className="h-4 w-4" />
                Stop
              </Button>
            </div>
          </>
        )}

        {/* Done */}
        {recorderState === "done" && (
          <>
            <p className="font-mono text-sm text-foreground-muted">
              {formatTime(elapsedSeconds)} recorded
            </p>

            <canvas
              ref={doneCanvasRef}
              width={320}
              height={60}
              className="w-full max-w-[320px]"
            />

            {audioUrl && <AudioPlayer src={audioUrl} knownDuration={elapsedSeconds} />}

            <div className="flex flex-wrap justify-center gap-2">
              <Button
                variant="ghost"
                onClick={resetRecording}
                className="gap-2"
              >
                <Mic className="h-4 w-4" />
                Record Again
              </Button>
              <Button
                variant="secondary"
                onClick={handleDownload}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Download
              </Button>
              <Button onClick={handleUseForTranscript} className="gap-2">
                <CheckCircle className="h-4 w-4" />
                Use for Transcript
              </Button>
            </div>
          </>
        )}
    </div>
  );
}
