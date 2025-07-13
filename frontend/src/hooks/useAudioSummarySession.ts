import { useState } from "react";
import { AudioSummarySession, saveSession, getSession } from "../services/mockApi";

export function useAudioSummarySession() {
  const [session, setSession] = useState<AudioSummarySession | null>(getSession());

  const save = (audioFileName: string, prompt: string, step: number) => {
    const newSession = saveSession({ audioFileName, prompt, step });
    setSession(newSession);
    return newSession;
  };

  return {
    session,
    save,
  };
}
