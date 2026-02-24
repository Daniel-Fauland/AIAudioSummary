"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { marked } from "marked";
import { chatbotChat } from "@/lib/api";
import type { ChatMessageType, ChatRequest, LLMProvider, AzureConfig, LangdockConfig, FeatureModelOverride, ActionProposal, AppContext } from "@/lib/types";

const WS_URL = process.env.NEXT_PUBLIC_BACKEND_WS_URL || "ws://localhost:8080";
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

interface UseChatbotProps {
  chatbotQAEnabled: boolean;
  chatbotTranscriptEnabled: boolean;
  chatbotActionsEnabled: boolean;
  selectedProvider: LLMProvider;
  selectedModel: string;
  featureOverrides: Partial<Record<string, FeatureModelOverride>>;
  getKey: (provider: LLMProvider | "assemblyai") => string;
  azureConfig: AzureConfig | null;
  langdockConfig: LangdockConfig;
  transcript?: string | null;
  actionHandlers?: Record<string, (params: Record<string, unknown>) => Promise<void>>;
  hasAssemblyAiKey: boolean;
  getAssemblyAiKey: () => string | null;
  appContext?: AppContext;
  isChatOpen: boolean;
  chatbotEnabled: boolean;
}

interface UseChatbotReturn {
  messages: ChatMessageType[];
  isStreaming: boolean;
  sendMessage: (text: string) => Promise<void>;
  clearMessages: () => void;
  hasApiKey: boolean;
  confirmAction: (messageId: string) => Promise<void>;
  cancelAction: (messageId: string) => void;
  isVoiceActive: boolean;
  voiceConnecting: boolean;
  partialTranscript: string;
  voiceText: string;
  clearVoiceText: () => void;
  toggleVoice: () => void;
  audioDevices: MediaDeviceInfo[];
  selectedDeviceId: string;
  onDeviceChange: (deviceId: string) => void;
}

let messageIdCounter = 0;
function generateId(): string {
  return `msg-${Date.now()}-${++messageIdCounter}`;
}

function parseActionBlock(content: string): { cleanContent: string; action: ActionProposal | null } {
  const actionRegex = /```action\s*\n([\s\S]*?)\n```/;
  const match = content.match(actionRegex);
  if (!match) return { cleanContent: content, action: null };

  try {
    const action = JSON.parse(match[1]) as ActionProposal;
    const cleanContent = content.replace(actionRegex, "").trim();
    return { cleanContent, action };
  } catch {
    return { cleanContent: content, action: null };
  }
}

