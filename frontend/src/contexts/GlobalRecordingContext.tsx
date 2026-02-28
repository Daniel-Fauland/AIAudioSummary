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
  if (typeof window === "undefined") return "";
  const types = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4;codecs=aac",
    "audio/mp4",
  ];
  return types.find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
}

export type RecorderState = "idle" | "recording" | "paused" | "done";

export interface GlobalRecordingContextValue {
  // State
  recorderState: RecorderState;
  elapsedSeconds: number;
  recordedBlob: Blob | null;
  audioUrl: string | null;
  micDevices: MediaDeviceInfo[];
  selectedDeviceId: string;
  recordMode: "mic" | "meeting";
  supportsSystemAudio: boolean;
  analyserNode: AnalyserNode | null;

  // Functions
  startRecording: (sharedDisplayStream?: MediaStream) => Promise<void>;
  stopRecording: () => void;
  pauseRecording: () => void;
  resumeRecording: () => void;
  resetRecording: () => void;
  setSelectedDeviceId: (deviceId: string) => void;
  setRecordMode: (mode: "mic" | "meeting") => void;
  refreshDevices: () => Promise<void>;

  // Exposed refs for sync feature
  _mediaStreamRef: React.RefObject<MediaStream | null>;
  _audioContextRef: React.RefObject<AudioContext | null>;
  _displayStreamRef: React.RefObject<MediaStream | null>;
}

const GlobalRecordingContext = createContext<GlobalRecordingContextValue | null>(null);

export function useGlobalRecording() {
  const ctx = useContext(GlobalRecordingContext);
  if (!ctx) throw new Error("useGlobalRecording must be used within GlobalRecordingProvider");
  return ctx;
}

