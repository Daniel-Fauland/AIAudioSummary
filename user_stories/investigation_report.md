# Production Investigation Report: 502 Errors & Streaming Failures

**Date:** 2026-02-27
**Stack:** nginx → Next.js (port 3000) → FastAPI/uvicorn (port 8080) → LLM providers

---

## Issue 1: Chatbot 502 Bad Gateway from nginx

### Symptoms

- Browser receives `502 Bad Gateway` from nginx when using the chatbot
- nginx error log: `upstream prematurely closed connection while reading response header from upstream`
- Backend logs show **zero errors** — completely silent failure
- Frontend logs: `Error: failed to pipe response` → `SocketError: other side closed`

### Root Cause

The streaming architecture had a **silent failure pattern**:

1. `POST /chatbot/chat` hits the backend
2. The router calls `service.chat(request)` which returns an async generator (no execution yet)
3. `StreamingResponse(generator, media_type="text/plain")` immediately sends **200 OK + headers**
4. FastAPI starts iterating the generator → `agent.run_stream()` connects to the LLM provider
5. If the LLM call fails (bad API key, model not found, etc.), the exception occurs **inside the async generator**, which is **outside** the router's `try/except` block
6. The backend silently closes the socket — no error logged, no error response
7. Frontend proxy sees `SocketError: other side closed` → crashes → nginx returns 502

### Fix: Eager First-Chunk Fetching (`backend/api/chatbot/router.py`, `backend/api/llm/router.py`)

Before returning `StreamingResponse`, eagerly `await` the first chunk from the generator. This forces the LLM connection to be established **before** committing to a 200 response:

```python
gen = result.__aiter__()
try:
    first_chunk = await gen.__anext__()
except StopAsyncIteration:
    return StreamingResponse(iter([]), media_type="text/plain")

async def _with_first():
    yield first_chunk
    async for chunk in gen:
        yield chunk

return StreamingResponse(_with_first(), media_type="text/plain")
```

If the first chunk fails, the exception propagates to the router's existing `except Exception` block, which returns a proper HTTP error (`401 Invalid API key`, `400 Model not found`, `502 Chat provider error`).

**Files changed:**

- `backend/api/chatbot/router.py` — eager first-chunk for `/chatbot/chat`
- `backend/api/llm/router.py` — eager first-chunk for `/createSummary`

---

## Issue 2: Mid-Stream Failures ("network error" in browser)

### Symptoms

- After the first-chunk fix, some requests still failed
- nginx error changed from `while reading response header` → `while reading upstream` (headers now sent, but stream breaks mid-way)
- Browser shows "network error" instead of a proper error message
- Frontend logs: `failed to pipe response` with `bytesRead: 90766` (significant data streamed before failure)

### Root Cause

When a streaming generator **raises an exception** (even during normal cleanup), FastAPI/uvicorn **aborts** the HTTP response without properly terminating the chunked transfer encoding (`0\r\n\r\n` terminator never sent). nginx sees the connection drop and returns 502. The browser's `fetch()` fails with a raw "network error".

### Fix: STREAM_ERROR Marker Protocol (`backend/service/chatbot/core.py`, `backend/service/llm/core.py`, `frontend/src/lib/api.ts`)

**Backend:** Instead of re-raising exceptions in the generator (which kills the HTTP connection), yield a `<!--STREAM_ERROR:message-->` marker and let the generator end gracefully:

```python
async def _stream_response(self, agent, user_prompt):
    has_yielded = False
    try:
        async with agent.run_stream(user_prompt) as stream:
            async for chunk in stream.stream_text(delta=True):
                has_yielded = True
                yield chunk
    except Exception as e:
        if has_yielded:
            # Mid-stream: yield marker (don't raise — it kills the connection)
            yield f"\n\n<!--STREAM_ERROR:{e}-->"
        else:
            # Initial error: re-raise for proper HTTP error response
            raise
```

**Frontend:** After stream completion, check for the error marker:

```typescript
const STREAM_ERROR_RE = /\n?\n?<!--STREAM_ERROR:(.+?)-->$/;

// After reading all chunks...
const errorMatch = fullText.match(STREAM_ERROR_RE);
if (errorMatch) {
  throw new ApiError(502, errorMatch[1]);
}
```

**Files changed:**

