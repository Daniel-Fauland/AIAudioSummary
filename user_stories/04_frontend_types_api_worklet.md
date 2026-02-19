# Story 04: Frontend Types, API Client & AudioWorklet

## Summary

Add the TypeScript types for realtime features, the `createIncrementalSummary()` API client function, the PCM AudioWorklet processor, and the WebSocket URL environment variable.

## Why

These are the frontend foundation pieces that the realtime hook and UI components will build on. Types define the data contracts, the API client enables summary calls, and the AudioWorklet handles browser audio capture and conversion to PCM16.

## Depends On

- [Story 03: Backend Incremental Summary Endpoint](./03_backend_incremental_summary.md) (types must match the backend models)

---

## Scope

### New Files

**`frontend/public/pcm-worklet-processor.js`** — AudioWorklet processor
- `AudioWorkletProcessor` subclass named `PCMWorkletProcessor`
- Receives Float32 audio from browser's AudioContext (typically 48kHz)
- Downsamples to 16kHz: simple decimation — take every Nth sample where `N = sampleRate / 16000`
- Converts Float32 [-1, 1] → Int16 PCM: multiply by `0x7FFF`, clamp
- Posts the `Int16Array.buffer` to main thread via `this.port.postMessage()`
- Register with `registerProcessor('pcm-worklet-processor', PCMWorkletProcessor)`

### Modified Files

**`frontend/src/lib/types.ts`** — Add realtime types:
```typescript
// Connection status for the realtime WebSocket
export type RealtimeConnectionStatus = "disconnected" | "connecting" | "connected" | "reconnecting" | "error";

// Summary interval options (in minutes)
export type SummaryInterval = 1 | 2 | 3 | 5 | 10;

// WebSocket messages from backend → browser (discriminated union)
export type RealtimeWsMessage =
  | { type: "session_started"; session_id: string }
  | { type: "turn"; transcript: string; is_final: boolean }
  | { type: "error"; message: string }
  | { type: "reconnecting"; attempt: number }
  | { type: "session_ended" };

// Incremental summary API types
export interface IncrementalSummaryRequest {
  provider: LLMProvider;
  api_key: string;
  model: string;
  azure_config?: AzureConfig;
  system_prompt: string;
  full_transcript: string;
  previous_summary?: string;
  new_transcript_chunk?: string;
  is_full_recompute: boolean;
  target_language: string;
  informal_german: boolean;
  date?: string;
  author?: string;
}

export interface IncrementalSummaryResponse {
  summary: string;
  updated_at: string;
}
```

**`frontend/src/lib/api.ts`** — Add `createIncrementalSummary()`:
- `POST` to `/api/proxy/createIncrementalSummary`
- Accepts `IncrementalSummaryRequest`, returns `IncrementalSummaryResponse`
- Uses the same `handleResponse()` error handling pattern as other API functions
- Non-streaming (regular JSON response)

**`frontend/.env.local.example`** — Add:
```
NEXT_PUBLIC_BACKEND_WS_URL=ws://localhost:8080
```

---

## Acceptance Criteria

- [ ] All realtime TypeScript types are defined in `types.ts`
- [ ] `createIncrementalSummary()` function is added to `api.ts`
- [ ] AudioWorklet processor correctly downsamples and converts to PCM16
- [ ] AudioWorklet registers as `pcm-worklet-processor`
- [ ] `NEXT_PUBLIC_BACKEND_WS_URL` is documented in `.env.local.example`
- [ ] Frontend builds without type errors (`npm run build`)

## Verification

- `npm run build` passes with no errors
- AudioWorklet file is accessible at `/pcm-worklet-processor.js` when dev server runs
