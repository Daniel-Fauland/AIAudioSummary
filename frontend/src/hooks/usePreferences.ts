"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { getMe, getPreferences, putPreferences } from "@/lib/api";
import type { UserPreferences } from "@/lib/types";

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

  const autoKeyPoints = safeLocalGet("aias:v1:auto_key_points");
  const speakerLabels = safeLocalGet("aias:v1:speaker_labels");
  const minSpeakers = parseInt(safeLocalGet("aias:v1:min_speakers"));
  const maxSpeakers = parseInt(safeLocalGet("aias:v1:max_speakers"));
  const realtimeFinalSummary = safeLocalGet("aias:v1:realtime_final_summary");
  const realtimeSystemPrompt = safeLocalGet("aias:v1:realtime_system_prompt");

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
