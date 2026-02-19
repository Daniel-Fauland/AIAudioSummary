# Story 02: Backend WebSocket Relay

## Summary

Create the WebSocket endpoint and service that relays audio from the browser to AssemblyAI's streaming API and forwards transcript events back to the browser.

## Why

This is the core backend infrastructure for realtime transcription. The browser sends PCM audio frames over WebSocket; the backend relays them to AssemblyAI and streams transcript events back.

## Depends On

- [Story 01: Backend Models & Session Manager](./01_backend_models_and_session.md)

---

## Scope

### Dependencies

- Add `websockets` to `backend/pyproject.toml`

### New Files

**`backend/api/realtime/__init__.py`** — Empty init file

**`backend/service/realtime/core.py`** — `RealtimeTranscriptionService`
- Uses the `websockets` library for raw WebSocket connections to AssemblyAI
- EU endpoint: `wss://streaming.eu.assemblyai.com/v3/ws`
- Connection params sent as query string: `sample_rate=16000`, `encoding=pcm_s16le`, `speech_model=universal-streaming-multi`, `format_turns=true`
- Auth via `Authorization` header with the user's AssemblyAI API key
- Methods:
  - `async connect(api_key: str, sample_rate: int = 16000) -> websockets.WebSocketClientProtocol` — opens connection to AAI
  - `async send_audio(ws, data: bytes) -> None` — forwards binary audio frame
  - `async terminate(ws) -> None` — sends terminate message and closes connection

**`backend/api/realtime/router.py`** — WebSocket endpoint `/ws/realtime`
1. Accept browser WebSocket connection
2. Receive JSON init message with `api_key` and `session_id`
3. Create session via `SessionManager`
4. Connect to AssemblyAI WS with auth header
5. Send `{type: "session_started", session_id}` back to browser
6. Run two concurrent async tasks:
   - **browser → AAI:** receive binary frames from browser, forward to AAI
   - **AAI → browser:** receive JSON events from AAI, parse `TurnEvent` transcripts, update session state, forward structured JSON to browser
7. On stop message or disconnect: terminate AAI WS, cleanup session
8. Auto-reconnect: if AAI disconnects unexpectedly, attempt reconnect up to 3 times with exponential backoff (1s, 2s, 4s), notify browser of reconnection status

**Message types from backend → browser:**
- `{type: "session_started", session_id: string}`
- `{type: "turn", transcript: string, is_final: boolean}` — `is_final=true` for completed turns, `false` for partials
- `{type: "error", message: string}`
- `{type: "reconnecting", attempt: number}`
- `{type: "session_ended"}`

### Modified Files

**`backend/main.py`**
- Import and register `realtime_router` with `tags=["Realtime"]`

**`backend/pyproject.toml`**
- Add `websockets` dependency

---

## Acceptance Criteria

- [ ] `websockets` dependency is added to `pyproject.toml`
- [ ] WebSocket endpoint accepts connections at `/ws/realtime`
- [ ] Binary audio frames are relayed from browser to AssemblyAI
- [ ] Transcript events (turn events) are forwarded back to the browser as structured JSON
- [ ] Session state is updated with final text and partial text
- [ ] Graceful cleanup on disconnect (AAI WS closed, session removed)
- [ ] Auto-reconnect attempts on unexpected AAI disconnect (up to 3 retries)
- [ ] Error messages are sent to browser on failure (invalid API key, connection failure)
- [ ] Router is registered in `main.py`
- [ ] Backend starts without errors

## Verification

- Start backend, connect with a WS test client (e.g., `websocat` or Python script)
- Send init JSON message with a valid AssemblyAI key
- Send binary audio frames (PCM16, 16kHz)
- Verify transcript events come back as JSON
- Test with invalid API key — expect error message