- `backend/service/chatbot/core.py` — error marker in chatbot streaming
- `backend/service/llm/core.py` — error marker in LLM summary streaming
- `frontend/src/lib/api.ts` — `STREAM_ERROR_RE` detection in both `chatbotChat()` and `createSummary()`

---

## Issue 3: "Attempted to exit cancel scope in a different task"

### Symptoms

- After successful streaming, the chatbot displayed: `<!--STREAM_ERROR:Attempted to exit cancel scope in a different task than it was entered in-->`
- The actual LLM response was complete and correct — the error occurred during cleanup

### Root Cause

Known pydantic-ai/anyio bug ([GitHub Issue #2818](https://github.com/pydantic/pydantic-ai/issues/2818)). When the `async with agent.run_stream()` context manager exits, anyio's `TaskGroup`/`CancelScope` cleanup detects that `__aexit__` is running in a different async task context than `__aenter__`. This is a non-critical cleanup error — all data was already streamed.

### Fix: Suppress Cancel Scope RuntimeError (`backend/service/chatbot/core.py`, `backend/service/llm/core.py`)

Added a specific `RuntimeError` handler that silently returns when the cancel scope error occurs after all data has been yielded:

```python
except RuntimeError as e:
    if "cancel scope" in str(e) and has_yielded:
        # Known pydantic-ai/anyio cleanup issue — safe to ignore
        return
    # ... handle other RuntimeErrors normally
```

**Files changed:**

- `backend/service/chatbot/core.py`
- `backend/service/llm/core.py`

---

## Issue 4: Langdock GPT 5.2 API Calls Failing

### Symptoms

- All Langdock OpenAI-compatible model calls (GPT 5.2, etc.) started failing
- Worked fine until ~2 days prior
- Langdock API key and docs confirmed valid

### Root Cause

pydantic-ai 1.59.0's `OpenAIChatModel` sends `stream_options: {include_usage: true}` on **all** OpenAI streaming requests (hardcoded in `_get_stream_options()`). Langdock's API explicitly [does not support `stream_options`](https://docs.langdock.com/api-endpoints/completion/openai) — it's listed as an unsupported parameter. There is no model setting in pydantic-ai to disable it.

### Fix: LangdockOpenAIChatModel Subclass (`backend/service/llm/core.py`)

Created a subclass that suppresses `stream_options`:

```python
from openai._types import NOT_GIVEN
from pydantic_ai.models.openai import OpenAIChatModel, OpenAIChatModelSettings

class LangdockOpenAIChatModel(OpenAIChatModel):
    """OpenAI-compatible model for Langdock that suppresses unsupported stream_options."""

    def _get_stream_options(self, model_settings: OpenAIChatModelSettings):
        return NOT_GIVEN
```

Updated the Langdock provider branch in `_create_model()` to use `LangdockOpenAIChatModel` instead of `OpenAIChatModel` for non-Claude, non-Gemini models.

**Files changed:**

- `backend/service/llm/core.py` — new subclass + updated `_create_model()` Langdock branch

---

## Architecture: Request Flow & Error Handling Summary

```
Browser
  → nginx (klartextai.com:443, proxy_buffering off)
    → Next.js frontend (port 3000, /api/proxy/[...path]/route.ts)
      → FastAPI backend (port 8080, StreamingResponse)
        → LLM Provider (OpenAI/Anthropic/Gemini/Langdock)
```

### Error handling layers (after fixes):

| Error Type                           | Where Caught                             | Response                                      |
| ------------------------------------ | ---------------------------------------- | --------------------------------------------- |
| Auth/model errors (before streaming) | Router `except` via eager first-chunk    | Proper HTTP 401/400/502 with JSON body        |
| Mid-stream LLM errors                | Generator `except` → STREAM_ERROR marker | Frontend detects marker → shows error message |
| Cancel scope cleanup error           | Generator `RuntimeError` handler         | Silently suppressed (data already sent)       |
| Langdock stream_options rejection    | Prevented by `LangdockOpenAIChatModel`   | `stream_options` never sent to Langdock       |

### Commits

1. `f169fbf` — Fix 502 errors on chatbot/summary streaming by eagerly fetching first chunk
2. `caab07e` — Fix mid-stream failures causing nginx 502 / network errors
3. `47ba2f6` — Fix error marker to only apply for mid-stream errors
4. `e7be992` — Fix cancel scope cleanup error and Langdock streaming incompatibility
