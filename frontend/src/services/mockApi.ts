// Simple in-memory mock API store for frontend development

export interface AudioSummarySession {
  id: string;
  audioFileName: string;
  prompt: string;
  step: number;
}

let session: AudioSummarySession | null = null;

export function saveSession(data: Omit<AudioSummarySession, "id">): AudioSummarySession {
  session = {
    id: Math.random().toString(36).substr(2, 9),
    ...data,
  };
  return session;
}

export function getSession(): AudioSummarySession | null {
  return session;
}
