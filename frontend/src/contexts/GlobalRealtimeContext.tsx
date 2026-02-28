"use client";

import {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import type { RealtimeConnectionStatus, RealtimeWsMessage } from "@/lib/types";

const WS_URL = process.env.NEXT_PUBLIC_BACKEND_WS_URL || "ws://localhost:8080";

export interface GlobalRealtimeContextValue {
  // State
  connectionStatus: RealtimeConnectionStatus;
  sessionId: string | null;
  accumulatedTranscript: string;
  currentPartial: string;
  committedPartial: string;
  isPaused: boolean;
  elapsedTime: number;
  isSessionEnded: boolean;

  // Functions
  connect: (assemblyAiKey: string, deviceId?: string, recordMode?: "mic" | "meeting", sharedDisplayStream?: MediaStream) => Promise<void>;
  disconnect: (triggerCallback?: boolean) => Promise<void>;
  pause: () => void;
  resume: () => void;
  clearTranscript: () => void;
  resetSession: () => void;
  setCommittedPartial: (value: string) => void;
  setCurrentPartial: (value: string) => void;
  setAccumulatedTranscript: React.Dispatch<React.SetStateAction<string>>;

  // Internal refs exposed for summary hook
  _accumulatedTranscriptRef: React.RefObject<string>;
  _currentPartialRef: React.RefObject<string>;
  _wsRef: React.RefObject<WebSocket | null>;
  _displayStreamRef: React.RefObject<MediaStream | null>;

  // Callback for session end (used by summary hook)
  onSessionEnd: React.RefObject<(() => void) | null>;
}

const GlobalRealtimeContext = createContext<GlobalRealtimeContextValue | null>(null);

export function useGlobalRealtime() {
  const ctx = useContext(GlobalRealtimeContext);
  if (!ctx) throw new Error("useGlobalRealtime must be used within GlobalRealtimeProvider");
  return ctx;
}

export function GlobalRealtimeProvider({ children }: { children: ReactNode }) {
  const [connectionStatus, setConnectionStatus] = useState<RealtimeConnectionStatus>("disconnected");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [accumulatedTranscript, setAccumulatedTranscript] = useState("");
  const [currentPartial, setCurrentPartial] = useState("");
  const [committedPartial, setCommittedPartial] = useState("");
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isSessionEnded, setIsSessionEnded] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const displayStreamRef = useRef<MediaStream | null>(null);
  const elapsedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const accumulatedTranscriptRef = useRef("");
  const currentPartialRef = useRef("");
  const isPausedRef = useRef(false);
  const lastFinalRef = useRef("");
  const onSessionEndRef = useRef<(() => void) | null>(null);

  // Keep refs in sync with state
  useEffect(() => {
    accumulatedTranscriptRef.current = accumulatedTranscript;
  }, [accumulatedTranscript]);
  useEffect(() => {
    currentPartialRef.current = currentPartial;
  }, [currentPartial]);

  // Cleanup helpers
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

  const clearTimer = useCallback(() => {
    if (elapsedTimerRef.current) {
      clearInterval(elapsedTimerRef.current);
      elapsedTimerRef.current = null;
    }
  }, []);

  // WebSocket message handler
  const handleWsMessage = useCallback((event: MessageEvent) => {
    const msg: RealtimeWsMessage = JSON.parse(event.data);

    switch (msg.type) {
      case "session_started":
        break;

      case "session_ready":
        setConnectionStatus("connected");
        break;

      case "turn":
        if (msg.is_final) {
          setAccumulatedTranscript((prev) => {
            const lastFinal = lastFinalRef.current;
            if (lastFinal && msg.transcript.startsWith(lastFinal)) {
              // Progressive update: replace last final with the longer version
              const base = prev.slice(0, prev.length - lastFinal.length);
              lastFinalRef.current = msg.transcript;
              return base + msg.transcript;
            }
            // New turn
            lastFinalRef.current = msg.transcript;
            return prev ? prev + " " + msg.transcript : msg.transcript;
          });
          setCurrentPartial("");
          setCommittedPartial("");
        } else {
          lastFinalRef.current = "";  // New turn started — reset dedup
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

  const connect = useCallback(async (assemblyAiKey: string, deviceId?: string, recordMode: "mic" | "meeting" = "mic", sharedDisplayStream?: MediaStream) => {
    setConnectionStatus("connecting");
    setIsSessionEnded(false);

    const newSessionId = crypto.randomUUID();
    setSessionId(newSessionId);

    try {
      // 1. Create AudioContext and AudioWorklet
      const audioContext = new AudioContext({ sampleRate: 48000 });
      await audioContext.resume();
      audioContextRef.current = audioContext;

      await audioContext.audioWorklet.addModule("/pcm-worklet-processor.js");

      const workletNode = new AudioWorkletNode(audioContext, "pcm-worklet-processor");
      workletNodeRef.current = workletNode;
      workletNode.connect(audioContext.destination);

      if (recordMode === "meeting") {
        let displayStream: MediaStream;
        if (sharedDisplayStream && sharedDisplayStream.getAudioTracks().length > 0) {
          // Clone tracks from the shared stream — no second Chrome prompt
          displayStream = new MediaStream(
            sharedDisplayStream.getAudioTracks().map(t => t.clone())
          );
        } else {
          try {
            displayStream = await navigator.mediaDevices.getDisplayMedia({
              video: true,
              audio: true,
            });
          } catch {
            setConnectionStatus("disconnected");
            cleanupAudio();
            return;
          }
          displayStream.getVideoTracks().forEach((t) => t.stop());
        }
        displayStreamRef.current = displayStream;

        if (displayStream.getAudioTracks().length === 0) {
          displayStream.getTracks().forEach((t) => t.stop());
          displayStreamRef.current = null;
          toast.error("No audio was shared. Make sure to check 'Share audio' in the share dialog.");
          setConnectionStatus("disconnected");
          cleanupAudio();
          return;
        }

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

        const micSource = audioContext.createMediaStreamSource(micStream);
        const sysSource = audioContext.createMediaStreamSource(displayStream);
        micSource.connect(workletNode);
        sysSource.connect(workletNode);
      } else {
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
      elapsedTimerRef.current = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);

    } catch (error) {
      setConnectionStatus("error");
      cleanupAudio();
      throw error;
    }
  }, [handleWsMessage, cleanupAudio]);

  const pause = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => { t.enabled = false; });
    }
    if (displayStreamRef.current) {
      displayStreamRef.current.getTracks().forEach((t) => { t.enabled = false; });
    }
    isPausedRef.current = true;
    setIsPaused(true);
  }, []);

  const resume = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => { t.enabled = true; });
    }
    if (displayStreamRef.current) {
      displayStreamRef.current.getTracks().forEach((t) => { t.enabled = true; });
    }
    isPausedRef.current = false;
    setIsPaused(false);
  }, []);

  const disconnect = useCallback(async (triggerCallback: boolean = true) => {
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

    // Clear timer
    clearTimer();

    // Cleanup audio resources
    cleanupAudio();

    setIsPaused(false);
    setConnectionStatus("disconnected");
    setIsSessionEnded(true);

    if (triggerCallback && onSessionEndRef.current) {
      onSessionEndRef.current();
    }
  }, [clearTimer, cleanupAudio]);

  const clearTranscript = useCallback(() => {
    setAccumulatedTranscript("");
    setCurrentPartial("");
    setCommittedPartial("");
    accumulatedTranscriptRef.current = "";
    currentPartialRef.current = "";
    lastFinalRef.current = "";
  }, []);

  const resetSession = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    clearTimer();
    cleanupAudio();

    setConnectionStatus("disconnected");
    setSessionId(null);
    setAccumulatedTranscript("");
    setCurrentPartial("");
    setCommittedPartial("");
    setIsPaused(false);
    setElapsedTime(0);
    setIsSessionEnded(false);
    accumulatedTranscriptRef.current = "";
    currentPartialRef.current = "";
    lastFinalRef.current = "";
  }, [clearTimer, cleanupAudio]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      cleanupAudio();
      clearTimer();
    };
  }, [cleanupAudio, clearTimer]);

  const value: GlobalRealtimeContextValue = {
    connectionStatus,
    sessionId,
    accumulatedTranscript,
    currentPartial,
    committedPartial,
    isPaused,
    elapsedTime,
    isSessionEnded,
    connect,
    disconnect,
    pause,
    resume,
    clearTranscript,
    resetSession,
    setCommittedPartial,
    setCurrentPartial,
    setAccumulatedTranscript,
    _accumulatedTranscriptRef: accumulatedTranscriptRef,
    _currentPartialRef: currentPartialRef,
    _wsRef: wsRef,
    _displayStreamRef: displayStreamRef,
    onSessionEnd: onSessionEndRef,
  };

  return (
    <GlobalRealtimeContext.Provider value={value}>
      {children}
    </GlobalRealtimeContext.Provider>
  );
}
