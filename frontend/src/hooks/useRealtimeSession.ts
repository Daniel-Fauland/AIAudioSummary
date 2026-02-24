"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { createIncrementalSummary } from "@/lib/api";
import type {
  RealtimeConnectionStatus,
  RealtimeWsMessage,
  SummaryInterval,
  IncrementalSummaryRequest,
  LLMProvider,
  AzureConfig,
  LangdockConfig,
} from "@/lib/types";

const WS_URL = process.env.NEXT_PUBLIC_BACKEND_WS_URL || "ws://localhost:8080";

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

  // --- Exposed state ---
  const [connectionStatus, setConnectionStatus] = useState<RealtimeConnectionStatus>("disconnected");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [accumulatedTranscript, setAccumulatedTranscript] = useState(initialTranscript ?? "");
  const [currentPartial, setCurrentPartial] = useState("");
  // Partial that was in-progress when a summary was triggered — displayed as white
  // (committed) text until AssemblyAI sends the real final turn for that sentence.
  const [committedPartial, setCommittedPartial] = useState("");
  const [realtimeSummary, setRealtimeSummary] = useState(initialSummary ?? "");
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
  const displayStreamRef = useRef<MediaStream | null>(null);
  const summaryTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const summaryCountRef = useRef(0);
  const lastSummaryTranscriptLenRef = useRef(0);
  const summaryIntervalRef = useRef<SummaryInterval>(2);
  const llmConfigRef = useRef<LlmConfig | null>(null);
  const accumulatedTranscriptRef = useRef("");
  const currentPartialRef = useRef("");
  const realtimeSummaryRef = useRef("");
  const isSummaryUpdatingRef = useRef(false);
  const isPausedRef = useRef(false);

  // Keep refs in sync with state
  useEffect(() => {
    accumulatedTranscriptRef.current = accumulatedTranscript;
  }, [accumulatedTranscript]);
  useEffect(() => {
    currentPartialRef.current = currentPartial;
  }, [currentPartial]);
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
    if (displayStreamRef.current) {
      displayStreamRef.current.getTracks().forEach((t) => t.stop());
      displayStreamRef.current = null;
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
    const accumulated = accumulatedTranscriptRef.current;
    // Include any in-progress partial so speech that hasn't paused yet is still summarised.
    // Trim the partial to avoid trailing whitespace causing a false "transcript grew" signal.
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

    // Visually commit the partial: move it from grey → white until the real final turn arrives.
    if (partial) {
      setCommittedPartial(partial);
      setCurrentPartial("");
      currentPartialRef.current = "";
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

    try {
      const response = await createIncrementalSummary(request);
      setRealtimeSummary(response.summary);
      setSummaryUpdatedAt(response.updated_at);
      lastSummaryTranscriptLenRef.current = effectiveTranscript.length;
      // Reset countdown after successful summary
      setSummaryCountdown(summaryIntervalRef.current * 60);
    } catch (error) {
      // Retry once after 5 seconds
      await new Promise((resolve) => setTimeout(resolve, 5000));
      try {
        const response = await createIncrementalSummary(request);
        setRealtimeSummary(response.summary);
        setSummaryUpdatedAt(response.updated_at);
        lastSummaryTranscriptLenRef.current = effectiveTranscript.length;
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
          // The real final turn has arrived — the committed partial is now part of accumulated,
          // so clear it to avoid showing duplicate white text.
          setCommittedPartial("");
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
  const startSession = useCallback(async (assemblyAiKey: string, deviceId?: string, recordMode: "mic" | "meeting" = "mic") => {
    setConnectionStatus("connecting");
    setIsSessionEnded(false);

    const newSessionId = crypto.randomUUID();
    setSessionId(newSessionId);

    try {
      // 1. Create AudioContext and AudioWorklet (common setup)
      const audioContext = new AudioContext({ sampleRate: 48000 });
      await audioContext.resume();
      audioContextRef.current = audioContext;

      await audioContext.audioWorklet.addModule("/pcm-worklet-processor.js");

      const workletNode = new AudioWorkletNode(audioContext, "pcm-worklet-processor");
      workletNodeRef.current = workletNode;
      workletNode.connect(audioContext.destination);

      if (recordMode === "meeting") {
        // 2a. Get system audio via screen share
        let displayStream: MediaStream;
        try {
          displayStream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: true,
          });
        } catch {
          // User cancelled the screen-share dialog — return silently
          setConnectionStatus("disconnected");
          cleanupAudio();
          return;
        }

        // Stop video tracks — only need audio
        displayStream.getVideoTracks().forEach((t) => t.stop());
        displayStreamRef.current = displayStream;

        if (displayStream.getAudioTracks().length === 0) {
          displayStream.getTracks().forEach((t) => t.stop());
          displayStreamRef.current = null;
          toast.error("No audio was shared. Make sure to check 'Share audio' in the share dialog.");
          setConnectionStatus("disconnected");
          cleanupAudio();
          return;
        }

        // 2b. Get mic stream separately
        let micStream: MediaStream;
        try {
          micStream = await navigator.mediaDevices.getUserMedia({
            audio: deviceId ? { deviceId: { exact: deviceId } } : true,
          });
        } catch {
          displayStream.getTracks().forEach((t) => t.stop());
          displayStreamRef.current = null;
          toast.error("Microphone permission denied. Please allow microphone access in your browser settings.");
          setConnectionStatus("disconnected");
          cleanupAudio();
          return;
        }
        streamRef.current = micStream;

        // 2c. Connect both sources to the worklet (Web Audio mixes them automatically)
        const micSource = audioContext.createMediaStreamSource(micStream);
        const sysSource = audioContext.createMediaStreamSource(displayStream);
        micSource.connect(workletNode);
        sysSource.connect(workletNode);
      } else {
        // 2a. Mic-only path
        // Disable browser audio processing (echo cancellation, noise suppression, AGC)
        // so audio is delivered cleanly to the AudioWorklet. These WebRTC processing
        // pipelines can suppress or interfere with audio flowing into AudioWorkletNode
        // in Chrome. For transcription, AssemblyAI handles noisy audio natively.
        const audioConstraints: MediaTrackConstraints = {
          ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        };
        const stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });
        streamRef.current = stream;

        const source = audioContext.createMediaStreamSource(stream);
        source.connect(workletNode);
      }

      // 3. Open WebSocket
      const ws = new WebSocket(`${WS_URL}/ws/realtime`);
      wsRef.current = ws;

      ws.onopen = () => {
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

      // 4. Send audio frames over WebSocket
      workletNode.port.onmessage = (e: MessageEvent<ArrayBuffer>) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(e.data);
        }
      };

      // 5. Start elapsed time counter
      setElapsedTime(0);
      setSummaryCountdown(summaryIntervalRef.current * 60);
      elapsedTimerRef.current = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
        if (!isPausedRef.current) {
          setSummaryCountdown((prev) => Math.max(0, prev - 1));
        }
      }, 1000);

      // 6. Start summary timer
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
    if (displayStreamRef.current) {
      displayStreamRef.current.getTracks().forEach((t) => { t.enabled = false; });
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
    if (displayStreamRef.current) {
      displayStreamRef.current.getTracks().forEach((t) => { t.enabled = true; });
    }
    isPausedRef.current = false;
    // Restart summary timer on resume
    startSummaryTimer(summaryIntervalRef.current);
    setIsPaused(false);
  }, [startSummaryTimer]);

  const stopSession = useCallback(async (triggerFinalSummary: boolean = true) => {
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

    // Trigger final full-transcript summary (if enabled)
    if (triggerFinalSummary) {
      await triggerSummary(true);
    }
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
    // Only restart interval timer if session is still active
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      startSummaryTimer(summaryIntervalRef.current);
    }
    await triggerSummary(true);
  }, [startSummaryTimer, triggerSummary]);

  const setLlmConfig = useCallback((config: LlmConfig) => {
    llmConfigRef.current = config;
  }, []);

  const clearTranscript = useCallback(() => {
    setAccumulatedTranscript("");
    setCurrentPartial("");
    setCommittedPartial("");
    accumulatedTranscriptRef.current = "";
    currentPartialRef.current = "";
    lastSummaryTranscriptLenRef.current = 0;
  }, []);

  const clearSummary = useCallback(() => {
    setRealtimeSummary("");
    setSummaryUpdatedAt(null);
    realtimeSummaryRef.current = "";
    summaryCountRef.current = 0;
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
    setCommittedPartial("");
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
    committedPartial,
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
    clearTranscript,
    clearSummary,
  };
}