export function useChatbot({
  chatbotQAEnabled,
  chatbotTranscriptEnabled,
  chatbotActionsEnabled,
  selectedProvider,
  selectedModel,
  featureOverrides,
  getKey,
  azureConfig,
  langdockConfig,
  transcript,
  actionHandlers,
  hasAssemblyAiKey,
  getAssemblyAiKey,
  appContext,
  isChatOpen,
  chatbotEnabled,
}: UseChatbotProps): UseChatbotReturn {
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Streaming: accumulate text in refs and write directly to DOM (bypasses React)
  const chunkBufferRef = useRef("");
  const flushRafRef = useRef<number>(0);
  const streamedContentRef = useRef("");

  // Voice state
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [voiceConnecting, setVoiceConnecting] = useState(false);
  const [partialTranscript, setPartialTranscript] = useState("");
  const [voiceText, setVoiceText] = useState("");
  const voiceWsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const voiceSessionReadyRef = useRef(false);
  const hasBeenOpenedRef = useRef(false);
  const getAssemblyAiKeyRef = useRef(getAssemblyAiKey);
  getAssemblyAiKeyRef.current = getAssemblyAiKey;

  // Audio device selection (shared localStorage key with AudioRecorder & RealtimeControls)
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>(getSavedMicId);

  // Resolve chatbot-specific model override
  const override = featureOverrides["chatbot"];
  const provider = override?.provider ?? selectedProvider;
  const model = override?.model ?? selectedModel;
  const apiKey = getKey(provider as LLMProvider);
  const hasApiKey = apiKey.trim().length > 0;

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isStreaming || !hasApiKey) return;

    const userMsg: ChatMessageType = {
      id: generateId(),
      role: "user",
      content: text.trim(),
    };

    const assistantMsg: ChatMessageType = {
      id: generateId(),
      role: "assistant",
      content: "",
    };

    setMessages(prev => [...prev, userMsg, assistantMsg]);
    setIsStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    // Build messages for API (last 20)
    const allMessages = [...messages, userMsg];
    const apiMessages = allMessages.slice(-20).map(m => ({
      role: m.role,
      content: m.content,
    }));

    const request: ChatRequest = {
      messages: apiMessages,
      provider,
      model,
      api_key: apiKey,
      azure_config: provider === "azure_openai" ? azureConfig : null,
      langdock_config: provider === "langdock" ? langdockConfig : undefined,
      qa_enabled: chatbotQAEnabled,
      transcript_enabled: chatbotTranscriptEnabled,
      actions_enabled: chatbotActionsEnabled,
      transcript: chatbotTranscriptEnabled && transcript ? transcript : null,
      stream: true,
      app_context: appContext,
    };

    // Direct DOM flush: write buffered text to the streaming element and scroll,
    // bypassing React entirely during streaming for zero-flicker updates.
    const flushToDOM = () => {
      const buffered = chunkBufferRef.current;
      if (!buffered) return;
      chunkBufferRef.current = "";
      streamedContentRef.current += buffered;

      // Render markdown directly to the DOM element
      const target = document.querySelector("[data-streaming-target]");
      if (target) target.innerHTML = marked.parse(streamedContentRef.current, { async: false }) as string;

      // Scroll the container
      const container = document.querySelector("[data-chat-scroll]");
      if (container) {
        const dist = container.scrollHeight - container.scrollTop - container.clientHeight;
        if (dist < 60) container.scrollTop = container.scrollHeight;
      }
    };

    try {
      streamedContentRef.current = "";
      await chatbotChat(
        request,
        (chunk) => {
          chunkBufferRef.current += chunk;
          if (!flushRafRef.current) {
            flushRafRef.current = requestAnimationFrame(() => {
              flushRafRef.current = 0;
              flushToDOM();
            });
          }
        },
        controller.signal,
      );

      // Flush any remaining buffered content to DOM
      cancelAnimationFrame(flushRafRef.current);
      flushRafRef.current = 0;
      streamedContentRef.current += chunkBufferRef.current;
      chunkBufferRef.current = "";

      // Now commit the final content to React state (single re-render)
      const finalContent = streamedContentRef.current;
      streamedContentRef.current = "";
      setMessages(prev => {
        const updated = [...prev];
        const lastIdx = updated.length - 1;
        updated[lastIdx] = { ...updated[lastIdx], content: finalContent };
        return updated;
      });

      // After streaming completes, parse action blocks
      setMessages(prev => {
        const updated = [...prev];
        const lastIdx = updated.length - 1;
        const lastMsg = updated[lastIdx];
        if (lastMsg.role === "assistant" && !lastMsg.isError) {
          const { cleanContent, action } = parseActionBlock(lastMsg.content);
          if (action) {
            // Validate action_id exists in handlers
            const isValid = actionHandlers && action.action_id in actionHandlers;
            updated[lastIdx] = {
              ...lastMsg,
              content: cleanContent,
              action: isValid ? action : undefined,
              actionStatus: isValid ? "pending" : undefined,
            };
          }
        }
        return updated;
      });
    } catch (e) {
      // Clean up any pending buffer/refs
      cancelAnimationFrame(flushRafRef.current);
      flushRafRef.current = 0;
      const partialContent = streamedContentRef.current + chunkBufferRef.current;
      chunkBufferRef.current = "";
      streamedContentRef.current = "";

      if (e instanceof DOMException && e.name === "AbortError") {
        // User cancelled — commit any partial content
        if (partialContent) {
          setMessages(prev => {
            const updated = [...prev];
            const lastIdx = updated.length - 1;
            updated[lastIdx] = { ...updated[lastIdx], content: partialContent };
            return updated;
          });
        }
      } else {
        const errorMessage = e instanceof Error ? e.message : "Something went wrong";
        setMessages(prev => {
          const updated = [...prev];
          const lastIdx = updated.length - 1;
          if (!partialContent) {
            // No streamed content yet — replace empty assistant message with error
            updated[lastIdx] = {
              ...updated[lastIdx],
              content: errorMessage,
              isError: true,
            };
          } else {
            // Had partial content — commit it and add error as new message
            updated[lastIdx] = { ...updated[lastIdx], content: partialContent };
            updated.push({
              id: generateId(),
              role: "assistant",
              content: errorMessage,
              isError: true,
            });
          }
          return updated;
        });
      }
    } finally {
      abortRef.current = null;
      setIsStreaming(false);
    }
  }, [isStreaming, hasApiKey, apiKey, messages, provider, model, azureConfig, langdockConfig, chatbotQAEnabled, chatbotTranscriptEnabled, chatbotActionsEnabled, transcript, actionHandlers, appContext]);

  const clearMessages = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    setIsStreaming(false);
  }, []);

  const confirmAction = useCallback(async (messageId: string) => {
    const msg = messages.find(m => m.id === messageId);
    if (!msg?.action || !actionHandlers) return;

    try {
      await actionHandlers[msg.action.action_id]?.(msg.action.params);
      setMessages(prev =>
        prev.map(m => m.id === messageId ? { ...m, actionStatus: "confirmed" as const } : m)
      );
    } catch {
      setMessages(prev =>
        prev.map(m => m.id === messageId ? { ...m, actionStatus: "error" as const } : m)
      );
    }
  }, [messages, actionHandlers]);

  const cancelAction = useCallback((messageId: string) => {
    setMessages(prev =>
      prev.map(m => m.id === messageId ? { ...m, actionStatus: "cancelled" as const } : m)
    );
  }, []);

  // --- Voice input (persistent session) ---
  // The WebSocket + AudioWorklet are established once when the chatbot first
  // opens and stay alive until the feature is disabled.  Only getUserMedia +
  // audio-node wiring happen on each mic-press, making it near-instant.

  const teardownVoiceSession = useCallback(() => {
    voiceSessionReadyRef.current = false;

    if (voiceWsRef.current) {
      voiceWsRef.current.close();
      voiceWsRef.current = null;
    }

    // Closing AudioContext also disconnects all connected nodes
    audioContextRef.current?.close().catch(() => {});
    audioContextRef.current = null;

    mediaStreamRef.current?.getTracks().forEach(t => t.stop());
    mediaStreamRef.current = null;
    sourceNodeRef.current = null;
    workletNodeRef.current = null;

    setIsVoiceActive(false);
    setPartialTranscript("");
    setVoiceConnecting(false);
  }, []);

  const teardownVoiceSessionRef = useRef(teardownVoiceSession);
  teardownVoiceSessionRef.current = teardownVoiceSession;

  const stopVoiceInternal = useCallback(() => {
    // Tell backend to end the AAI session (connection stays open)
    if (voiceWsRef.current?.readyState === WebSocket.OPEN) {
      try {
        voiceWsRef.current.send(JSON.stringify({ type: "stop" }));
      } catch {
        // ignore
      }
    }

    // Disconnect audio pipeline but keep AudioContext alive
    sourceNodeRef.current?.disconnect();
    sourceNodeRef.current = null;
    workletNodeRef.current?.disconnect();
    workletNodeRef.current = null;

    // Release microphone
    mediaStreamRef.current?.getTracks().forEach(t => t.stop());
    mediaStreamRef.current = null;

    setIsVoiceActive(false);
    // Append any remaining partial to voiceText
    setPartialTranscript(prev => {
      if (prev.trim()) {
        setVoiceText(vt => (vt ? vt + " " + prev.trim() : prev.trim()));
      }
      return "";
    });
  }, []);

  const stopVoiceInternalRef = useRef(stopVoiceInternal);
  stopVoiceInternalRef.current = stopVoiceInternal;

  const initVoiceSession = useCallback(async () => {
    const aaiKey = getAssemblyAiKeyRef.current();
    if (!aaiKey || voiceSessionReadyRef.current || voiceWsRef.current) return;

    setVoiceConnecting(true);

    try {
      // 1. Pre-load AudioWorklet (fast on subsequent calls – module is cached)
      if (!audioContextRef.current) {
        const ctx = new AudioContext({ sampleRate: 48000 });
        audioContextRef.current = ctx;
        await ctx.audioWorklet.addModule("/pcm-worklet-processor.js");
      }

      // 2. Establish persistent WebSocket to backend
      const ws = new WebSocket(`${WS_URL}/chatbot/ws/voice`);
      voiceWsRef.current = ws;

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("Connection timeout")), 10000);

        ws.onopen = () => {
          ws.send(JSON.stringify({ api_key: aaiKey, sample_rate: 16000 }));
        };

        ws.onmessage = (event) => {
          const data = JSON.parse(event.data);
          if (data.type === "ready") {
            clearTimeout(timeout);
            resolve();
          } else if (data.type === "error") {
            clearTimeout(timeout);
            reject(new Error(data.message));
          }
        };

        ws.onerror = () => {
          clearTimeout(timeout);
          reject(new Error("WebSocket error"));
        };
      });

      // Session established — set up persistent handlers
      voiceSessionReadyRef.current = true;

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === "turn") {
          if (data.is_final) {
            const finalText = (data.transcript || "").trim();
            if (finalText) {
              setVoiceText(prev => (prev ? prev + " " + finalText : finalText));
              setPartialTranscript("");
            }
          } else {
            setPartialTranscript(data.transcript || "");
          }
        } else if (data.type === "session_ended" || data.type === "error") {
          if (data.type === "error") console.error("Voice error:", data.message);
          stopVoiceInternalRef.current();
        }
        // "recording" is informational — mic is already shown as active
      };

      ws.onclose = () => {
        voiceSessionReadyRef.current = false;
        voiceWsRef.current = null;
        setIsVoiceActive(false);
        setVoiceConnecting(false);
      };

      ws.onerror = () => {
        teardownVoiceSessionRef.current();
      };

      setVoiceConnecting(false);
    } catch (e) {
      console.error("Failed to init voice session:", e);
      if (voiceWsRef.current) {
        voiceWsRef.current.close();
        voiceWsRef.current = null;
      }
      voiceSessionReadyRef.current = false;
      setVoiceConnecting(false);
    }
  }, []);

  const startVoice = useCallback(async () => {
    if (!voiceSessionReadyRef.current || isVoiceActive) return;

    try {
      // Tell backend to connect to AAI (runs in parallel with getUserMedia)
      voiceWsRef.current?.send(JSON.stringify({ type: "start" }));

      // Get microphone access (use selected device if set)
      const audioConstraints: boolean | MediaTrackConstraints = selectedDeviceId && selectedDeviceId !== "default"
        ? { deviceId: { exact: selectedDeviceId } }
        : true;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });
      mediaStreamRef.current = stream;

      // Resume AudioContext if suspended by browser autoplay policy
      const ctx = audioContextRef.current!;
      if (ctx.state === "suspended") {
        await ctx.resume();
      }

      // Wire audio pipeline: mic → worklet → WebSocket
      const source = ctx.createMediaStreamSource(stream);
      const workletNode = new AudioWorkletNode(ctx, "pcm-worklet-processor");
      sourceNodeRef.current = source;
      workletNodeRef.current = workletNode;
      source.connect(workletNode);

      workletNode.port.onmessage = (e: MessageEvent<ArrayBuffer>) => {
        if (voiceWsRef.current?.readyState === WebSocket.OPEN) {
          voiceWsRef.current.send(e.data);
        }
      };

      setIsVoiceActive(true);
      setPartialTranscript("");
      setVoiceText("");
    } catch (e) {
      console.error("Failed to start voice:", e);
      mediaStreamRef.current?.getTracks().forEach(t => t.stop());
      mediaStreamRef.current = null;
      sourceNodeRef.current?.disconnect();
      sourceNodeRef.current = null;
      workletNodeRef.current?.disconnect();
      workletNodeRef.current = null;
      // Tell backend to cancel the session we just started
      if (voiceWsRef.current?.readyState === WebSocket.OPEN) {
        try { voiceWsRef.current.send(JSON.stringify({ type: "stop" })); } catch { /* ignore */ }
      }
    }
  }, [isVoiceActive, selectedDeviceId]);

  const toggleVoice = useCallback(() => {
    if (isVoiceActive) {
      stopVoiceInternal();
    } else {
      startVoice();
    }
  }, [isVoiceActive, stopVoiceInternal, startVoice]);

  // Track first open & manage voice session lifecycle
  useEffect(() => {
    if (isChatOpen) {
      hasBeenOpenedRef.current = true;
    }
  }, [isChatOpen]);

  useEffect(() => {
    if (hasBeenOpenedRef.current && chatbotEnabled && hasAssemblyAiKey) {
      initVoiceSession();
    } else if (!chatbotEnabled || !hasAssemblyAiKey) {
      teardownVoiceSession();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isChatOpen, chatbotEnabled, hasAssemblyAiKey]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      teardownVoiceSessionRef.current();
    };
  }, []);

  // Enumerate audio devices when chatbot first opens
  useEffect(() => {
    if (!hasBeenOpenedRef.current || !chatbotEnabled) return;

    const enumerate = async () => {
      try {
        const all = await navigator.mediaDevices.enumerateDevices();
        const inputs = all.filter((d) => d.kind === "audioinput");
        setAudioDevices(inputs);
        setSelectedDeviceId((prev) => resolveDeviceId(inputs, prev));
      } catch {
        // enumerateDevices not supported
      }
    };

    enumerate();

    // Re-enumerate when devices change (plug/unplug)
    const handler = () => {
      navigator.mediaDevices.enumerateDevices().then((all) => {
        const inputs = all.filter((d) => d.kind === "audioinput");
        setAudioDevices(inputs);
        setSelectedDeviceId((prev) => resolveDeviceId(inputs, prev));
      }).catch(() => {});
    };

    navigator.mediaDevices.addEventListener("devicechange", handler);
    return () => navigator.mediaDevices.removeEventListener("devicechange", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isChatOpen, chatbotEnabled]);

  const onDeviceChange = useCallback((deviceId: string) => {
    setSelectedDeviceId(deviceId);
    saveMicId(deviceId);
  }, []);

  const clearVoiceText = useCallback(() => setVoiceText(""), []);

  return {
    messages, isStreaming, sendMessage, clearMessages, hasApiKey,
    confirmAction, cancelAction,
    isVoiceActive, voiceConnecting, partialTranscript, voiceText, clearVoiceText, toggleVoice,
    audioDevices, selectedDeviceId, onDeviceChange,
  };
}
