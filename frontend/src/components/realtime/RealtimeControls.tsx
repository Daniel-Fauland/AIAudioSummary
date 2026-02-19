"use client";

import { useEffect, useState, useCallback } from "react";
import { Mic, Pause, Play, Square, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConnectionStatus } from "./ConnectionStatus";
import type { RealtimeConnectionStatus, SummaryInterval } from "@/lib/types";

interface RealtimeControlsProps {
  connectionStatus: RealtimeConnectionStatus;
  isPaused: boolean;
  isSessionEnded: boolean;
  elapsedTime: number;
  summaryInterval: SummaryInterval;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onIntervalChange: (interval: SummaryInterval) => void;
  onMicChange: (deviceId: string) => void;
  disabled?: boolean;
}

const INTERVAL_OPTIONS: { value: SummaryInterval; label: string }[] = [
  { value: 1, label: "1 min" },
  { value: 2, label: "2 min" },
  { value: 3, label: "3 min" },
  { value: 5, label: "5 min" },
  { value: 10, label: "10 min" },
];

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
  summaryInterval,
  onStart,
  onPause,
  onResume,
  onStop,
  onIntervalChange,
  onMicChange,
  disabled,
}: RealtimeControlsProps) {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>("");

  const isIdle = connectionStatus === "disconnected" && !isSessionEnded;
  const isActive = connectionStatus === "connected" || connectionStatus === "reconnecting";
  const isConnecting = connectionStatus === "connecting";

  const loadDevices = useCallback(async () => {
    try {
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = allDevices.filter((d) => d.kind === "audioinput");
      setDevices(audioInputs);
      if (audioInputs.length > 0 && !selectedDevice) {
        setSelectedDevice(audioInputs[0].deviceId);
      }
    } catch {
      // Permission not granted yet
    }
  }, [selectedDevice]);

  useEffect(() => {
    loadDevices();
    navigator.mediaDevices.addEventListener("devicechange", loadDevices);
    return () => {
      navigator.mediaDevices.removeEventListener("devicechange", loadDevices);
    };
  }, [loadDevices]);

  const handleDeviceChange = (deviceId: string) => {
    setSelectedDevice(deviceId);
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
                New Session
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

      {/* Mic selector */}
      {(isIdle || isSessionEnded) && devices.length >= 2 && (
        <Select value={selectedDevice} onValueChange={handleDeviceChange}>
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

      {/* Summary interval selector */}
      <div className="ml-auto flex items-center gap-2">
        <span className="text-xs text-foreground-muted">Summary every</span>
        <Select
          value={String(summaryInterval)}
          onValueChange={(v) => onIntervalChange(Number(v) as SummaryInterval)}
          disabled={!isIdle && !isSessionEnded && !isActive}
        >
          <SelectTrigger className="h-8 w-[90px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {INTERVAL_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={String(opt.value)}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
