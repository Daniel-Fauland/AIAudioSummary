"use client";

import { useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import { fillForm } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import type {
  FormFieldDefinition,
  LLMProvider,
  AzureConfig,
  LangdockConfig,
} from "@/lib/types";

export interface FormOutputLlmConfig {
  provider: LLMProvider;
  apiKey: string;
  model: string;
  azureConfig?: AzureConfig;
  langdockConfig?: LangdockConfig;
}

export interface UseFormOutputOptions {
  initialValues?: Record<string, unknown>;
}

export function useFormOutput(options?: UseFormOutputOptions) {
  const { initialValues } = options ?? {};
  const [values, setValues] = useState<Record<string, unknown>>(initialValues ?? {});
  const [isFilling, setIsFilling] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [manualEdits, setManualEdits] = useState<Record<string, unknown>>({});

  const isFillingRef = useRef(false);
  const lastFilledTranscriptLengthRef = useRef(0);

  const shouldFill = useCallback((transcript: string): boolean => {
    if (!transcript.trim()) return false;
    return transcript.length > lastFilledTranscriptLengthRef.current;
  }, []);

  const triggerFill = useCallback(
    async (
      transcript: string,
      fields: FormFieldDefinition[],
      llmConfig: FormOutputLlmConfig,
    ) => {
      if (isFillingRef.current) return;
      if (isComplete) return;
      if (fields.length === 0) return;
      if (!shouldFill(transcript)) return;

      isFillingRef.current = true;
      setIsFilling(true);

      try {
        // Merge current values + manual edits as previous_values
        const currentValues = { ...values, ...manualEdits };
        const hasPrevious = Object.values(currentValues).some((v) => v != null);

        const response = await fillForm({
          provider: llmConfig.provider,
          api_key: llmConfig.apiKey,
          model: llmConfig.model,
          azure_config: llmConfig.azureConfig,
          langdock_config: llmConfig.langdockConfig,
          transcript,
          fields,
          previous_values: hasPrevious ? currentValues : undefined,
        });

        lastFilledTranscriptLengthRef.current = transcript.length;

        // Merge: LLM values first, then manual edits take priority
        setValues((prev) => {
          const merged = { ...prev, ...response.values };
          // Apply manual edits on top
          for (const [key, val] of Object.entries(manualEdits)) {
            merged[key] = val;
          }
          return merged;
        });
      } catch (e) {
        toast.error(getErrorMessage(e, "formOutput"));
      } finally {
        isFillingRef.current = false;
        setIsFilling(false);
      }
    },
    [isComplete, shouldFill, values, manualEdits],
  );

  const setManualValue = useCallback((fieldId: string, value: unknown) => {
    setManualEdits((prev) => ({ ...prev, [fieldId]: value }));
    setValues((prev) => ({ ...prev, [fieldId]: value }));
  }, []);

  const resetForm = useCallback(() => {
    setValues({});
    setManualEdits({});
    setIsComplete(false);
    lastFilledTranscriptLengthRef.current = 0;
  }, []);

  const toggleComplete = useCallback(() => {
    setIsComplete((prev) => !prev);
  }, []);

  return {
    values,
    isFilling,
    isComplete,
    manualEdits,
    triggerFill,
    setManualValue,
    resetForm,
    toggleComplete,
    shouldFill,
  };
}
