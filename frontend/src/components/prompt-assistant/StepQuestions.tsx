"use client";

import { QuestionField } from "./QuestionField";
import type { AssistantQuestion } from "@/lib/types";

interface StepQuestionsProps {
  questions: AssistantQuestion[];
  answers: Record<string, string | string[]>;
  onAnswerChange: (questionId: string, value: string | string[]) => void;
}

export function StepQuestions({ questions, answers, onAnswerChange }: StepQuestionsProps) {
  return (
    <div className="space-y-6 py-2">
      {questions.map((question) => (
        <QuestionField
          key={question.id}
          question={question}
          value={answers[question.id] ?? (question.type === "multi_select" ? [] : "")}
          onChange={(value) => onAnswerChange(question.id, value)}
        />
      ))}
    </div>
  );
}
