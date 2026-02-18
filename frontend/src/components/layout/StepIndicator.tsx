"use client";

import { Upload, FileText, Sparkles } from "lucide-react";

interface StepIndicatorProps {
  currentStep: 1 | 2 | 3;
}

const steps = [
  { label: "Upload", icon: Upload },
  { label: "Transcript", icon: FileText },
  { label: "Summary", icon: Sparkles },
] as const;

export function StepIndicator({ currentStep }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-0 py-6">
      {steps.map((step, index) => {
        const stepNumber = (index + 1) as 1 | 2 | 3;
        const isCompleted = stepNumber < currentStep;
        const isActive = stepNumber === currentStep;
        const Icon = step.icon;

        return (
          <div key={step.label} className="flex items-start">
            <div className="flex flex-col items-center gap-2">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full transition-all duration-300 ${
                  isCompleted
                    ? "bg-primary text-white"
                    : isActive
                      ? "scale-110 bg-primary text-white shadow-[0_0_14px_2px_rgba(252,82,11,0.18)]"
                      : "border border-border bg-card-elevated text-foreground-muted"
                }`}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div className="hidden md:flex flex-col items-center gap-1">
                <span
                  className={`text-xs font-medium ${
                    isCompleted
                      ? "text-foreground-secondary"
                      : isActive
                        ? "font-bold text-foreground"
                        : "text-foreground-muted"
                  }`}
                >
                  {step.label}
                </span>
                {isActive ? (
                  <span className="h-1 w-1 rounded-full bg-primary" />
                ) : (
                  <span className="h-1 w-1" />
                )}
              </div>
            </div>
            {index < steps.length - 1 ? (
              <div
                className={`mx-3 mt-5 h-0.5 w-12 md:w-20 -translate-y-1/2 ${
                  stepNumber < currentStep ? "bg-primary" : "bg-border"
                }`}
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
