"use client";

import { useEffect } from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { AzureConfig, LangdockConfig, LLMProvider } from "@/lib/types";
import { StepBasePrompt } from "./StepBasePrompt";
import { StepQuestions } from "./StepQuestions";
import { StepResult } from "./StepResult";
import { StepSummary } from "./StepSummary";
import { usePromptAssistant, type WizardStep } from "./usePromptAssistant";

interface PromptAssistantModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPromptGenerated: (prompt: string) => void;
  provider: LLMProvider;
  apiKey: string;
  model: string;
  azureConfig: AzureConfig | null;
  langdockConfig?: LangdockConfig;
  currentPrompt?: string;
}

const STEP_LABELS: Record<WizardStep, string> = {
  base_prompt: "Base Prompt",
  questions: "Preferences",
  summary: "Review",
  result: "Generated Prompt",
};

const STEP_ORDER: WizardStep[] = ["base_prompt", "questions", "summary", "result"];

function StepDots({ currentStep }: { currentStep: WizardStep }) {
  const currentIndex = STEP_ORDER.indexOf(currentStep);

  return (
    <div className="flex items-center gap-2">
      {STEP_ORDER.map((step, index) => (
        <div
          key={step}
          className="h-1.5 rounded-full transition-all duration-200"
          style={{
            width: index === currentIndex ? "20px" : "6px",
            backgroundColor:
              index <= currentIndex
                ? "var(--primary, #FC520B)"
                : "var(--border, #262626)",
          }}
        />
      ))}
      <span className="ml-1 text-xs text-foreground-muted">
        Step {currentIndex + 1} of {STEP_ORDER.length}
      </span>
    </div>
  );
}

export function PromptAssistantModal({
  open,
  onOpenChange,
  onPromptGenerated,
  provider,
  apiKey,
  model,
  azureConfig,
  langdockConfig,
  currentPrompt = "",
}: PromptAssistantModalProps) {
  const assistant = usePromptAssistant({
    provider,
    apiKey,
    model,
    azureConfig,
    langdockConfig,
    currentPrompt,
  });

  // Reset when modal closes
  useEffect(() => {
    if (!open) {
      assistant.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleUsePrompt = () => {
    onPromptGenerated(assistant.generatedPrompt);
    onOpenChange(false);
  };

  const renderFooter = () => {
    switch (assistant.currentStep) {
      case "base_prompt":
        return (
          <>
            <Button
              variant="ghost"
              onClick={() => assistant.skipBasePrompt()}
              disabled={assistant.isLoading}
            >
              Skip
            </Button>
            <Button
              onClick={() => assistant.submitBasePrompt()}
              disabled={assistant.isLoading}
            >
              Next
            </Button>
          </>
        );
      case "questions":
        return (
          <>
            <Button
              variant="ghost"
              onClick={assistant.goToBasePrompt}
              disabled={assistant.isLoading}
            >
              Back
            </Button>
            <Button onClick={assistant.goToSummary} disabled={assistant.isLoading}>
              Next
            </Button>
          </>
        );
      case "summary":
        return (
          <>
            <Button
              variant="ghost"
              onClick={assistant.goToQuestions}
              disabled={assistant.isLoading}
            >
              Back
            </Button>
            <Button onClick={() => assistant.generate()} disabled={assistant.isLoading}>
              Create Prompt
            </Button>
          </>
        );
      case "result":
        return (
          <>
            <Button
              variant="ghost"
              onClick={assistant.goToSummary}
              disabled={assistant.isLoading}
            >
              Back
            </Button>
            <Button onClick={handleUsePrompt} disabled={assistant.isLoading}>
              Use this prompt
            </Button>
          </>
        );
    }
  };

  const renderContent = () => {
    switch (assistant.currentStep) {
      case "base_prompt":
        return (
          <StepBasePrompt
            basePrompt={assistant.basePrompt}
            onBasePromptChange={assistant.setBasePrompt}
            isLoading={assistant.isLoading}
          />
        );
      case "questions":
        return (
          <StepQuestions
            questions={assistant.questions}
            answers={assistant.answers}
            onAnswerChange={assistant.setAnswer}
          />
        );
      case "summary":
        return (
          <StepSummary
            questions={assistant.questions}
            answers={assistant.answers}
            additionalNotes={assistant.additionalNotes}
            onAdditionalNotesChange={assistant.setAdditionalNotes}
            isLoading={assistant.isLoading}
          />
        );
      case "result":
        return (
          <StepResult
            generatedPrompt={assistant.generatedPrompt}
            onGeneratedPromptChange={assistant.setGeneratedPrompt}
            onRegenerate={assistant.regenerate}
            isLoading={assistant.isLoading}
          />
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="flex flex-col max-h-[85vh] sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Prompt Assistant</DialogTitle>
            <StepDots currentStep={assistant.currentStep} />
          </div>
          <DialogDescription>
            {STEP_LABELS[assistant.currentStep] === "Base Prompt"
              ? "Optionally provide an existing prompt to refine, or start from scratch."
              : STEP_LABELS[assistant.currentStep] === "Preferences"
                ? "Answer a few questions to customize your prompt."
                : STEP_LABELS[assistant.currentStep] === "Review"
                  ? "Review your preferences and add any final instructions."
                  : "Your prompt is ready. Edit it or use it as-is."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {/* Error banner */}
          {assistant.error ? (
            <div
              className="mb-4 flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm"
              style={{
                backgroundColor: "var(--color-error-muted)",
                borderColor: "color-mix(in srgb, var(--color-error) 30%, transparent)",
                color: "var(--color-error)",
              }}
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{assistant.error}</span>
            </div>
          ) : null}

          {renderContent()}
        </div>

        <DialogFooter className="flex-shrink-0 gap-2 sm:gap-0">{renderFooter()}</DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