export function GlobalRecordingProvider({ children }: { children: ReactNode }) {
  const [recorderState, setRecorderState] = useState<RecorderState>("idle");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [micDevices, setMicDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceIdState] = useState<string>(getSavedMicId);
  const [recordMode, setRecordMode] = useState<"mic" | "meeting">("mic");
  const [supportsSystemAudio, setSupportsSystemAudio] = useState(false);
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const displayStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const mimeTypeRef = useRef<string>("");
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef = useRef(0);
  const audioUrlRef = useRef<string | null>(null);
  const initGuardRef = useRef(false);

  // Enumerate audio input devices
  const refreshDevices = useCallback(async () => {
    try {
      const all = await navigator.mediaDevices.enumerateDevices();
      const inputs = all.filter((d) => d.kind === "audioinput");
      setMicDevices(inputs);
      setSelectedDeviceIdState((prev) => resolveDeviceId(inputs, prev));
    } catch {
      // enumerateDevices not supported
    }
  }, []);

  // Enumerate on mount and listen for device changes
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (initGuardRef.current) return;
    initGuardRef.current = true;

    refreshDevices();
    const mmd = navigator.mediaDevices;
    if (mmd?.addEventListener) {
      mmd.addEventListener("devicechange", refreshDevices);
      return () => mmd.removeEventListener("devicechange", refreshDevices);
    }
  }, [refreshDevices]);

  // Detect Chromium-based browser with getDisplayMedia support (SSR-safe)
  useEffect(() => {
    if (typeof window === "undefined") return;
    setSupportsSystemAudio(
      "chrome" in window &&
        typeof navigator.mediaDevices?.getDisplayMedia === "function",
    );
  }, []);

  // On mount: unlock device labels if needed.
  // On iOS, skip the early getUserMedia() to avoid repeated permission prompts
  // (iOS Safari has no "Always Allow" option). Labels will refresh once the user
  // actually starts recording, since startRecording calls refreshDevices().
  useEffect(() => {
    if (typeof window === "undefined") return;
    const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    navigator.mediaDevices
      .enumerateDevices()
      .then((devices) => {
        const hasLabels = devices
          .filter((d) => d.kind === "audioinput")
          .some((d) => d.label !== "");
        if (hasLabels) {
          refreshDevices();
        } else if (isIOS) {
          // On iOS, just enumerate with fallback labels — don't prompt for permission
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
      if (timerRef.current !== null) {
        clearInterval(timerRef.current);
      }
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep in sync when the other mic selector (RealtimeControls) changes the device
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = (e: CustomEvent<{ deviceId: string }>) => {
      setSelectedDeviceIdState(e.detail.deviceId);
    };
    window.addEventListener("aias:mic-change", handler as EventListener);
    return () => window.removeEventListener("aias:mic-change", handler as EventListener);
  }, []);

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
      setAnalyserNode(null);
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

  const setSelectedDeviceId = useCallback((deviceId: string) => {
    setSelectedDeviceIdState(deviceId);
    saveMicId(deviceId);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("aias:mic-change", { detail: { deviceId } }));
    }
  }, []);

  const startRecording = useCallback(async (sharedDisplayStream?: MediaStream) => {
    const audioConstraints: MediaTrackConstraints = selectedDeviceId
      ? { deviceId: { exact: selectedDeviceId } }
      : (true as unknown as MediaTrackConstraints);

    try {
      let recordStream: MediaStream;

      if (recordMode === "meeting") {
        // Prompt user to pick a tab/window (must share audio)
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
            return;
          }
          displayStream.getVideoTracks().forEach((t) => t.stop());
        }
        displayStreamRef.current = displayStream;

        if (displayStream.getAudioTracks().length === 0) {
          displayStream.getTracks().forEach((t) => t.stop());
          displayStreamRef.current = null;
          const { toast } = await import("sonner");
          toast.error(
            "No audio was shared. Make sure to check 'Share audio' in the share dialog.",
          );
          return;
        }

        let micStream: MediaStream;
        try {
          micStream = await navigator.mediaDevices.getUserMedia({
            audio: audioConstraints,
          });
        } catch {
          displayStream.getTracks().forEach((t) => t.stop());
          displayStreamRef.current = null;
          const { toast } = await import("sonner");
          toast.error(
            "Microphone permission denied. Please allow microphone access in your browser settings.",
          );
          return;
        }
        streamRef.current = micStream;
        refreshDevices();

        const audioContext = new AudioContext();
        await audioContext.resume();
        audioContextRef.current = audioContext;
        const destination = audioContext.createMediaStreamDestination();
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        analyserRef.current = analyser;
        setAnalyserNode(analyser);

        const micSource = audioContext.createMediaStreamSource(micStream);
        const sysSource = audioContext.createMediaStreamSource(displayStream);

        micSource.connect(analyser);
        micSource.connect(destination);
        sysSource.connect(analyser);
        sysSource.connect(destination);

        recordStream = destination.stream;
      } else {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: audioConstraints,
        });
        streamRef.current = stream;
        refreshDevices();

        const audioContext = new AudioContext();
        await audioContext.resume();
        audioContextRef.current = audioContext;
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        analyserRef.current = analyser;
        setAnalyserNode(analyser);

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
      };

      recorder.start();
      setRecorderState("recording");
      elapsedRef.current = 0;
      setElapsedSeconds(0);
      startTimer();
    } catch {
      const { toast } = await import("sonner");
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
    }
  }, []);

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "paused") {
      mediaRecorderRef.current.resume();
      setRecorderState("recording");
      startTimer();
    }
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

  const resetRecording = useCallback(() => {
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

  const value: GlobalRecordingContextValue = {
    recorderState,
    elapsedSeconds,
    recordedBlob,
    audioUrl,
    micDevices,
    selectedDeviceId,
    recordMode,
    supportsSystemAudio,
    analyserNode,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    resetRecording,
    setSelectedDeviceId,
    setRecordMode,
    refreshDevices,
    _mediaStreamRef: streamRef,
    _audioContextRef: audioContextRef,
    _displayStreamRef: displayStreamRef,
  };

  return (
    <GlobalRecordingContext.Provider value={value}>
      {children}
    </GlobalRecordingContext.Provider>
  );
}
