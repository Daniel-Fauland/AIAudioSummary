"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { createIncrementalSummary } from "@/lib/api";
import type {
  RealtimeConnectionStatus,
  RealtimeWsMessage,
  SummaryInterval,
  IncrementalSummaryRequest,
  LLMProvider,
  AzureConfig,
} from "@/lib/types";

const WS_URL = process.env.NEXT_PUBLIC_BACKEND_WS_URL || "ws://localhost:8080";

export interface LlmConfig {
  provider: LLMProvider;
  apiKey: string;
  model: string;
  azureConfig?: AzureConfig;
  systemPrompt: string;
  targetLanguage: string;
  informalGerman: boolean;
  date?: string;
  author?: string;
}

export function useRealtimeSession() {
  // --- Exposed state ---
  const [connectionStatus, setConnectionStatus] = useState<RealtimeConnectionStatus>("disconnected");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [accumulatedTranscript, setAccumulatedTranscript] = useState("");
  const [currentPartial, setCurrentPartial] = useState("");
  const [realtimeSummary, setRealtimeSummary] = useState("");
  const [summaryUpdatedAt, setSummaryUpdatedAt] = useState<string | null>(null);
  const [isSummaryUpdating, setIsSummaryUpdating] = useState(false);
  const [summaryInterval, setSummaryIntervalState] = useState<SummaryInterval>(2);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isSessionEnded, setIsSessionEnded] = useState(false);
  const [summaryCountdown, setSummaryCountdown] = useState(0);

  // --- Internal refs ---
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const summaryTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const summaryCountRef = useRef(0);
  const lastSummaryTranscriptLenRef = useRef(0);
  const summaryIntervalRef = useRef<SummaryInterval>(2);
  const llmConfigRef = useRef<LlmConfig | null>(null);
  const accumulatedTranscriptRef = useRef("");
  const realtimeSummaryRef = useRef("");
  const isSummaryUpdatingRef = useRef(false);
  const isPausedRef = useRef(false);

  // Keep refs in sync with state
  useEffect(() => {
    accumulatedTranscriptRef.current = accumulatedTranscript;
  }, [accumulatedTranscript]);
  useEffect(() => {
    realtimeSummaryRef.current = realtimeSummary;
  }, [realtimeSummary]);
  useEffect(() => {
    isSummaryUpdatingRef.current = isSummaryUpdating;
  }, [isSummaryUpdating]);

  // --- Cleanup helpers ---
  const cleanupAudio = useCallback(() => {
    if (workletNodeRef.current) {
      workletNodeRef.current.disconnect();
      workletNodeRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const clearTimers = useCallback(() => {
    if (summaryTimerRef.current) {
      clearInterval(summaryTimerRef.current);
      summaryTimerRef.current = null;
    }
    if (elapsedTimerRef.current) {
      clearInterval(elapsedTimerRef.current);
      elapsedTimerRef.current = null;
    }
  }, []);

  // --- Summary logic ---
  const triggerSummary = useCallback(async (forceFullRecompute: boolean = false) => {
    const config = llmConfigRef.current;
    const transcript = accumulatedTranscriptRef.current;

    if (!config || !transcript.trim()) return;
    if (isSummaryUpdatingRef.current) return;
    if (!forceFullRecompute && transcript.length === lastSummaryTranscriptLenRef.current) return;

    setIsSummaryUpdating(true);
    summaryCountRef.current += 1;

    const isFullRecompute = forceFullRecompute || summaryCountRef.current % 10 === 0 || !realtimeSummaryRef.current;
    const newChunk = transcript.slice(lastSummaryTranscriptLenRef.current);

    const request: IncrementalSummaryRequest = {
      provider: config.provider,
      api_key: config.apiKey,
      model: config.model,
      azure_config: config.azureConfig,
      system_prompt: config.systemPrompt,
      full_transcript: transcript,
      previous_summary: realtimeSummaryRef.current || undefined,
      new_transcript_chunk: newChunk || undefined,
      is_full_recompute: isFullRecompute,
      target_language: config.targetLanguage,
      informal_german: config.informalGerman,
      date: config.date,
      author: config.author,
    };

    try {
      const response = await createIncrementalSummary(request);
      setRealtimeSummary(response.summary);
      setSummaryUpdatedAt(response.updated_at);
      lastSummaryTranscriptLenRef.current = transcript.length;
      // Reset countdown after successful summary
      setSummaryCountdown(summaryIntervalRef.current * 60);
    } catch (error) {
      // Retry once after 5 seconds
      await new Promise((resolve) => setTimeout(resolve, 5000));
      try {
        const response = await createIncrementalSummary(request);
        setRealtimeSummary(response.summary);
        setSummaryUpdatedAt(response.updated_at);
        lastSummaryTranscriptLenRef.current = transcript.length;
        setSummaryCountdown(summaryIntervalRef.current * 60);
      } catch {
        // Skip until next interval
      }
    } finally {
      setIsSummaryUpdating(false);
    }
  }, []);

  // --- Summary timer management ---
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

  // --- WebSocket message handler ---
  const handleWsMessage = useCallback((event: MessageEvent) => {
    const msg: RealtimeWsMessage = JSON.parse(event.data);

    switch (msg.type) {
      case "session_started":
        setConnectionStatus("connected");
        break;

      case "turn":
        if (msg.is_final) {
          setAccumulatedTranscript((prev) => prev + msg.transcript + "\n");
          setCurrentPartial("");
        } else {
          setCurrentPartial(msg.transcript);
        }
        break;

      case "error":
        setConnectionStatus("error");
        break;

      case "reconnecting":
        setConnectionStatus("reconnecting");
        break;

      case "session_ended":
        setConnectionStatus("disconnected");
        break;
    }
  }, []);

  // --- Exposed functions ---
  const startSession = useCallback(async (assemblyAiKey: string, deviceId?: string) => {
    setConnectionStatus("connecting");
    setIsSessionEnded(false);

    const newSessionId = crypto.randomUUID();
    setSessionId(newSessionId);

    try {
      // 1. Get microphone stream
      const constraints: MediaStreamConstraints = {
        audio: deviceId
          ? { deviceId: { exact: deviceId } }
          : true,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      // 2. Create AudioContext and ensure it's running
      const audioContext = new AudioContext({ sampleRate: 48000 });
      await audioContext.resume();
      audioContextRef.current = audioContext;

      // 3. Load AudioWorklet
      await audioContext.audioWorklet.addModule("/pcm-worklet-processor.js");

      // 4. Create worklet node and connect
      const workletNode = new AudioWorkletNode(audioContext, "pcm-worklet-processor");
      workletNodeRef.current = workletNode;

      const source = audioContext.createMediaStreamSource(stream);
      source.connect(workletNode);
      workletNode.connect(audioContext.destination);

      // 6. Open WebSocket
      const ws = new WebSocket(`${WS_URL}/ws/realtime`);
      wsRef.current = ws;

      ws.onopen = () => {
        // 7. Send init message
        ws.send(JSON.stringify({
          api_key: assemblyAiKey,
          session_id: newSessionId,
          sample_rate: 16000,
        }));
      };

      ws.onmessage = handleWsMessage;

      ws.onerror = () => {
        setConnectionStatus("error");
      };

      ws.onclose = () => {
        if (wsRef.current === ws) {
          setConnectionStatus("disconnected");
        }
      };

      // 5. On worklet message: send binary frame over WebSocket
      workletNode.port.onmessage = (e: MessageEvent<ArrayBuffer>) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(e.data);
        }
      };

      // 9. Start elapsed time counter
      setElapsedTime(0);
      setSummaryCountdown(summaryIntervalRef.current * 60);
      elapsedTimerRef.current = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
        if (!isPausedRef.current) {
          setSummaryCountdown((prev) => Math.max(0, prev - 1));
        }
      }, 1000);

      // 10. Start summary timer
      summaryIntervalRef.current = summaryInterval;
      startSummaryTimer(summaryInterval);

    } catch (error) {
      setConnectionStatus("error");
      cleanupAudio();
      throw error;
    }
  }, [handleWsMessage, startSummaryTimer, summaryInterval, cleanupAudio]);

  const pauseSession = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => { t.enabled = false; });
    }
    isPausedRef.current = true;
    // Stop summary timer while paused
    if (summaryTimerRef.current) {
      clearInterval(summaryTimerRef.current);
      summaryTimerRef.current = null;
    }
    setIsPaused(true);
  }, []);

  const resumeSession = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => { t.enabled = true; });
    }
    isPausedRef.current = false;
    // Restart summary timer on resume
    startSummaryTimer(summaryIntervalRef.current);
    setIsPaused(false);
  }, [startSummaryTimer]);

  const stopSession = useCallback(async () => {
    // Send stop message to WS
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify({ type: "stop" }));
      } catch {
        // ignore
      }
    }

    // Close WebSocket
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    // Clear timers
    clearTimers();

    // Cleanup audio resources
    cleanupAudio();

    setIsPaused(false);
    setConnectionStatus("disconnected");
    setIsSessionEnded(true);

    // Trigger final full-transcript summary
    await triggerSummary(true);
  }, [clearTimers, cleanupAudio, triggerSummary]);

  const setSummaryInterval = useCallback((interval: SummaryInterval) => {
    summaryIntervalRef.current = interval;
    setSummaryIntervalState(interval);
    setSummaryCountdown(interval * 60);
    // Restart timer if session is active and not paused
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      startSummaryTimer(interval);
    }
  }, [startSummaryTimer]);

  const triggerManualSummary = useCallback(async () => {
    // Restart the interval timer so next auto-fire is N minutes from now
    startSummaryTimer(summaryIntervalRef.current);
    await triggerSummary(true);
  }, [startSummaryTimer, triggerSummary]);

  const setLlmConfig = useCallback((config: LlmConfig) => {
    llmConfigRef.current = config;
  }, []);

  const resetSession = useCallback(() => {
    // Close WS if still open
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    clearTimers();
    cleanupAudio();

    setConnectionStatus("disconnected");
    setSessionId(null);
    setAccumulatedTranscript("");
    setCurrentPartial("");
    setRealtimeSummary("");
    setSummaryUpdatedAt(null);
    setIsSummaryUpdating(false);
    setIsPaused(false);
    setElapsedTime(0);
    setIsSessionEnded(false);
    setSummaryCountdown(0);
    summaryCountRef.current = 0;
    lastSummaryTranscriptLenRef.current = 0;
  }, [clearTimers, cleanupAudio]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      cleanupAudio();
      clearTimers();
    };
  }, [cleanupAudio, clearTimers]);

  return {
    // State
    connectionStatus,
    sessionId,
    accumulatedTranscript,
    currentPartial,
    realtimeSummary,
    summaryUpdatedAt,
    isSummaryUpdating,
    summaryInterval,
    isPaused,
    elapsedTime,
    isSessionEnded,
    summaryCountdown,
    // Functions
    startSession,
    pauseSession,
    resumeSession,
    stopSession,
    setSummaryInterval,
    setLlmConfig,
    resetSession,
    triggerManualSummary,
  };
}
