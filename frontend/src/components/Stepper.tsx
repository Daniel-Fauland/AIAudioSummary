import React from "react";

interface StepperProps {
  steps: string[];
  currentStep: number;
  stepStatus: {
    fileUploaded: boolean;
    transcriptReady: boolean;
    summaryReady: boolean;
  };
}

export const Stepper: React.FC<StepperProps> = ({ steps, currentStep, stepStatus }) => {
  // Design system tokens
  const blue = "#4F7EF7";
  const blueLight = "#6B92F9";
  const gray = "#E2E8F0";
  const grayText = "#64748B";
  const borderRadius = "9999px";
  const circleSize = 48;
  const fontSize = "1rem";
  const fontWeightBold = 600;
  const fontWeightNormal = 500;

  // Step state logic (done, inprogress, notstarted)
  const getStepState = (idx: number) => {
    if (idx === 0) {
      if (stepStatus.fileUploaded) return "done";
      return idx === currentStep ? "inprogress" : "notstarted";
    }
    if (idx === 1) {
      if (stepStatus.transcriptReady) return "done";
      if (idx === currentStep && !stepStatus.transcriptReady) return "inprogress";
      return "notstarted";
    }
    if (idx === 2) {
      if (stepStatus.summaryReady) return "done";
      if (idx === currentStep && !stepStatus.summaryReady) return "inprogress";
      return "notstarted";
    }
    return "notstarted";
  };

  return (
    <nav className="flex justify-center w-full max-w-2xl mb-10">
      <ol className="flex w-full items-center justify-between">
        {steps.map((label, idx) => {
          const state = getStepState(idx);
          let background = gray;
          let color = grayText;
          if (state === "done") {
            background = `linear-gradient(135deg, ${blue} 0%, ${blueLight} 100%)`;
            color = "#fff";
          } else if (state === "inprogress") {
            background = `linear-gradient(90deg, ${blue} 0%, ${blue} 50%, ${gray} 50%, ${gray} 100%)`;
            color = "#222";
          }
          return (
            <li key={label} className="flex flex-col items-center relative" style={{ flex: "0 0 auto" }}>
              <div
                className="flex items-center justify-center"
                style={{
                  width: circleSize,
                  height: circleSize,
                  borderRadius,
                  background,
                  border: `2px solid ${state === "done" || state === "inprogress" ? blue : gray}`,
                  color,
                  fontWeight: currentStep === idx ? fontWeightBold : fontWeightNormal,
                  fontSize,
                  transition: "background 0.3s, border 0.3s, color 0.3s",
                  zIndex: 2,
                }}
              >
                {idx + 1}
              </div>
              <span
                className={
                  currentStep === idx
                    ? "mt-2 text-base font-bold text-[#4F7EF7]"
                    : "mt-2 text-base font-medium text-[#1E293B]"
                }
                style={{ fontSize, fontWeight: currentStep === idx ? fontWeightBold : fontWeightNormal }}
              >
                {label}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
