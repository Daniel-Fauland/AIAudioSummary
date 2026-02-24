import { ApiError } from "./api";

export type ErrorContext = "summary" | "keyPoints" | "transcript" | "speakers" | "analyze" | "generate" | "regenerate" | "chatbot" | "formOutput";

export function getErrorMessage(error: unknown, context: ErrorContext): string {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      return "Invalid API key. Please check your settings.";
    }
    if (error.status === 400) {
      return "Request failed. The model may not be available for this provider.";
    }
    if (error.status === 502) {
      if (context === "keyPoints") {
        return "Key point extraction failed. Try selecting a different model — not all models support structured output.";
      }
      if (context === "summary") {
        return "Summary generation failed. Please try again or select a different model.";
      }
      if (context === "transcript") {
        return "Transcription failed. Please check your AssemblyAI key and audio file.";
      }
      if (context === "analyze") {
        return "Failed to analyze prompt. Try selecting a different model — not all models support structured output.";
      }
      if (context === "generate" || context === "regenerate") {
        return "Failed to generate prompt. Please try again or select a different model.";
      }
      if (context === "chatbot") {
        return "Chat failed. Please try again or select a different model.";
      }
      if (context === "formOutput") {
        return "Form filling failed. Try selecting a different model — not all models support structured output.";
      }
    }
  }
  return "Something went wrong. Please try again later.";
}
