"use client";

import { useCallback } from "react";
import type { LiveQuestion } from "@/lib/types";

// ─── Storage keys ────────────────────────────────────────────────────────────

const PREFIX = "aias:v1:session";

const KEYS = {
  standard: {
    transcript: `${PREFIX}:standard:transcript`,
    summary: `${PREFIX}:standard:summary`,
    formTemplateId: `${PREFIX}:standard:form_template_id`,
    formValues: `${PREFIX}:standard:form_values`,
    outputMode: `${PREFIX}:standard:output_mode`,
    updatedAt: `${PREFIX}:standard:updated_at`,
  },
  realtime: {
    transcript: `${PREFIX}:realtime:transcript`,
    summary: `${PREFIX}:realtime:summary`,
    formTemplateId: `${PREFIX}:realtime:form_template_id`,
    formValues: `${PREFIX}:realtime:form_values`,
    questions: `${PREFIX}:realtime:questions`,
    updatedAt: `${PREFIX}:realtime:updated_at`,
  },
} as const;

// ─── Safe localStorage helpers ───────────────────────────────────────────────

function safeGet(key: string): string | null {
  try {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): void {
  try {
    if (typeof window !== "undefined") localStorage.setItem(key, value);
  } catch {}
}

function safeRemove(key: string): void {
  try {
    if (typeof window !== "undefined") localStorage.removeItem(key);
  } catch {}
}

// ─── Session data interfaces ─────────────────────────────────────────────────

export interface StandardSessionData {
  transcript: string;
  summary: string;
  formTemplateId: string | null;
  formValues: Record<string, unknown>;
  outputMode: "summary" | "form";
  updatedAt: number | null;
}

export interface RealtimeSessionData {
  transcript: string;
  summary: string;
  formTemplateId: string | null;
  formValues: Record<string, unknown>;
  questions: LiveQuestion[];
  updatedAt: number | null;
}

export interface LatestTranscriptResult {
  transcript: string;
  mode: "standard" | "realtime";
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useSessionPersistence() {
  // --- Standard session ---

  const loadStandardSession = useCallback((): StandardSessionData => {
    const transcript = safeGet(KEYS.standard.transcript) ?? "";
    const summary = safeGet(KEYS.standard.summary) ?? "";
    const formTemplateId = safeGet(KEYS.standard.formTemplateId) ?? null;
    const outputMode = (safeGet(KEYS.standard.outputMode) ?? "summary") as "summary" | "form";
    const updatedAtRaw = safeGet(KEYS.standard.updatedAt);
    const updatedAt = updatedAtRaw ? Number(updatedAtRaw) : null;

    let formValues: Record<string, unknown> = {};
    try {
      const raw = safeGet(KEYS.standard.formValues);
      if (raw) formValues = JSON.parse(raw);
    } catch {}

    return { transcript, summary, formTemplateId, formValues, outputMode, updatedAt };
  }, []);

  const saveStandardTranscript = useCallback((value: string) => {
    safeSet(KEYS.standard.transcript, value);
    safeSet(KEYS.standard.updatedAt, String(Date.now()));
  }, []);

  const saveStandardSummary = useCallback((value: string) => {
    safeSet(KEYS.standard.summary, value);
  }, []);

  const saveStandardFormTemplateId = useCallback((value: string | null) => {
    if (value) {
      safeSet(KEYS.standard.formTemplateId, value);
    } else {
      safeRemove(KEYS.standard.formTemplateId);
    }
  }, []);

  const saveStandardFormValues = useCallback((values: Record<string, unknown>) => {
    safeSet(KEYS.standard.formValues, JSON.stringify(values));
  }, []);

  const saveStandardOutputMode = useCallback((mode: "summary" | "form") => {
    safeSet(KEYS.standard.outputMode, mode);
  }, []);

  const clearStandardSession = useCallback(() => {
    for (const key of Object.values(KEYS.standard)) {
      safeRemove(key);
    }
  }, []);

  // --- Realtime session ---

  const loadRealtimeSession = useCallback((): RealtimeSessionData => {
    const transcript = safeGet(KEYS.realtime.transcript) ?? "";
    const summary = safeGet(KEYS.realtime.summary) ?? "";
    const formTemplateId = safeGet(KEYS.realtime.formTemplateId) ?? null;
    const updatedAtRaw = safeGet(KEYS.realtime.updatedAt);
    const updatedAt = updatedAtRaw ? Number(updatedAtRaw) : null;

    let formValues: Record<string, unknown> = {};
    try {
      const raw = safeGet(KEYS.realtime.formValues);
      if (raw) formValues = JSON.parse(raw);
    } catch {}

    let questions: LiveQuestion[] = [];
    try {
      const raw = safeGet(KEYS.realtime.questions);
      if (raw) questions = JSON.parse(raw);
    } catch {}

    return { transcript, summary, formTemplateId, formValues, questions, updatedAt };
  }, []);

  const saveRealtimeTranscript = useCallback((value: string) => {
    safeSet(KEYS.realtime.transcript, value);
    safeSet(KEYS.realtime.updatedAt, String(Date.now()));
  }, []);

  const saveRealtimeSummary = useCallback((value: string) => {
    safeSet(KEYS.realtime.summary, value);
  }, []);

  const saveRealtimeFormTemplateId = useCallback((value: string | null) => {
    if (value) {
      safeSet(KEYS.realtime.formTemplateId, value);
    } else {
      safeRemove(KEYS.realtime.formTemplateId);
    }
  }, []);

  const saveRealtimeFormValues = useCallback((values: Record<string, unknown>) => {
    safeSet(KEYS.realtime.formValues, JSON.stringify(values));
  }, []);

  const saveRealtimeQuestions = useCallback((questions: LiveQuestion[]) => {
    safeSet(KEYS.realtime.questions, JSON.stringify(questions));
  }, []);

  const clearRealtimeSession = useCallback(() => {
    for (const key of Object.values(KEYS.realtime)) {
      safeRemove(key);
    }
  }, []);

  // --- Cross-mode helpers ---

  const getLatestTranscript = useCallback((): LatestTranscriptResult | null => {
    const stdUpdated = safeGet(KEYS.standard.updatedAt);
    const rtUpdated = safeGet(KEYS.realtime.updatedAt);

    const stdTime = stdUpdated ? Number(stdUpdated) : 0;
    const rtTime = rtUpdated ? Number(rtUpdated) : 0;

    if (stdTime === 0 && rtTime === 0) return null;

    if (rtTime > stdTime) {
      const transcript = safeGet(KEYS.realtime.transcript) ?? "";
      return transcript ? { transcript, mode: "realtime" } : null;
    } else {
      const transcript = safeGet(KEYS.standard.transcript) ?? "";
      return transcript ? { transcript, mode: "standard" } : null;
    }
  }, []);

  return {
    // Standard
    loadStandardSession,
    saveStandardTranscript,
    saveStandardSummary,
    saveStandardFormTemplateId,
    saveStandardFormValues,
    saveStandardOutputMode,
    clearStandardSession,
    // Realtime
    loadRealtimeSession,
    saveRealtimeTranscript,
    saveRealtimeSummary,
    saveRealtimeFormTemplateId,
    saveRealtimeFormValues,
    saveRealtimeQuestions,
    clearRealtimeSession,
    // Cross-mode
    getLatestTranscript,
  };
}
