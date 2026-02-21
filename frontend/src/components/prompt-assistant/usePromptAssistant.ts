"use client";

import { useState, useCallback } from "react";
import { analyzePrompt, generatePrompt } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import type {
  AssistantQuestion,
  AzureConfig,
  LangdockConfig,
  LLMProvider,
} from "@/lib/types";

export type WizardStep = "base_prompt" | "questions" | "summary" | "result";

interface UsePromptAssistantOptions {
  provider: LLMProvider;
  apiKey: string;
  model: string;
  azureConfig: AzureConfig | null;
  langdockConfig?: LangdockConfig;
  currentPrompt?: string;
}

export interface UsePromptAssistantReturn {
  currentStep: WizardStep;
  basePrompt: string;
  questions: AssistantQuestion[];
  answers: Record<string, string | string[]>;
  additionalNotes: string;
  generatedPrompt: string;
  isLoading: boolean;
  error: string | null;
  setBasePrompt: (value: string) => void;
  submitBasePrompt: () => Promise<void>;
  setAnswer: (questionId: string, value: string | string[]) => void;
  goToSummary: () => void;
  goToQuestions: () => void;
  goToBasePrompt: () => void;
  setAdditionalNotes: (value: string) => void;
  generate: () => Promise<void>;
  regenerate: (feedback?: string) => Promise<void>;
  setGeneratedPrompt: (value: string) => void;
  reset: () => void;
}

export function usePromptAssistant({
  provider,
  apiKey,
  model,
  azureConfig,
  langdockConfig,
  currentPrompt = "",
}: UsePromptAssistantOptions): UsePromptAssistantReturn {
  const [currentStep, setCurrentStep] = useState<WizardStep>("base_prompt");
  const [basePrompt, setBasePrompt] = useState(currentPrompt);
  const [questions, setQuestions] = useState<AssistantQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [generatedPrompt, setGeneratedPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const buildCredentials = useCallback(
    () => ({
      provider,
      api_key: apiKey,
      model,
      azure_config: azureConfig,
      langdock_config: langdockConfig,
    }),
    [provider, apiKey, model, azureConfig, langdockConfig],
  );

  const submitBasePrompt = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await analyzePrompt({
        ...buildCredentials(),
        base_prompt: basePrompt.trim() || undefined,
      });

      const qs = response.questions;
      setQuestions(qs);

      // Pre-populate answers with defaults
      const defaultAnswers: Record<string, string | string[]> = {};
      for (const q of qs) {
        if (q.default !== undefined && q.default !== null) {
          defaultAnswers[q.id] = q.default;
        } else if (q.type === "multi_select") {
          defaultAnswers[q.id] = [];
        } else {
          defaultAnswers[q.id] = "";
        }
      }
      setAnswers(defaultAnswers);

      if (qs.length === 0) {
        // Edge case: no questions returned, skip to summary
        setCurrentStep("summary");
      } else {
        setCurrentStep("questions");
      }
    } catch (err) {
      setError(getErrorMessage(err, "analyze"));
    } finally {
      setIsLoading(false);
    }
  }, [basePrompt, buildCredentials]);

  const setAnswer = useCallback((questionId: string, value: string | string[]) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }, []);

  const goToSummary = useCallback(() => {
    setCurrentStep("summary");
  }, []);

  const goToQuestions = useCallback(() => {
    setCurrentStep("questions");
  }, []);

  const goToBasePrompt = useCallback(() => {
    setCurrentStep("base_prompt");
  }, []);

  const generate = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await generatePrompt({
        ...buildCredentials(),
        base_prompt: basePrompt.trim() || undefined,
        answers,
        additional_notes: additionalNotes.trim() || undefined,
      });
      setGeneratedPrompt(response.generated_prompt);
      setCurrentStep("result");
    } catch (err) {
      setError(getErrorMessage(err, "generate"));
    } finally {
      setIsLoading(false);
    }
  }, [buildCredentials, basePrompt, answers, additionalNotes]);

  const regenerate = useCallback(
    async (feedback?: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const combinedNotes = feedback
          ? additionalNotes
            ? `${additionalNotes}\n\nRequested changes: ${feedback}`
            : `Requested changes: ${feedback}`
          : additionalNotes;

        const response = await generatePrompt({
          ...buildCredentials(),
          base_prompt: basePrompt.trim() || undefined,
          answers,
          additional_notes: combinedNotes.trim() || undefined,
        });
        setGeneratedPrompt(response.generated_prompt);
      } catch (err) {
        setError(getErrorMessage(err, "regenerate"));
      } finally {
        setIsLoading(false);
      }
    },
    [buildCredentials, basePrompt, answers, additionalNotes],
  );

  const reset = useCallback(() => {
    setCurrentStep("base_prompt");
    setBasePrompt(currentPrompt);
    setQuestions([]);
    setAnswers({});
    setAdditionalNotes("");
    setGeneratedPrompt("");
    setError(null);
    setIsLoading(false);
  }, [currentPrompt]);

  return {
    currentStep,
    basePrompt,
    questions,
    answers,
    additionalNotes,
    generatedPrompt,
    isLoading,
    error,
    setBasePrompt,
    submitBasePrompt,
    setAnswer,
    goToSummary,
    goToQuestions,
    goToBasePrompt,
    setAdditionalNotes,
    generate,
    regenerate,
    setGeneratedPrompt,
    reset,
  };
}
