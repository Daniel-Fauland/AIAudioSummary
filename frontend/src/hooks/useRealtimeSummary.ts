"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { createIncrementalSummary } from "@/lib/api";
import type {
  SummaryInterval,
  IncrementalSummaryRequest,
  RealtimeConnectionStatus,
  TokenUsage,
} from "@/lib/types";
import type { LlmConfig } from "./useRealtimeSession";

export interface UseRealtimeSummaryOptions {
  transcript: string;
  currentPartial: string;
  connectionStatus: RealtimeConnectionStatus;
  isPaused: boolean;
  initialSummary?: string;
  // Refs from global context for accessing latest values in async callbacks
  accumulatedTranscriptRef: React.RefObject<string>;
  currentPartialRef: React.RefObject<string>;
  // Callback to commit partial text visually
  onCommitPartial: (partial: string) => void;
  // Callback when token usage is received
  onUsage?: (usage: TokenUsage) => void;
}

export function useRealtimeSummary(options: UseRealtimeSummaryOptions) {
  const {
    connectionStatus,
    isPaused,
    initialSummary,
    accumulatedTranscriptRef,
    currentPartialRef,
    onCommitPartial,
    onUsage,
  } = options;

  const [realtimeSummary, setRealtimeSummary] = useState(initialSummary ?? "");
  const [summaryUpdatedAt, setSummaryUpdatedAt] = useState<string | null>(null);
  const [isSummaryUpdating, setIsSummaryUpdating] = useState(false);
  const [summaryInterval, setSummaryIntervalState] = useState<SummaryInterval>(2);
  const [summaryCountdown, setSummaryCountdown] = useState(0);
  const [accumulatedUsage, setAccumulatedUsage] = useState<TokenUsage | null>(null);
  const [lastRequestUsage, setLastRequestUsage] = useState<TokenUsage | null>(null);

  const onUsageRef = useRef(onUsage);
  onUsageRef.current = onUsage;
  const summaryTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const summaryCountRef = useRef(0);
  const lastSummaryTranscriptLenRef = useRef(0);
  const summaryIntervalRef = useRef<SummaryInterval>(2);
  const llmConfigRef = useRef<LlmConfig | null>(null);
  const realtimeSummaryRef = useRef("");
  const isSummaryUpdatingRef = useRef(false);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Keep refs in sync
  useEffect(() => {
    realtimeSummaryRef.current = realtimeSummary;
  }, [realtimeSummary]);
  useEffect(() => {
    isSummaryUpdatingRef.current = isSummaryUpdating;
  }, [isSummaryUpdating]);

  // Summary logic
  const triggerSummary = useCallback(async (forceFullRecompute: boolean = false) => {
    const config = llmConfigRef.current;
    const accumulated = accumulatedTranscriptRef.current;
    const partial = currentPartialRef.current.trim();
    const effectiveTranscript = partial ? accumulated + partial : accumulated;

    if (!config || !effectiveTranscript.trim()) {
      if (!forceFullRecompute) setSummaryCountdown(summaryIntervalRef.current * 60);
      return;
    }
    if (isSummaryUpdatingRef.current) return;
    if (!forceFullRecompute && effectiveTranscript.length === lastSummaryTranscriptLenRef.current) {
      setSummaryCountdown(summaryIntervalRef.current * 60);
      return;
    }

    // Visually commit the partial
    if (partial) {
      onCommitPartial(partial);
    }

    setIsSummaryUpdating(true);
    summaryCountRef.current += 1;

    const isFullRecompute = forceFullRecompute || summaryCountRef.current % 10 === 0 || !realtimeSummaryRef.current;
    const newChunk = effectiveTranscript.slice(lastSummaryTranscriptLenRef.current);

    const request: IncrementalSummaryRequest = {
      provider: config.provider,
      api_key: config.apiKey,
      model: config.model,
      azure_config: config.azureConfig,
      langdock_config: config.langdockConfig,
      system_prompt: config.systemPrompt,
      full_transcript: effectiveTranscript,
      previous_summary: realtimeSummaryRef.current || undefined,
      new_transcript_chunk: newChunk || undefined,
      is_full_recompute: isFullRecompute,
      target_language: config.targetLanguage,
      informal_german: config.informalGerman,
      date: config.date,
      author: config.author,
    };

    const accumulateUsage = (u: TokenUsage | undefined) => {
      if (!u) return;
      setLastRequestUsage({ ...u });
      setAccumulatedUsage(prev => prev
        ? { input_tokens: prev.input_tokens + u.input_tokens, output_tokens: prev.output_tokens + u.output_tokens, total_tokens: prev.total_tokens + u.total_tokens }
        : { ...u },
      );
      onUsageRef.current?.(u);
    };

    try {
      const response = await createIncrementalSummary(request);
      setRealtimeSummary(response.summary);
      setSummaryUpdatedAt(response.updated_at);
      accumulateUsage(response.usage);
      lastSummaryTranscriptLenRef.current = effectiveTranscript.length;
      setSummaryCountdown(summaryIntervalRef.current * 60);
    } catch {
      // Retry once after 5 seconds
      await new Promise((resolve) => setTimeout(resolve, 5000));
      try {
        const response = await createIncrementalSummary(request);
        setRealtimeSummary(response.summary);
        setSummaryUpdatedAt(response.updated_at);
        accumulateUsage(response.usage);
        lastSummaryTranscriptLenRef.current = effectiveTranscript.length;
        setSummaryCountdown(summaryIntervalRef.current * 60);
      } catch {
        // Skip until next interval
      }
    } finally {
      setIsSummaryUpdating(false);
    }
  }, [accumulatedTranscriptRef, currentPartialRef, onCommitPartial]);

  // Summary timer management
  const startSummaryTimer = useCallback((intervalMinutes: SummaryInterval) => {
    if (summaryTimerRef.current) {
      clearInterval(summaryTimerRef.current);
    }
    setSummaryCountdown(intervalMinutes * 60);
    summaryTimerRef.current = setInterval(
      () => { triggerSummary(false); },
      intervalMinutes * 60 * 1000,
    );
  }, [triggerSummary]);

  // Countdown timer — runs when connected and not paused
  useEffect(() => {
    const isActive = connectionStatus === "connected" || connectionStatus === "reconnecting";
    if (isActive && !isPaused) {
      countdownTimerRef.current = setInterval(() => {
        setSummaryCountdown((prev) => Math.max(0, prev - 1));
      }, 1000);
    } else {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
    }
    return () => {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
    };
  }, [connectionStatus, isPaused]);

  // Clear summary timer when session is no longer active (disconnected or paused)
  useEffect(() => {
    const isActive = connectionStatus === "connected" || connectionStatus === "reconnecting";
    if (!isActive || isPaused) {
      if (summaryTimerRef.current) {
        clearInterval(summaryTimerRef.current);
        summaryTimerRef.current = null;
      }
    }
  }, [connectionStatus, isPaused]);

  const setSummaryInterval = useCallback((interval: SummaryInterval) => {
    summaryIntervalRef.current = interval;
    setSummaryIntervalState(interval);
    setSummaryCountdown(interval * 60);
    // Restart timer if session is active and not paused
    const ws = typeof window !== "undefined" ? document.querySelector("[data-ws-active]") : null;
    if (ws) {
      startSummaryTimer(interval);
    }
  }, [startSummaryTimer]);

  const triggerManualSummary = useCallback(async () => {
    startSummaryTimer(summaryIntervalRef.current);
    await triggerSummary(true);
  }, [startSummaryTimer, triggerSummary]);

  const setLlmConfig = useCallback((config: LlmConfig) => {
    llmConfigRef.current = config;
  }, []);

  const clearSummary = useCallback(() => {
    setRealtimeSummary("");
    setSummaryUpdatedAt(null);
    realtimeSummaryRef.current = "";
    summaryCountRef.current = 0;
  }, []);

  const resetSummary = useCallback(() => {
    if (summaryTimerRef.current) {
      clearInterval(summaryTimerRef.current);
      summaryTimerRef.current = null;
    }
    setRealtimeSummary("");
    setSummaryUpdatedAt(null);
    setIsSummaryUpdating(false);
    setSummaryCountdown(0);
    setAccumulatedUsage(null);
    setLastRequestUsage(null);
    realtimeSummaryRef.current = "";
    summaryCountRef.current = 0;
    lastSummaryTranscriptLenRef.current = 0;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (summaryTimerRef.current) {
        clearInterval(summaryTimerRef.current);
      }
    };
  }, []);

  return {
    realtimeSummary,
    summaryUpdatedAt,
    isSummaryUpdating,
    summaryInterval,
    summaryCountdown,
    accumulatedUsage,
    lastRequestUsage,
    setSummaryInterval,
    setLlmConfig,
    triggerManualSummary,
    triggerSummary,
    clearSummary,
    resetSummary,
    startSummaryTimer,
    summaryIntervalRef,
  };
}
