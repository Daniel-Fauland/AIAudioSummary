"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { marked } from "marked";
import { chatbotChat } from "@/lib/api";
import type { ChatMessageType, ChatRequest, LLMProvider, AzureConfig, LangdockConfig, FeatureModelOverride, ActionProposal, AppContext } from "@/lib/types";

const WS_URL = process.env.NEXT_PUBLIC_BACKEND_WS_URL || "ws://localhost:8080";

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
  partialTranscript: string;
  voiceText: string;
  clearVoiceText: () => void;
  toggleVoice: () => void;
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
  const [partialTranscript, setPartialTranscript] = useState("");
  const [voiceText, setVoiceText] = useState("");
  const voiceWsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

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

  // --- Voice input ---

  const stopVoiceInternal = useCallback(() => {
    // Send stop and close WebSocket
    if (voiceWsRef.current?.readyState === WebSocket.OPEN) {
      try {
        voiceWsRef.current.send(JSON.stringify({ type: "stop" }));
      } catch {
        // ignore
      }
      voiceWsRef.current.close();
    }
    voiceWsRef.current = null;

    // Stop audio
    audioContextRef.current?.close().catch(() => {});
    audioContextRef.current = null;
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

  // Use ref for stopVoiceInternal in voice callbacks to avoid stale closures
  const stopVoiceInternalRef = useRef(stopVoiceInternal);
  stopVoiceInternalRef.current = stopVoiceInternal;

  const startVoice = useCallback(async () => {
    const aaiKey = getAssemblyAiKey();
    if (!aaiKey || isVoiceActive) return;

    try {
      // Get microphone
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      // Set up AudioContext and Worklet
      const audioContext = new AudioContext({ sampleRate: 48000 });
      audioContextRef.current = audioContext;

      await audioContext.audioWorklet.addModule("/pcm-worklet-processor.js");
      const source = audioContext.createMediaStreamSource(stream);
      const workletNode = new AudioWorkletNode(audioContext, "pcm-worklet-processor");
      source.connect(workletNode);

      // Connect WebSocket — the chatbot router has prefix /chatbot
      const ws = new WebSocket(`${WS_URL}/chatbot/ws/voice`);
      voiceWsRef.current = ws;

      ws.onopen = () => {
        ws.send(JSON.stringify({ api_key: aaiKey, sample_rate: 16000 }));
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === "turn") {
          if (data.is_final) {
            // Final transcript — append to voiceText for the user to review/send
            const finalText = (data.transcript || "").trim();
            if (finalText) {
              setVoiceText(prev => (prev ? prev + " " + finalText : finalText));
              setPartialTranscript("");
            }
          } else {
            setPartialTranscript(data.transcript || "");
          }
        } else if (data.type === "error") {
          console.error("Voice error:", data.message);
          stopVoiceInternalRef.current();
        }
      };

      ws.onerror = () => {
        stopVoiceInternalRef.current();
      };

      ws.onclose = () => {
        // Only clean up if this is still the active WS
        if (voiceWsRef.current === ws) {
          setIsVoiceActive(false);
          setPartialTranscript("");
        }
      };

      // Send audio data from worklet to WebSocket
      workletNode.port.onmessage = (e: MessageEvent<ArrayBuffer>) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(e.data);
        }
      };

      setIsVoiceActive(true);
      setPartialTranscript("");
      setVoiceText("");
    } catch (e) {
      console.error("Failed to start voice:", e);
      // Clean up
      mediaStreamRef.current?.getTracks().forEach(t => t.stop());
      mediaStreamRef.current = null;
      audioContextRef.current?.close().catch(() => {});
      audioContextRef.current = null;
    }
  }, [isVoiceActive, getAssemblyAiKey]);

  const toggleVoice = useCallback(() => {
    if (isVoiceActive) {
      stopVoiceInternal();
    } else {
      startVoice();
    }
  }, [isVoiceActive, stopVoiceInternal, startVoice]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (voiceWsRef.current) {
        voiceWsRef.current.close();
        voiceWsRef.current = null;
      }
      audioContextRef.current?.close().catch(() => {});
      mediaStreamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  const clearVoiceText = useCallback(() => setVoiceText(""), []);

  return {
    messages, isStreaming, sendMessage, clearMessages, hasApiKey,
    confirmAction, cancelAction,
    isVoiceActive, partialTranscript, voiceText, clearVoiceText, toggleVoice,
  };
}
