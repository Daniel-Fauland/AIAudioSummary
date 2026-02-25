"use client";

import { useEffect } from "react";
import { GlobalRecordingProvider, useGlobalRecording } from "@/contexts/GlobalRecordingContext";
import { GlobalRealtimeProvider, useGlobalRealtime } from "@/contexts/GlobalRealtimeContext";
import { GlobalSyncProvider } from "@/contexts/GlobalSyncContext";
import { RecordingIndicator } from "./RecordingIndicator";

function BeforeUnloadGuard() {
  const recording = useGlobalRecording();
  const realtime = useGlobalRealtime();

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      const isRecording = recording.recorderState === "recording" || recording.recorderState === "paused";
      const isRealtimeActive = realtime.connectionStatus === "connected" || realtime.connectionStatus === "reconnecting";

      if (isRecording || isRealtimeActive) {
        e.preventDefault();
      }
    };

    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [recording.recorderState, realtime.connectionStatus]);

  return null;
}

export function GlobalProviders({ children }: { children: React.ReactNode }) {
  return (
    <GlobalRecordingProvider>
      <GlobalRealtimeProvider>
        <GlobalSyncProvider>
          <BeforeUnloadGuard />
          <RecordingIndicator />
          {children}
        </GlobalSyncProvider>
      </GlobalRealtimeProvider>
    </GlobalRecordingProvider>
  );
}
