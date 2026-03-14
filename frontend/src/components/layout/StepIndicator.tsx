"use client";

import { Upload, FileText, Sparkles } from "lucide-react";

interface StepIndicatorProps {
  currentStep: 1 | 2 | 3;
  maxReachedStep: 1 | 2 | 3;
  onStepClick: (step: 1 | 2 | 3) => void;
}

const steps = [
  { label: "Upload", icon: Upload },
  { label: "Transcript", icon: FileText },
  { label: "Summary", icon: Sparkles },
] as const;

export function StepIndicator({ currentStep, maxReachedStep, onStepClick }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-0 py-6">
      {steps.map((step, index) => {
        const stepNumber = (index + 1) as 1 | 2 | 3;
        const isCompleted = stepNumber < currentStep;
        const isActive = stepNumber === currentStep;
        const isClickable = !isActive && stepNumber <= maxReachedStep;
        const Icon = step.icon;

        return (
          <div key={step.label} className="flex items-start">
            <div className="flex flex-col items-center gap-3">
              <div
                role={isClickable ? "button" : undefined}
                tabIndex={isClickable ? 0 : undefined}
                onClick={isClickable ? () => onStepClick(stepNumber) : undefined}
                onKeyDown={
                  isClickable
                    ? (e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onStepClick(stepNumber);
                        }
                      }
                    : undefined
                }
                className={`flex h-12 w-12 items-center justify-center rounded-2xl transition-all duration-500 ${
                  isClickable
                    ? "cursor-pointer hover:opacity-100 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                    : ""
                } ${
                  isCompleted
                    ? "bg-primary text-white shadow-lg shadow-primary/20"
                    : isActive
                      ? "scale-110 bg-[#12121A] text-primary glow-border z-10"
                      : "border border-border bg-card/50 text-foreground-muted opacity-60 backdrop-blur-sm"
                }`}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div className="hidden md:flex flex-col items-center gap-1.5 min-w-[80px]">
                <span
                  className={`text-xs font-mono uppercase tracking-wider ${
                    isCompleted
                      ? "text-foreground-secondary"
                      : isActive
                        ? "font-bold text-foreground text-glow"
                        : "text-foreground-muted"
                  }`}
                >
                  {step.label}
                </span>
                {isActive ? (
                  <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(252,82,11,0.8)]" />
                ) : (
                  <span className="h-1.5 w-1.5" />
                )}
              </div>
            </div>
            {index < steps.length - 1 ? (
              <div
                className={`mx-2 mt-6 h-[1px] w-12 md:w-20 -translate-y-1/2 transition-colors duration-500 ${
                  stepNumber < currentStep ? "bg-primary shadow-[0_0_8px_rgba(252,82,11,0.5)]" : "bg-border/50"
                }`}
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
