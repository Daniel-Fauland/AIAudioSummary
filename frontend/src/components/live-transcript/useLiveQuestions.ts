"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { toast } from "sonner";
import { evaluateLiveQuestions } from "@/lib/api";
import type {
  LiveQuestion,
  LLMProvider,
  AzureConfig,
  LangdockConfig,
} from "@/lib/types";

export interface LiveQuestionsLlmConfig {
  provider: LLMProvider;
  apiKey: string;
  model: string;
  azureConfig?: AzureConfig;
  langdockConfig?: LangdockConfig;
}

export interface UseLiveQuestionsOptions {
  initialQuestions?: LiveQuestion[];
}

export function useLiveQuestions(options?: UseLiveQuestionsOptions) {
  const { initialQuestions } = options ?? {};
  const [questions, setQuestions] = useState<LiveQuestion[]>(initialQuestions ?? []);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [warningDismissed, setWarningDismissed] = useState(false);

  // Keep a ref to current questions so callbacks can read latest state without stale closures
  const questionsRef = useRef<LiveQuestion[]>([]);
  useEffect(() => {
    questionsRef.current = questions;
  }, [questions]);

  const lastEvaluatedTranscriptLengthRef = useRef(0);
  const lastEvaluatedQuestionIdsRef = useRef<string[]>([]);
  const isEvaluatingRef = useRef(false);

  const addQuestion = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setQuestions((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        question: trimmed,
        status: "unanswered" as const,
        createdAt: Date.now(),
      },
    ]);
  }, []);

  const removeQuestion = useCallback((id: string) => {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  }, []);

  const resetQuestion = useCallback((id: string) => {
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === id
          ? { ...q, status: "unanswered" as const, answer: undefined, answeredAtTranscriptLength: undefined }
          : q
      )
    );
  }, []);

  const dismissWarning = useCallback(() => {
    setWarningDismissed(true);
  }, []);

  /**
   * Returns true if an evaluation API call should be made.
   * Uses the ref to read latest questions without stale closure issues.
   */
  const shouldEvaluate = useCallback((transcript: string): boolean => {
    const current = questionsRef.current;
    const unanswered = current.filter((q) => q.status === "unanswered");
    if (unanswered.length === 0) return false;
    if (!transcript.trim()) return false;

    const transcriptGrew = transcript.length > lastEvaluatedTranscriptLengthRef.current;
    const newQuestionsAdded = unanswered.some(
      (q) => !lastEvaluatedQuestionIdsRef.current.includes(q.id)
    );

    return transcriptGrew || newQuestionsAdded;
  }, []);

  /**
   * Triggers LLM evaluation for all unanswered questions against the transcript.
   * Skips if already evaluating or shouldEvaluate returns false.
   */
  const triggerEvaluation = useCallback(
    async (transcript: string, llmConfig: LiveQuestionsLlmConfig) => {
      if (isEvaluatingRef.current) return;
      if (!shouldEvaluate(transcript)) return;

      const current = questionsRef.current;
      const unanswered = current.filter((q) => q.status === "unanswered");
      if (unanswered.length === 0) return;

      isEvaluatingRef.current = true;
      setIsEvaluating(true);

      const questionsToEvaluate = unanswered.map((q) => ({
        id: q.id,
        question: q.question,
      }));

      try {
        const response = await evaluateLiveQuestions({
          provider: llmConfig.provider,
          api_key: llmConfig.apiKey,
          model: llmConfig.model,
          azure_config: llmConfig.azureConfig,
          langdock_config: llmConfig.langdockConfig,
          transcript,
          questions: questionsToEvaluate,
        });

        lastEvaluatedTranscriptLengthRef.current = transcript.length;
        lastEvaluatedQuestionIdsRef.current = unanswered.map((q) => q.id);

        const answeredMap = new Map(
          response.evaluations
            .filter((e) => e.answered)
            .map((e) => [e.id, e.answer])
        );

        if (answeredMap.size > 0) {
          setQuestions((prev) =>
            prev.map((q) => {
              if (answeredMap.has(q.id)) {
                return {
                  ...q,
                  status: "answered" as const,
                  answer: answeredMap.get(q.id) ?? undefined,
                  answeredAtTranscriptLength: transcript.length,
                };
              }
              return q;
            })
          );
        }
      } catch {
        toast.error("Failed to evaluate questions against the transcript");
      } finally {
        isEvaluatingRef.current = false;
        setIsEvaluating(false);
      }
    },
    [shouldEvaluate]
  );

  const clearAll = useCallback(() => {
    setQuestions([]);
    questionsRef.current = [];
    lastEvaluatedTranscriptLengthRef.current = 0;
    lastEvaluatedQuestionIdsRef.current = [];
  }, []);

  const resetEvaluationTracking = useCallback(() => {
    lastEvaluatedTranscriptLengthRef.current = 0;
    lastEvaluatedQuestionIdsRef.current = [];
  }, []);

  return {
    questions,
    isEvaluating,
    warningDismissed,
    addQuestion,
    removeQuestion,
    resetQuestion,
    dismissWarning,
    shouldEvaluate,
    triggerEvaluation,
    clearAll,
    resetEvaluationTracking,
  };
}
