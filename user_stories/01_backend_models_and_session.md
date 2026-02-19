# Story 01: Backend Models & Session Manager

## Summary

Create the Pydantic models for realtime requests/responses and the in-memory session manager that tracks active realtime transcription sessions.

## Why

All subsequent backend stories (WebSocket relay, incremental summary) depend on these foundational data structures. The session manager provides shared state between the WebSocket handler and the summary endpoint.

---

## Scope

### New Files

**`backend/models/realtime.py`**
- `IncrementalSummaryRequest` — Pydantic `BaseModel` with fields:
  - `provider: LLMProvider`
  - `api_key: str` (min_length=1)
  - `model: str` (min_length=1)
  - `azure_config: AzureConfig | None = None`
  - `system_prompt: str` (min_length=1)
  - `full_transcript: str` (min_length=1)
  - `previous_summary: str | None = None`
  - `new_transcript_chunk: str | None = None`
  - `is_full_recompute: bool = False`
  - `target_language: str = "en"`
  - `informal_german: bool = False`
  - `date: str | None = None`
  - `author: str | None = None`
- `IncrementalSummaryResponse` — `summary: str`, `updated_at: str` (ISO timestamp)
- Add `@model_validator` for Azure config (same pattern as `CreateSummaryRequest` in `models/llm.py`)

**`backend/service/realtime/__init__.py`** — Empty init file

**`backend/service/realtime/session.py`**
- `SessionState` dataclass with fields:
  - `session_id: str`
  - `accumulated_transcript: str` (default `""`)
  - `current_partial: str` (default `""`)
  - `created_at: datetime`
  - `last_activity: datetime`
- `SessionManager` class:
  - `_sessions: dict[str, SessionState]` (private)
  - `_lock: asyncio.Lock` (private)
  - `async create_session(session_id: str) -> SessionState`
  - `async get_session(session_id: str) -> SessionState | None`
  - `async append_final_text(session_id: str, text: str) -> None`
  - `async update_partial(session_id: str, text: str) -> None`
  - `async remove_session(session_id: str) -> None`
  - `async cleanup_stale_sessions(max_age_hours: int = 4) -> None` — removes sessions older than `max_age_hours`

---

## Acceptance Criteria

- [ ] `IncrementalSummaryRequest` validates required fields and Azure config constraint
- [ ] `IncrementalSummaryResponse` has `summary` and `updated_at` fields
- [ ] `SessionManager` can create, get, append to, update partial, and remove sessions
- [ ] `SessionManager` uses asyncio Lock to prevent race conditions
- [ ] Stale session cleanup removes sessions older than the threshold
- [ ] Backend starts without import errors (`cd backend && uv run main.py`)
