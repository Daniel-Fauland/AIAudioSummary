"use client";

import { useState, useRef, useEffect, useCallback } from "react";
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
import { toast } from "sonner";
import { AudioPlayer } from "@/components/ui/audio-player";

const MIC_STORAGE_KEY = "aias:v1:mic_device_id";

function getSavedMicId(): string {
  try {
    return localStorage.getItem(MIC_STORAGE_KEY) || "default";
  } catch {
    return "default";
  }
}

function saveMicId(deviceId: string) {
  try {
    localStorage.setItem(MIC_STORAGE_KEY, deviceId);
  } catch {
    // localStorage not available
  }
}

function resolveDeviceId(inputs: MediaDeviceInfo[], preferred: string): string {
  if (inputs.find((d) => d.deviceId === preferred)) return preferred;
  const fallback = inputs.find((d) => d.deviceId === "default");
  return fallback?.deviceId || inputs[0]?.deviceId || "";
}

function getSupportedMimeType(): string {
  const types = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4;codecs=aac",
    "audio/mp4",
  ];
  return types.find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
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

type RecorderState = "idle" | "recording" | "paused" | "done";

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

  if (active && analyser) {
    ctx.fillStyle = "#FC520B";
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
    ctx.fillStyle = "#71717A";
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
  const [recorderState, setRecorderState] = useState<RecorderState>("idle");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  // Microphone device state
  const [micDevices, setMicDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>(getSavedMicId);

  // Recording mode: "mic" (mic only) or "meeting" (mic + system audio)
  const [recordMode, setRecordMode] = useState<"mic" | "meeting">("mic");
  // Whether the browser supports getDisplayMedia with audio (Chromium only)
  const [supportsSystemAudio, setSupportsSystemAudio] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const displayStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const mimeTypeRef = useRef<string>("");
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const liveCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const doneCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef = useRef(0);
  const audioUrlRef = useRef<string | null>(null);

  // Enumerate audio input devices and update state
  const refreshDevices = useCallback(async () => {
    try {
      const all = await navigator.mediaDevices.enumerateDevices();
      const inputs = all.filter((d) => d.kind === "audioinput");
      setMicDevices(inputs);
      // If the currently selected device was removed, fall back to "default"
      setSelectedDeviceId((prev) => resolveDeviceId(inputs, prev));
    } catch {
      // enumerateDevices not supported — ignore
    }
  }, []);

  // Enumerate on mount and listen for device changes
  useEffect(() => {
    refreshDevices();
    const mmd = navigator.mediaDevices;
    if (mmd?.addEventListener) {
      mmd.addEventListener("devicechange", refreshDevices);
      return () => mmd.removeEventListener("devicechange", refreshDevices);
    }
  }, [refreshDevices]);

  // Detect Chromium-based browser with getDisplayMedia support (SSR-safe)
  useEffect(() => {
    setSupportsSystemAudio(
      typeof window !== "undefined" &&
        "chrome" in window &&
        typeof navigator.mediaDevices?.getDisplayMedia === "function",
    );
  }, []);

  // On mount: if device labels are already available (permission previously granted),
  // just re-enumerate — no need to activate the mic. Only call getUserMedia when
  // labels are absent (Safari before first permission grant) to unlock them.
  // This prevents triggering the iPhone Continuity Mic popup on Chrome.
  useEffect(() => {
    navigator.mediaDevices
      .enumerateDevices()
      .then((devices) => {
        const hasLabels = devices
          .filter((d) => d.kind === "audioinput")
          .some((d) => d.label !== "");
        if (hasLabels) {
          refreshDevices();
        } else {
          navigator.mediaDevices
            .getUserMedia({ audio: true })
            .then((stream) => {
              stream.getTracks().forEach((t) => t.stop());
              refreshDevices();
            })
            .catch(() => {});
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopMic();
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (timerRef.current !== null) {
        clearInterval(timerRef.current);
      }
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Draw static waveform once "done" canvas is mounted
  useEffect(() => {
    if (recorderState === "done" && doneCanvasRef.current) {
      drawBars(doneCanvasRef.current, false);
    }
  }, [recorderState]);

  function stopMic() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (displayStreamRef.current) {
      displayStreamRef.current.getTracks().forEach((t) => t.stop());
      displayStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
      analyserRef.current = null;
    }
  }

  function stopTimer() {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  function startTimer() {
    timerRef.current = setInterval(() => {
      elapsedRef.current += 1;
      setElapsedSeconds(elapsedRef.current);
    }, 1000);
  }

  function scheduleDraw() {
    if (!liveCanvasRef.current) {
      animationFrameRef.current = requestAnimationFrame(scheduleDraw);
      return;
    }
    drawBars(liveCanvasRef.current, true, analyserRef.current ?? undefined);
    animationFrameRef.current = requestAnimationFrame(scheduleDraw);
  }

  const startRecording = useCallback(async () => {
    const audioConstraints: MediaTrackConstraints = selectedDeviceId
      ? { deviceId: { exact: selectedDeviceId } }
      : (true as unknown as MediaTrackConstraints);

    try {
      let recordStream: MediaStream;

      if (recordMode === "meeting") {
        // 1. Prompt user to pick a tab/window (must share audio)
        let displayStream: MediaStream;
        try {
          displayStream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: true,
          });
        } catch {
          // User cancelled the screen-share dialog — return silently
          return;
        }

        // Stop video tracks — we only need audio
        displayStream.getVideoTracks().forEach((t) => t.stop());
        displayStreamRef.current = displayStream;

        // Check that audio was actually shared
        if (displayStream.getAudioTracks().length === 0) {
          displayStream.getTracks().forEach((t) => t.stop());
          displayStreamRef.current = null;
          toast.error(
            "No audio was shared. Make sure to check 'Share audio' in the share dialog.",
          );
          return;
        }

        // 2. Capture mic separately
        let micStream: MediaStream;
        try {
          micStream = await navigator.mediaDevices.getUserMedia({
            audio: audioConstraints,
          });
        } catch {
          // Mic denied — clean up display stream first
          displayStream.getTracks().forEach((t) => t.stop());
          displayStreamRef.current = null;
          toast.error(
            "Microphone permission denied. Please allow microphone access in your browser settings.",
          );
          return;
        }
        streamRef.current = micStream;

        // Re-enumerate after permission grant to pick up real device labels
        refreshDevices();

        // 3. Merge both streams via AudioContext
        const audioContext = new AudioContext();
        audioContextRef.current = audioContext;
        const destination = audioContext.createMediaStreamDestination();
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        analyserRef.current = analyser;

        const micSource = audioContext.createMediaStreamSource(micStream);
        const sysSource = audioContext.createMediaStreamSource(displayStream);

        micSource.connect(analyser);
        micSource.connect(destination);
        sysSource.connect(analyser);
        sysSource.connect(destination);

        recordStream = destination.stream;
      } else {
        // Mic-only path (original behaviour)
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: audioConstraints,
        });
        streamRef.current = stream;

        // Re-enumerate after permission grant to pick up real device labels
        refreshDevices();

        const audioContext = new AudioContext();
        audioContextRef.current = audioContext;
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        analyserRef.current = analyser;

        recordStream = stream;
      }

      chunksRef.current = [];
      const mimeType = getSupportedMimeType();
      mimeTypeRef.current = mimeType;
      const recorder = new MediaRecorder(
        recordStream,
        mimeType ? { mimeType } : undefined,
      );
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: mimeTypeRef.current || "audio/webm",
        });
        setRecordedBlob(blob);
        const url = URL.createObjectURL(blob);
        audioUrlRef.current = url;
        setAudioUrl(url);
        setRecorderState("done");
        stopMic();
        if (animationFrameRef.current !== null) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
      };

      recorder.start();
      setRecorderState("recording");
      elapsedRef.current = 0;
      setElapsedSeconds(0);
      startTimer();
      animationFrameRef.current = requestAnimationFrame(scheduleDraw);
    } catch {
      toast.error(
        "Microphone permission denied. Please allow microphone access in your browser settings.",
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDeviceId, refreshDevices, recordMode]);

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.pause();
      setRecorderState("paused");
      stopTimer();
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      if (liveCanvasRef.current) {
        drawBars(liveCanvasRef.current, false);
      }
    }
  }, []);

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "paused") {
      mediaRecorderRef.current.resume();
      setRecorderState("recording");
      startTimer();
      animationFrameRef.current = requestAnimationFrame(scheduleDraw);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopRecording = useCallback(() => {
    stopTimer();
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const handleRecordAgain = useCallback(() => {
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
      setAudioUrl(null);
    }
    setRecordedBlob(null);
    elapsedRef.current = 0;
    setElapsedSeconds(0);
    setRecorderState("idle");
  }, []);

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

  const handleMicChange = useCallback((deviceId: string) => {
    setSelectedDeviceId(deviceId);
    saveMicId(deviceId);
  }, []);

  // The mic selector — only shown in idle state when multiple devices exist
  const micSelector = micDevices.length > 1 && (
    <div className="flex items-center gap-2">
      <Mic className="h-4 w-4 shrink-0 text-foreground-muted" />
      <Select
        value={resolveDeviceId(micDevices, selectedDeviceId)}
        onValueChange={handleMicChange}
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
    </div>
  );

  // --- No AssemblyAI key ---
  if (!hasAssemblyAiKey) {
    return (
      <div className="space-y-3">
        <div className="flex min-h-[240px] items-center justify-center rounded-lg border-2 border-dashed border-border bg-card p-6">
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
        </div>
        <div className="flex justify-center">
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
      <div className="space-y-3">
        <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-border bg-card p-6 opacity-50">
          <Mic className="h-12 w-12 text-foreground-muted" />
          <p className="text-sm text-foreground-secondary">
            Uploading recording...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div
        className={`flex min-h-[240px] flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed p-6 transition-colors duration-150 ${
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
            {micSelector}
            <Button
              onClick={startRecording}
              disabled={isDisabled}
              className="gap-2"
            >
              <Mic className="h-4 w-4" />
              {recordMode === "meeting" ? "Share Screen & Record" : "Start Recording"}
            </Button>
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
                onClick={handleRecordAgain}
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

      <div className="flex justify-center">
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
