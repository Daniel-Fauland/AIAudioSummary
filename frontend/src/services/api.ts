const BASE_BACKEND_URL = "http://localhost:8080";

export async function uploadTempFile(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${BASE_BACKEND_URL}/uploadTempFile`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error("Failed to upload file");
  const data = await res.json();
  return data.file_path;
}

export async function createTranscript(filePath: string): Promise<string> {
  const res = await fetch(`${BASE_BACKEND_URL}/createTranscript?file_path=${encodeURIComponent(filePath)}`);
  if (!res.ok) throw new Error("Failed to create transcript");
  const data = await res.json();
  return data.transcript;
}

export async function getConfig(): Promise<string> {
  const res = await fetch(`${BASE_BACKEND_URL}/getConfig`);
  if (!res.ok) throw new Error("Failed to get config");
  const data = await res.json();
  return data.system_prompt;
}

export async function createSummary(
  { text, system_prompt, stream }: { text: string; system_prompt: string; stream: boolean },
  onData?: (chunk: string) => void
): Promise<string> {
  const res = await fetch(`${BASE_BACKEND_URL}/createSummary`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, system_prompt, stream }),
  });
  if (!res.ok) throw new Error("Failed to create summary");
  if (stream) {
    const reader = res.body?.getReader();
    const decoder = new TextDecoder();
    let result = "";
    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        result += chunk;
        if (onData) onData(chunk);
      }
    }
    return result;
  } else {
    const data = await res.json();
    return data.summary;
  }
}
