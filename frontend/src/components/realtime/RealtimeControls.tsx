"use client";

import { useEffect, useState, useCallback } from "react";
import { Mic, Pause, Play, Square, RotateCcw, RefreshCw } from "lucide-react";
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
import { ConnectionStatus } from "./ConnectionStatus";
import type { RealtimeConnectionStatus } from "@/lib/types";

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

interface RealtimeControlsProps {
  connectionStatus: RealtimeConnectionStatus;
  isPaused: boolean;
  isSessionEnded: boolean;
  elapsedTime: number;
  summaryCountdown: number;
  isSummaryUpdating: boolean;
  hasTranscript: boolean;
  hasSummary: boolean;
  recordMode: "mic" | "meeting";
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onManualSummary: () => void;
  onMicChange: (deviceId: string) => void;
  onRecordModeChange: (mode: "mic" | "meeting") => void;
  disabled?: boolean;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function RealtimeControls({
  connectionStatus,
  isPaused,
  isSessionEnded,
  elapsedTime,
  summaryCountdown,
  isSummaryUpdating,
  hasTranscript,
  hasSummary,
  recordMode,
  onStart,
  onPause,
  onResume,
  onStop,
  onManualSummary,
  onMicChange,
  onRecordModeChange,
  disabled,
}: RealtimeControlsProps) {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>(getSavedMicId);
  const [supportsSystemAudio, setSupportsSystemAudio] = useState(false);

  const isIdle = connectionStatus === "disconnected" && !isSessionEnded;
  const isActive = connectionStatus === "connected" || connectionStatus === "reconnecting";
  const isConnecting = connectionStatus === "connecting";

  const loadDevices = useCallback(async () => {
    try {
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = allDevices.filter((d) => d.kind === "audioinput");
      setDevices(audioInputs);
      // Resolve to the best available device, falling back to "default" if stored device is gone
      setSelectedDevice((prev) => resolveDeviceId(audioInputs, prev));
    } catch {
      // Permission not granted yet
    }
  }, []);

  useEffect(() => {
    loadDevices();
    navigator.mediaDevices.addEventListener("devicechange", loadDevices);
    return () => {
      navigator.mediaDevices.removeEventListener("devicechange", loadDevices);
    };
  }, [loadDevices]);

  // Sync the resolved device to the parent whenever selectedDevice changes
  // (including on mount, so the parent always has the correct initial device)
  useEffect(() => {
    onMicChange(selectedDevice);
  }, [selectedDevice, onMicChange]);

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
          loadDevices();
        } else {
          navigator.mediaDevices
            .getUserMedia({ audio: true })
            .then((stream) => {
              stream.getTracks().forEach((t) => t.stop());
              loadDevices();
            })
            .catch(() => {});
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Detect Chromium-based browser with getDisplayMedia support (SSR-safe)
  useEffect(() => {
    setSupportsSystemAudio(
      typeof window !== "undefined" &&
        "chrome" in window &&
        typeof navigator.mediaDevices?.getDisplayMedia === "function",
    );
  }, []);

  const handleDeviceChange = (deviceId: string) => {
    setSelectedDevice(deviceId);
    saveMicId(deviceId);
    onMicChange(deviceId);
  };

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-3">
      {/* Action buttons */}
      <div className="flex items-center gap-2">
        {(isIdle || isSessionEnded) && (
          <Button
            onClick={onStart}
            disabled={disabled || isConnecting}
            size="sm"
          >
            {isSessionEnded ? (
              <>
                <RotateCcw className="mr-2 h-4 w-4" />
                Continue Session
              </>
            ) : recordMode === "meeting" ? (
              <>
                <Mic className="mr-2 h-4 w-4" />
                Share Screen & Start
              </>
            ) : (
              <>
                <Mic className="mr-2 h-4 w-4" />
                Start
              </>
            )}
          </Button>
        )}

        {isActive && !isPaused && (
          <Button variant="secondary" size="sm" onClick={onPause}>
            <Pause className="mr-2 h-4 w-4" />
            Pause
          </Button>
        )}

        {isActive && isPaused && (
          <Button variant="secondary" size="sm" onClick={onResume}>
            <Play className="mr-2 h-4 w-4" />
            Resume
          </Button>
        )}

        {(isActive || isConnecting) && (
          <Button variant="destructive" size="sm" onClick={onStop}>
            <Square className="mr-2 h-3 w-3 fill-current" />
            Stop
          </Button>
        )}
      </div>

      {/* Recording mode toggle */}
      {(isIdle || isSessionEnded) && (
        <div className="flex rounded-md border border-border text-xs">
          <button
            type="button"
            onClick={() => onRecordModeChange("mic")}
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
                onClick={() => supportsSystemAudio && onRecordModeChange("meeting")}
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
      )}

      {/* Mic selector */}
      {(isIdle || isSessionEnded) && devices.length >= 2 && (
        <Select value={resolveDeviceId(devices, selectedDevice)} onValueChange={handleDeviceChange}>
          <SelectTrigger className="h-8 w-[180px] text-xs">
            <Mic className="mr-1 h-3 w-3" />
            <SelectValue placeholder="Microphone" />
          </SelectTrigger>
          <SelectContent>
            {devices.map((d, i) => (
              <SelectItem key={d.deviceId} value={d.deviceId}>
                {d.label || `Microphone ${i + 1}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Connection status */}
      <ConnectionStatus status={connectionStatus} />

      {/* Elapsed time */}
      {(isActive || isConnecting || isSessionEnded) && (
        <span className="font-mono text-xs text-foreground-secondary tabular-nums">
          {formatTime(elapsedTime)}
        </span>
      )}

      {/* Manual summary trigger + countdown */}
      <div className="ml-auto flex items-center gap-2">
        {isActive && (
          <span className="font-mono text-xs text-foreground-muted tabular-nums">
            {formatTime(summaryCountdown)}
          </span>
        )}
        {(isActive || isSessionEnded) && (
          <Button
            variant="secondary"
            size="sm"
            onClick={onManualSummary}
            disabled={!hasTranscript || isSummaryUpdating}
          >
            <RefreshCw className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">{hasSummary ? "Refresh Summary" : "Generate Summary"}</span>
          </Button>
        )}
      </div>
    </div>
  );
}
