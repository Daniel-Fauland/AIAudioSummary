# Story 05: Frontend Realtime Session Hook

## Summary

Create the `useRealtimeSession` hook that manages the entire realtime session lifecycle: WebSocket connection, audio capture via AudioWorklet, transcript state, and the periodic summary timer.

## Why

This hook encapsulates all the complex stateful logic for the realtime feature — WebSocket lifecycle, microphone access, audio processing, transcript accumulation, and timed summary triggers. Isolating this in a hook keeps the UI components clean and testable.

## Depends On

- [Story 02: Backend WebSocket Relay](./02_backend_websocket_relay.md) (WebSocket endpoint must exist)
- [Story 04: Frontend Types, API Client & AudioWorklet](./04_frontend_types_api_worklet.md) (types, API client, and worklet must exist)

---

## Scope

### New Files

**`frontend/src/hooks/useRealtimeSession.ts`**

**State exposed:**
- `connectionStatus: RealtimeConnectionStatus`
- `sessionId: string | null`
- `accumulatedTranscript: string` — all finalized transcript text
- `currentPartial: string` — in-progress (unfinished) words
- `realtimeSummary: string` — latest summary text
- `summaryUpdatedAt: string | null` — ISO timestamp of last summary update
- `isSummaryUpdating: boolean` — true while a summary API call is in flight
- `summaryInterval: SummaryInterval` — current interval setting (default: 2)
- `isPaused: boolean`
- `elapsedTime: number` — seconds since session start
- `isSessionEnded: boolean` — true after stop, before starting a new session

**Refs (internal):**
- `wsRef` — WebSocket instance
- `audioContextRef` — AudioContext
- `workletNodeRef` — AudioWorkletNode
- `streamRef` — MediaStream (from getUserMedia)
- `summaryTimerRef` — setInterval ID
- `summaryCountRef` — tracks number of summary calls (for full recompute every 10th)
- `lastSummaryTranscriptLenRef` — tracks transcript length at last summary (to detect new content)
- `llmConfigRef` — ref to current LLM config (avoids stale closures in timer)

**Functions exposed:**
- `startSession(assemblyAiKey: string, deviceId?: string)` — Full startup sequence:
  1. Get microphone stream via `navigator.mediaDevices.getUserMedia()` (with optional `deviceId`)
  2. Create `AudioContext` (sample rate 48kHz or device default)
  3. Load AudioWorklet from `/pcm-worklet-processor.js`
  4. Create `AudioWorkletNode`, connect mic stream → worklet
  5. On worklet `message`: send binary frame over WebSocket
  6. Open WebSocket to `NEXT_PUBLIC_BACKEND_WS_URL/ws/realtime`
  7. Send JSON init: `{api_key, session_id}` (generate UUID for session_id)
  8. On WS message: parse `RealtimeWsMessage`, update transcript state
  9. Start elapsed time counter (1s interval)
  10. Start summary timer

- `pauseSession()` — Pause mic stream tracks (stop sending audio; AAI detects silence)
- `resumeSession()` — Resume mic stream tracks
- `stopSession()` — Send `{type: "stop"}` to WS → close WS → stop all timers → cleanup audio resources → trigger final full-transcript summary
- `setSummaryInterval(interval: SummaryInterval)` — Update interval, clear and restart timer
- `setLlmConfig(config)` — Update the LLM config ref (called by parent when settings change)
- `resetSession()` — Clear all state for a fresh start

**Summary timer logic:**
- `setInterval` at `summaryInterval * 60 * 1000` ms
- Guard: skip if `isSummaryUpdating` is true (previous call still in flight)
- Guard: skip if no new transcript since last summary (`accumulatedTranscript.length === lastSummaryTranscriptLenRef`)
- Every 10th call (`summaryCountRef % 10 === 0`): set `is_full_recompute: true` for consistency
- On failure: retry once after 5 seconds, then skip until next interval
- Call `createIncrementalSummary()` from `api.ts`

**Cleanup:**
- `useEffect` cleanup: close WebSocket, stop media stream, clear timers on unmount

---

## Acceptance Criteria

- [ ] Hook manages WebSocket connection lifecycle (connect, message handling, close)
- [ ] Audio is captured from microphone via AudioWorklet and sent as binary WS frames
- [ ] Transcript state accumulates final text and tracks current partial
- [ ] Summary timer fires at the configured interval
- [ ] Summary skips when no new transcript content exists
- [ ] Every 10th summary triggers a full recompute
- [ ] Pause/resume stops and restarts audio capture
- [ ] Stop triggers final summary with full transcript
- [ ] All resources (WS, AudioContext, MediaStream, timers) are cleaned up on stop and unmount
- [ ] Elapsed time counter ticks every second while session is active
- [ ] Connection status updates reflect actual state (connecting, connected, error, etc.)

## Verification

- Start a realtime session in the browser
- Verify WebSocket connects (check browser Network tab → WS)
- Speak into microphone — verify transcript state updates in React DevTools
- Verify summary timer fires after configured interval
- Stop session — verify all resources are released (no audio activity, WS closed)
