"use client";

import { useCallback, useEffect, useRef } from "react";
import { useGlobalRealtime } from "@/contexts/GlobalRealtimeContext";
import { useRealtimeSummary } from "./useRealtimeSummary";
import type {
  LLMProvider,
  AzureConfig,
  LangdockConfig,
  SummaryInterval,
} from "@/lib/types";

export interface LlmConfig {
  provider: LLMProvider;
  apiKey: string;
  model: string;
  azureConfig?: AzureConfig;
  langdockConfig?: LangdockConfig;
  systemPrompt: string;
  targetLanguage: string;
  informalGerman: boolean;
  date?: string;
  author?: string;
}

export interface UseRealtimeSessionOptions {
  initialTranscript?: string;
  initialSummary?: string;
}

export function useRealtimeSession(options?: UseRealtimeSessionOptions) {
  const { initialTranscript, initialSummary } = options ?? {};
  const globalRealtime = useGlobalRealtime();

  // Initialize transcript from persisted session (only once)
  const initDoneRef = useRef(false);
  useEffect(() => {
    if (initDoneRef.current) return;
    initDoneRef.current = true;
    if (initialTranscript && !globalRealtime.accumulatedTranscript) {
      globalRealtime.setAccumulatedTranscript(initialTranscript);
    }
  }, [initialTranscript, globalRealtime]);

  // Handle partial commit from summary hook
  // Use individual setters (stable React state setters) to avoid recreating
  // the entire callback chain on every context re-render
  const { setCommittedPartial, setCurrentPartial } = globalRealtime;
  const onCommitPartial = useCallback((partial: string) => {
    setCommittedPartial(partial);
    setCurrentPartial("");
  }, [setCommittedPartial, setCurrentPartial]);

  const summary = useRealtimeSummary({
    transcript: globalRealtime.accumulatedTranscript,
    currentPartial: globalRealtime.currentPartial,
    connectionStatus: globalRealtime.connectionStatus,
    isPaused: globalRealtime.isPaused,
    initialSummary,
    accumulatedTranscriptRef: globalRealtime._accumulatedTranscriptRef,
    currentPartialRef: globalRealtime._currentPartialRef,
    onCommitPartial,
  });

  // Register the session-end callback to trigger final summary
  useEffect(() => {
    globalRealtime.onSessionEnd.current = () => {
      // Will be called by disconnect() — trigger final summary
      summary.triggerSummary(true);
    };
    return () => {
      globalRealtime.onSessionEnd.current = null;
    };
  }, [globalRealtime, summary.triggerSummary]);

  // Start summary timer when connection becomes active
  const prevConnectionRef = useRef(globalRealtime.connectionStatus);
  useEffect(() => {
    const prev = prevConnectionRef.current;
    const curr = globalRealtime.connectionStatus;
    prevConnectionRef.current = curr;

    if (prev !== "connected" && curr === "connected") {
      summary.startSummaryTimer(summary.summaryIntervalRef.current);
    }
  }, [globalRealtime.connectionStatus, summary]);

  // Wrapped start/stop to include summary logic
  const startSession = useCallback(async (assemblyAiKey: string, deviceId?: string, recordMode: "mic" | "meeting" = "mic") => {
    await globalRealtime.connect(assemblyAiKey, deviceId, recordMode);
  }, [globalRealtime]);

  const stopSession = useCallback(async (triggerFinalSummary: boolean = true) => {
    if (triggerFinalSummary) {
      // Disconnect will call the onSessionEnd callback which triggers summary
      await globalRealtime.disconnect(true);
    } else {
      await globalRealtime.disconnect(false);
    }
  }, [globalRealtime]);

  const pauseSession = useCallback(() => {
    globalRealtime.pause();
  }, [globalRealtime]);

  const resumeSession = useCallback(() => {
    globalRealtime.resume();
    summary.startSummaryTimer(summary.summaryIntervalRef.current);
  }, [globalRealtime, summary]);

  const resetSession = useCallback(() => {
    globalRealtime.resetSession();
    summary.resetSummary();
  }, [globalRealtime, summary]);

  const clearTranscript = useCallback(() => {
    globalRealtime.clearTranscript();
  }, [globalRealtime]);

  return {
    // State from global context
    connectionStatus: globalRealtime.connectionStatus,
    sessionId: globalRealtime.sessionId,
    accumulatedTranscript: globalRealtime.accumulatedTranscript,
    currentPartial: globalRealtime.currentPartial,
    committedPartial: globalRealtime.committedPartial,
    isPaused: globalRealtime.isPaused,
    elapsedTime: globalRealtime.elapsedTime,
    isSessionEnded: globalRealtime.isSessionEnded,

    // State from summary hook
    realtimeSummary: summary.realtimeSummary,
    summaryUpdatedAt: summary.summaryUpdatedAt,
    isSummaryUpdating: summary.isSummaryUpdating,
    summaryInterval: summary.summaryInterval,
    summaryCountdown: summary.summaryCountdown,

    // Functions
    startSession,
    pauseSession,
    resumeSession,
    stopSession,
    setSummaryInterval: summary.setSummaryInterval,
    setLlmConfig: summary.setLlmConfig,
    resetSession,
    triggerManualSummary: summary.triggerManualSummary,
    clearTranscript,
    clearSummary: summary.clearSummary,
  };
}
