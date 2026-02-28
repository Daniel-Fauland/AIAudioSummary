"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { getMe, getPreferences, putPreferences } from "@/lib/api";
import type { UserPreferences, LiveQuestion } from "@/lib/types";

const ALL_PROVIDERS = ["openai", "anthropic", "gemini", "azure_openai", "langdock"];

function safeLocalGet(key: string): string {
  try {
    if (typeof window === "undefined") return "";
    return localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}

function safeLocalSet(key: string, value: string): void {
  try {
    if (typeof window !== "undefined") localStorage.setItem(key, value);
  } catch {}
}

function safeLocalRemove(key: string): void {
  try {
    if (typeof window !== "undefined") localStorage.removeItem(key);
  } catch {}
}

function collectSessionData(mode: "standard" | "realtime"): UserPreferences["session_standard"] | UserPreferences["session_realtime"] | undefined {
  const prefix = `aias:v1:session:${mode}`;
  const transcript = safeLocalGet(`${prefix}:transcript`);
  const summary = safeLocalGet(`${prefix}:summary`);
  const formTemplateId = safeLocalGet(`${prefix}:form_template_id`);
  const updatedAtRaw = safeLocalGet(`${prefix}:updated_at`);
  const updatedAt = updatedAtRaw ? Number(updatedAtRaw) : null;

  let formValues: Record<string, unknown> | undefined;
  try {
    const raw = safeLocalGet(`${prefix}:form_values`);
    if (raw) formValues = JSON.parse(raw);
  } catch {}

  // No session data stored at all
  if (!transcript && !summary && !formTemplateId && !formValues && !updatedAt) {
    if (mode === "realtime") {
      // Also check questions for realtime
      const questionsRaw = safeLocalGet(`${prefix}:questions`);
      if (!questionsRaw) return undefined;
    } else {
      const outputMode = safeLocalGet(`${prefix}:output_mode`);
      if (!outputMode) return undefined;
    }
  }

  if (mode === "realtime") {
    let questions: LiveQuestion[] | undefined;
    try {
      const raw = safeLocalGet(`${prefix}:questions`);
      if (raw) questions = JSON.parse(raw);
    } catch {}
    return {
      transcript: transcript || undefined,
      summary: summary || undefined,
      form_template_id: formTemplateId || null,
      form_values: formValues,
      questions,
      updated_at: updatedAt,
    };
  }

  const currentStepRaw = safeLocalGet(`${prefix}:current_step`);
  const currentStep = currentStepRaw ? Number(currentStepRaw) : undefined;

  return {
    transcript: transcript || undefined,
    summary: summary || undefined,
    form_template_id: formTemplateId || null,
    form_values: formValues,
    output_mode: safeLocalGet(`${prefix}:output_mode`) || undefined,
    current_step: currentStep,
    updated_at: updatedAt,
  };
}

function collectChatbotSessionData(): UserPreferences["session_chatbot"] | undefined {
  const prefix = "aias:v1:chatbot";
  const updatedAtRaw = safeLocalGet(`${prefix}:updated_at`);
  const updatedAt = updatedAtRaw ? Number(updatedAtRaw) : null;

  let messages: { role: string; content: string }[] | undefined;
  try {
    const raw = safeLocalGet(`${prefix}:messages`);
    if (raw) {
      const parsed = JSON.parse(raw) as { role: string; content: string }[];
      // Only persist role + content for backend sync
      messages = parsed.map(m => ({ role: m.role, content: m.content }));
    }
  } catch {}

  if (!messages && !updatedAt) return undefined;

  return { messages, updated_at: updatedAt };
}

function applySessionData(prefs: UserPreferences): void {
  const standardKeys = ["transcript", "summary", "form_template_id", "form_values", "output_mode", "current_step", "updated_at"];
  const realtimeKeys = ["transcript", "summary", "form_template_id", "form_values", "questions", "updated_at"];

  if (prefs.session_standard) {
    const s = prefs.session_standard;
    const prefix = "aias:v1:session:standard";
    // Clear all standard session keys first, then set present values
    for (const key of standardKeys) safeLocalRemove(`${prefix}:${key}`);
    if (s.transcript) safeLocalSet(`${prefix}:transcript`, s.transcript);
    if (s.summary) safeLocalSet(`${prefix}:summary`, s.summary);
    if (s.form_template_id) safeLocalSet(`${prefix}:form_template_id`, s.form_template_id);
    if (s.form_values) safeLocalSet(`${prefix}:form_values`, JSON.stringify(s.form_values));
    if (s.output_mode) safeLocalSet(`${prefix}:output_mode`, s.output_mode);
    if (s.current_step) safeLocalSet(`${prefix}:current_step`, String(s.current_step));
    if (s.updated_at) safeLocalSet(`${prefix}:updated_at`, String(s.updated_at));
  }
  if (prefs.session_realtime) {
    const r = prefs.session_realtime;
    const prefix = "aias:v1:session:realtime";
    // Clear all realtime session keys first, then set present values
    for (const key of realtimeKeys) safeLocalRemove(`${prefix}:${key}`);
    if (r.transcript) safeLocalSet(`${prefix}:transcript`, r.transcript);
    if (r.summary) safeLocalSet(`${prefix}:summary`, r.summary);
    if (r.form_template_id) safeLocalSet(`${prefix}:form_template_id`, r.form_template_id);
    if (r.form_values) safeLocalSet(`${prefix}:form_values`, JSON.stringify(r.form_values));
    if (r.questions) safeLocalSet(`${prefix}:questions`, JSON.stringify(r.questions));
    if (r.updated_at) safeLocalSet(`${prefix}:updated_at`, String(r.updated_at));
  }
  {
    const prefix = "aias:v1:chatbot";
    const chatbotKeys = ["messages", "updated_at"];
    // Always clear chatbot keys first; re-populate only if server has data
    for (const key of chatbotKeys) safeLocalRemove(`${prefix}:${key}`);
    if (prefs.session_chatbot) {
      const c = prefs.session_chatbot;
      if (c.messages) safeLocalSet(`${prefix}:messages`, JSON.stringify(c.messages));
      if (c.updated_at) safeLocalSet(`${prefix}:updated_at`, String(c.updated_at));
    }
  }
}

/** Collect all non-API-key preferences from localStorage into a payload. */
function collectPreferences(): UserPreferences {
  const models: Record<string, string> = {};
  for (const p of ALL_PROVIDERS) {
    const model = safeLocalGet(`aias:v1:model:${p}`);
    if (model) models[p] = model;
  }

  let featureOverrides: Record<string, unknown> = {};
  try {
    const raw = safeLocalGet("aias:v1:feature_overrides");
    if (raw) featureOverrides = JSON.parse(raw);
  } catch {}

  let customTemplates: { id: string; name: string; content: string }[] | undefined;
  try {
    const raw = safeLocalGet("aias:v1:custom_templates");
    if (raw) customTemplates = JSON.parse(raw);
  } catch {}

  let formTemplates: import("@/lib/types").FormTemplate[] | undefined;
  try {
    const raw = safeLocalGet("aias:v1:form_templates");
    if (raw) formTemplates = JSON.parse(raw);
  } catch {}

  const autoKeyPoints = safeLocalGet("aias:v1:auto_key_points");
  const speakerLabels = safeLocalGet("aias:v1:speaker_labels");
  const minSpeakers = parseInt(safeLocalGet("aias:v1:min_speakers"));
  const maxSpeakers = parseInt(safeLocalGet("aias:v1:max_speakers"));
  const realtimeFinalSummary = safeLocalGet("aias:v1:realtime_final_summary");
  const realtimeSystemPrompt = safeLocalGet("aias:v1:realtime_system_prompt");

  const syncStandardRealtime = safeLocalGet("aias:v1:sync_standard_realtime");
  const defaultCopyFormat = safeLocalGet("aias:v1:default_copy_format");
  const defaultSaveFormat = safeLocalGet("aias:v1:default_save_format");

  // Token usage history
  let tokenUsageHistory: import("@/lib/types").TokenUsageEntry[] | undefined;
  try {
    const raw = safeLocalGet("aias:v1:token_usage_history");
    if (raw) tokenUsageHistory = JSON.parse(raw);
  } catch {}

  // Session data
  const sessionStandard = collectSessionData("standard");
  const sessionRealtime = collectSessionData("realtime");
  const sessionChatbot = collectChatbotSessionData();

  return {
    selected_provider: safeLocalGet("aias:v1:selected_provider") || undefined,
    models,
    app_mode: safeLocalGet("aias:v1:app_mode") || undefined,
    realtime_interval: parseInt(safeLocalGet("aias:v1:realtime_interval")) || undefined,
    feature_overrides: featureOverrides,
    theme: safeLocalGet("aias:v1:theme") || undefined,
    azure: {
      api_version: safeLocalGet("aias:v1:azure:api_version") || undefined,
      endpoint: safeLocalGet("aias:v1:azure:endpoint") || undefined,
      deployment_name: safeLocalGet("aias:v1:azure:deployment_name") || undefined,
    },
    auto_key_points: autoKeyPoints ? autoKeyPoints !== "false" : undefined,
    speaker_labels_enabled: speakerLabels ? speakerLabels !== "false" : undefined,
    min_speakers: minSpeakers || undefined,
    max_speakers: maxSpeakers || undefined,
    realtime_final_summary: realtimeFinalSummary ? realtimeFinalSummary !== "false" : undefined,
    realtime_system_prompt: realtimeSystemPrompt || undefined,
    custom_templates: customTemplates,
    form_templates: formTemplates,
    sync_standard_realtime: syncStandardRealtime ? syncStandardRealtime === "true" : undefined,
    default_copy_format: (defaultCopyFormat as import("@/lib/types").CopyFormat) || undefined,
    default_save_format: (defaultSaveFormat as import("@/lib/types").SaveFormat) || undefined,
    session_standard: sessionStandard,
    session_realtime: sessionRealtime,
    session_chatbot: sessionChatbot,
    token_usage_history: tokenUsageHistory,
  };
}

/** Write server preferences to localStorage (non-destructive: only writes non-null values). */
function applyPreferences(prefs: UserPreferences): void {
  if (prefs.selected_provider) safeLocalSet("aias:v1:selected_provider", prefs.selected_provider);
  if (prefs.models) {
    for (const [provider, model] of Object.entries(prefs.models)) {
      if (model) safeLocalSet(`aias:v1:model:${provider}`, model);
    }
  }
  if (prefs.app_mode) safeLocalSet("aias:v1:app_mode", prefs.app_mode);
  if (prefs.realtime_interval) safeLocalSet("aias:v1:realtime_interval", String(prefs.realtime_interval));
  if (prefs.feature_overrides) safeLocalSet("aias:v1:feature_overrides", JSON.stringify(prefs.feature_overrides));
  if (prefs.theme) safeLocalSet("aias:v1:theme", prefs.theme);
  if (prefs.azure?.api_version) safeLocalSet("aias:v1:azure:api_version", prefs.azure.api_version);
  if (prefs.azure?.endpoint) safeLocalSet("aias:v1:azure:endpoint", prefs.azure.endpoint);
  if (prefs.azure?.deployment_name) safeLocalSet("aias:v1:azure:deployment_name", prefs.azure.deployment_name);
  if (prefs.auto_key_points !== undefined) safeLocalSet("aias:v1:auto_key_points", prefs.auto_key_points ? "true" : "false");
  if (prefs.speaker_labels_enabled !== undefined) safeLocalSet("aias:v1:speaker_labels", prefs.speaker_labels_enabled ? "true" : "false");
  if (prefs.min_speakers) safeLocalSet("aias:v1:min_speakers", String(prefs.min_speakers));
  if (prefs.max_speakers) safeLocalSet("aias:v1:max_speakers", String(prefs.max_speakers));
  if (prefs.realtime_final_summary !== undefined) safeLocalSet("aias:v1:realtime_final_summary", prefs.realtime_final_summary ? "true" : "false");
  if (prefs.realtime_system_prompt) safeLocalSet("aias:v1:realtime_system_prompt", prefs.realtime_system_prompt);
  if (prefs.custom_templates) safeLocalSet("aias:v1:custom_templates", JSON.stringify(prefs.custom_templates));
  if (prefs.form_templates) safeLocalSet("aias:v1:form_templates", JSON.stringify(prefs.form_templates));
  if (prefs.sync_standard_realtime !== undefined) safeLocalSet("aias:v1:sync_standard_realtime", prefs.sync_standard_realtime ? "true" : "false");
  if (prefs.default_copy_format) safeLocalSet("aias:v1:default_copy_format", prefs.default_copy_format);
  if (prefs.default_save_format) safeLocalSet("aias:v1:default_save_format", prefs.default_save_format);
  if (prefs.token_usage_history) safeLocalSet("aias:v1:token_usage_history", JSON.stringify(prefs.token_usage_history));
  applySessionData(prefs);
}

export interface UsePreferencesResult {
  storageMode: "local" | "account";
  setStorageMode: (mode: "local" | "account") => void;
  isLoading: boolean;
  /** Server preferences that were loaded (null if local mode or not yet loaded). */
  serverPreferences: UserPreferences | null;
  /** Fire-and-forget: push current localStorage prefs to server (only in account mode). */
  savePreferences: () => void;
}

export function usePreferences(): UsePreferencesResult {
  const { status } = useSession();
  const [storageMode, setStorageModeState] = useState<"local" | "account">("local");
  const [isLoading, setIsLoading] = useState(true);
  const [serverPreferences, setServerPreferences] = useState<UserPreferences | null>(null);
  const initDoneRef = useRef(false);

  // Use a ref so savePreferences always reads the latest storageMode without re-creating the callback
  const storageModeRef = useRef<"local" | "account">("local");
  storageModeRef.current = storageMode;

  const setStorageMode = useCallback((mode: "local" | "account") => {
    storageModeRef.current = mode;
    setStorageModeState(mode);
  }, []);

  // Only depend on `status` — NOT `session` — to prevent re-runs from session
  // reference changes. When status is "authenticated", session is guaranteed non-null.
  useEffect(() => {
    // Still loading session — wait
    if (status === "loading") return;

    // Not authenticated — nothing to fetch
    if (status !== "authenticated") {
      setIsLoading(false);
      return;
    }

    // Prevent duplicate runs (React StrictMode or status re-emissions)
    if (initDoneRef.current) return;
    initDoneRef.current = true;

    async function init() {
      try {
        console.log("[usePreferences] init: fetching user profile...");
        const me = await getMe();
        console.log("[usePreferences] init: storage_mode =", me.storage_mode);

        const mode = me.storage_mode as "local" | "account";
        let prefs: UserPreferences | null = null;

        if (mode === "account") {
          console.log("[usePreferences] init: fetching server preferences...");
          const prefsData = await getPreferences();
          console.log("[usePreferences] init: server preferences =", prefsData.preferences);
          if (prefsData.preferences) {
            applyPreferences(prefsData.preferences);
            prefs = prefsData.preferences;
          }
        }

        // Batch all state updates together AFTER all async work is done.
        // This avoids mid-flight re-renders that could cancel the effect.
        setStorageMode(mode);
        setServerPreferences(prefs);
      } catch (e) {
        console.error("[usePreferences] init failed:", e);
      } finally {
        setIsLoading(false);
      }
    }

    init();
  }, [status, setStorageMode]);

  const savePreferences = useCallback(() => {
    if (storageModeRef.current !== "account") return;
    const prefs = collectPreferences();
    console.log("[usePreferences] savePreferences:", prefs);
    putPreferences(prefs).catch((e) => {
      console.error("[usePreferences] savePreferences failed:", e);
    });
  }, []);

  return { storageMode, setStorageMode, isLoading, serverPreferences, savePreferences };
}
