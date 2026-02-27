"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
  type ReactNode,
} from "react";
import { useGlobalRecording, type RecorderState } from "./GlobalRecordingContext";
import { useGlobalRealtime } from "./GlobalRealtimeContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { RealtimeConnectionStatus } from "@/lib/types";

const SYNC_STORAGE_KEY = "aias:v1:sync_standard_realtime";

function getSavedSync(): boolean {
  try {
    return localStorage.getItem(SYNC_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export interface GlobalSyncContextValue {
  syncEnabled: boolean;
  setSyncEnabled: (enabled: boolean) => void;
  /** Register the AssemblyAI key so sync can auto-start realtime mode. */
  setAssemblyAiKey: (key: string) => void;
}

const GlobalSyncContext = createContext<GlobalSyncContextValue | null>(null);

export function useGlobalSync() {
  const ctx = useContext(GlobalSyncContext);
  if (!ctx) throw new Error("useGlobalSync must be used within GlobalSyncProvider");
  return ctx;
}

export function GlobalSyncProvider({ children }: { children: ReactNode }) {
  const recording = useGlobalRecording();
  const realtime = useGlobalRealtime();

  const [syncEnabled, setSyncEnabledState] = useState(getSavedSync);
  const [stopConfirmOpen, setStopConfirmOpen] = useState(false);
  const [stoppingSource, setStoppingSource] = useState<"standard" | "realtime" | null>(null);

  // Dialog A: Standard starts, but realtime has prior ended session
  const [dialogAOpen, setDialogAOpen] = useState(false);
  // Dialog B: Realtime connects, but standard has completed recording
  const [dialogBOpen, setDialogBOpen] = useState(false);

  // Track the assemblyAi key for synced starts
  const assemblyAiKeyRef = useRef<string>("");

  // Track previous states for transition detection
  const prevRecorderStateRef = useRef<RecorderState>(recording.recorderState);
  const prevConnectionStatusRef = useRef<RealtimeConnectionStatus>(realtime.connectionStatus);
  const prevIsSessionEndedRef = useRef(realtime.isSessionEnded);

  // Guard against re-entrant sync triggers
  const syncingRef = useRef(false);

  const setSyncEnabled = useCallback((enabled: boolean) => {
    setSyncEnabledState(enabled);
    try {
      localStorage.setItem(SYNC_STORAGE_KEY, enabled ? "true" : "false");
    } catch {}
  }, []);

  const setAssemblyAiKey = useCallback((key: string) => {
    assemblyAiKeyRef.current = key;
  }, []);

  // ── Reactive sync: auto-start realtime when standard recording starts ──
  useEffect(() => {
    const prev = prevRecorderStateRef.current;
    const curr = recording.recorderState;
    prevRecorderStateRef.current = curr;

    if (!syncEnabled || syncingRef.current) return;

    // Standard recording just started → auto-start realtime
    if (prev === "idle" && curr === "recording") {
      const key = assemblyAiKeyRef.current;
      if (key && realtime.connectionStatus === "disconnected") {
        if (realtime.isSessionEnded) {
          // Realtime has prior session data → show Dialog A for user choice
          setDialogAOpen(true);
        } else {
          syncingRef.current = true;
          // Pass the display stream from standard recording to avoid second Chrome prompt
          const sharedDisplay = recording.recordMode === "meeting"
            ? recording._displayStreamRef.current ?? undefined
            : undefined;
          realtime
            .connect(key, recording.selectedDeviceId, recording.recordMode, sharedDisplay)
            .finally(() => { syncingRef.current = false; });
        }
      }
    }

    // Standard recording paused → also pause realtime
    if (prev === "recording" && curr === "paused") {
      if (realtime.connectionStatus === "connected" && !realtime.isPaused) {
        realtime.pause();
      }
    }

    // Standard recording resumed → also resume realtime
    if (prev === "paused" && curr === "recording") {
      if (realtime.isPaused) {
        realtime.resume();
      }
    }

    // Standard recording stopped (went to "done") → show confirmation if realtime is active
    if ((prev === "recording" || prev === "paused") && curr === "done") {
      const isRealtimeActive = realtime.connectionStatus === "connected" || realtime.connectionStatus === "reconnecting";
      if (isRealtimeActive) {
        setStoppingSource("standard");
        setStopConfirmOpen(true);
      }
    }
  }, [syncEnabled, recording.recorderState, recording.selectedDeviceId, recording.recordMode, realtime]);

  // ── Reactive sync: auto-start standard when realtime connects ──
  useEffect(() => {
    const prev = prevConnectionStatusRef.current;
    const curr = realtime.connectionStatus;
    prevConnectionStatusRef.current = curr;

    if (!syncEnabled || syncingRef.current) return;

    // Realtime just connected → auto-start standard recording
    if (prev !== "connected" && curr === "connected") {
      if (recording.recorderState === "idle") {
        syncingRef.current = true;
        // Pass the display stream from realtime to avoid second Chrome prompt
        const sharedDisplay = recording.recordMode === "meeting"
          ? realtime._displayStreamRef.current ?? undefined
          : undefined;
        recording
          .startRecording(sharedDisplay)
          .finally(() => { syncingRef.current = false; });
      } else if (recording.recorderState === "done") {
        // Standard has completed recording → show Dialog B for user choice
        setDialogBOpen(true);
      }
    }
  }, [syncEnabled, realtime.connectionStatus, recording]);

  // ── Reactive sync: detect realtime session ended → show confirmation if standard is active ──
  useEffect(() => {
    const prev = prevIsSessionEndedRef.current;
    const curr = realtime.isSessionEnded;
    prevIsSessionEndedRef.current = curr;

    if (!syncEnabled) return;

    // Realtime session just ended
    if (!prev && curr) {
      const isRecording = recording.recorderState === "recording" || recording.recorderState === "paused";
      if (isRecording) {
        setStoppingSource("realtime");
        setStopConfirmOpen(true);
      }
    }
  }, [syncEnabled, realtime.isSessionEnded, recording.recorderState]);

  // ── Stop confirmation handlers ──
  const handleStopSourceOnly = useCallback(() => {
    setStopConfirmOpen(false);
    setStoppingSource(null);
    // The source mode was already stopped by the user — do nothing extra
  }, []);

  const handleStopBoth = useCallback(() => {
    if (stoppingSource === "standard") {
      // Standard was already stopped, also stop realtime
      realtime.disconnect(true);
    } else if (stoppingSource === "realtime") {
      // Realtime was already stopped, also stop standard
      recording.stopRecording();
    }
    setStopConfirmOpen(false);
    setStoppingSource(null);
  }, [stoppingSource, recording, realtime]);

  const handleCancel = useCallback(() => {
    setStopConfirmOpen(false);
    setStoppingSource(null);
  }, []);

  const otherLabel = stoppingSource === "standard" ? "realtime session" : "standard recording";

  // ── Helper to connect realtime from sync ──
  const connectRealtimeSync = useCallback(() => {
    const key = assemblyAiKeyRef.current;
    if (!key) return;
    syncingRef.current = true;
    const sharedDisplay = recording.recordMode === "meeting"
      ? recording._displayStreamRef.current ?? undefined
      : undefined;
    realtime
      .connect(key, recording.selectedDeviceId, recording.recordMode, sharedDisplay)
      .finally(() => { syncingRef.current = false; });
  }, [recording, realtime]);

  // ── Dialog A handlers (Existing Session Data — realtime has prior session) ──
  const handleDialogAContinue = useCallback(() => {
    setDialogAOpen(false);
    // connect() already resets isSessionEnded, existing transcript is kept
    connectRealtimeSync();
  }, [connectRealtimeSync]);

  const handleDialogAClearTranscriptSummary = useCallback(() => {
    setDialogAOpen(false);
    realtime.clearTranscript();
    window.dispatchEvent(new CustomEvent("aias:sync-clear-realtime", {
      detail: { scope: "transcript-summary" },
    }));
    connectRealtimeSync();
  }, [realtime, connectRealtimeSync]);

  const handleDialogAClearAll = useCallback(() => {
    setDialogAOpen(false);
    realtime.clearTranscript();
    window.dispatchEvent(new CustomEvent("aias:sync-clear-realtime", {
      detail: { scope: "all" },
    }));
    connectRealtimeSync();
  }, [realtime, connectRealtimeSync]);

  const handleDialogARecordOnly = useCallback(() => {
    setDialogAOpen(false);
    // Standard continues recording alone, no realtime sync
  }, []);

  // ── Dialog B handlers (Existing Recording — standard has completed recording) ──
  const handleDialogBClearRecording = useCallback(() => {
    setDialogBOpen(false);
    recording.resetRecording();
    window.dispatchEvent(new CustomEvent("aias:sync-clear-standard"));
    syncingRef.current = true;
    const sharedDisplay = recording.recordMode === "meeting"
      ? realtime._displayStreamRef.current ?? undefined
      : undefined;
    // Small delay to let resetRecording() state settle before starting new recording
    setTimeout(() => {
      recording
        .startRecording(sharedDisplay)
        .finally(() => { syncingRef.current = false; });
    }, 50);
  }, [recording, realtime]);

  const handleDialogBLiveOnly = useCallback(() => {
    setDialogBOpen(false);
    // Realtime continues alone, standard keeps existing recording
  }, []);

  const handleDialogBCancel = useCallback(() => {
    setDialogBOpen(false);
    // Cancel: disconnect the just-connected realtime session
    realtime.disconnect(false);
  }, [realtime]);

  const value: GlobalSyncContextValue = {
    syncEnabled,
    setSyncEnabled,
    setAssemblyAiKey,
  };

  return (
    <GlobalSyncContext.Provider value={value}>
      {children}

      {/* Stop confirmation dialog */}
      <Dialog open={stopConfirmOpen} onOpenChange={(open) => { if (!open) handleCancel(); }}>
        <DialogContent className="max-w-sm bg-card">
          <DialogHeader>
            <DialogTitle>Stop Both Modes?</DialogTitle>
            <DialogDescription>
              You stopped the {stoppingSource === "standard" ? "standard recording" : "realtime session"}.
              The {otherLabel} is still active.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col gap-2 sm:flex-row">
            <Button variant="ghost" onClick={handleCancel}>
              Cancel
            </Button>
            <Button variant="secondary" onClick={handleStopSourceOnly}>
              Stop {stoppingSource === "standard" ? "Recording" : "Session"} Only
            </Button>
            <Button variant="destructive" onClick={handleStopBoth}>
              Stop Both
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog A: Existing Session Data (Standard starts, Realtime has prior session) */}
      <Dialog open={dialogAOpen} onOpenChange={(open) => { if (!open) handleDialogARecordOnly(); }}>
        <DialogContent className="max-w-md bg-card">
          <DialogHeader>
            <DialogTitle>Existing Session Data</DialogTitle>
            <DialogDescription>
              Your realtime session has existing transcript or summary content.
              How would you like to proceed?
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2 pt-2">
            <Button variant="secondary" onClick={handleDialogAContinue}>
              Continue with Existing
            </Button>
            <Button variant="secondary" onClick={handleDialogAClearTranscriptSummary}>
              Clear Transcript &amp; Summary
            </Button>
            <Button variant="destructive" onClick={handleDialogAClearAll}>
              Clear All
            </Button>
            <Button variant="ghost" onClick={handleDialogARecordOnly}>
              Record Only
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog B: Existing Recording (Realtime connects, Standard has completed recording) */}
      <Dialog open={dialogBOpen} onOpenChange={(open) => { if (!open) handleDialogBLiveOnly(); }}>
        <DialogContent className="max-w-md bg-card">
          <DialogHeader>
            <DialogTitle>Existing Recording</DialogTitle>
            <DialogDescription>
              Due to Sync being enabled, the standard recording will start as well.
              You already have an existing recording.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col gap-2 sm:flex-row">
            <Button variant="secondary" onClick={handleDialogBClearRecording}>
              Clear Recording
            </Button>
            <Button variant="ghost" onClick={handleDialogBLiveOnly}>
              Only Start Live Session
            </Button>
            <Button variant="destructive" onClick={handleDialogBCancel}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </GlobalSyncContext.Provider>
  );
}
