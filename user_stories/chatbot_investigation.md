# Chatbot Context Bug — Investigation & Fix Report

## Original Problems (from chatbot-context-bug.md)

1. **Action confusion**: LLM re-proposes actions or answers questions never asked
2. **Context explosion**: Even a one-liner Q&A increases context by 20k+ tokens per turn
3. **30-50% failure rate**: Generic "Chat provider error" with no useful diagnostics

---

## Root Causes Found

### 1. History duplication (backend)
The backend flattened all message history into a single user prompt string instead of using pydantic-ai's native `message_history`. This meant every previous message was re-sent as part of the user prompt text on every request.

### 2. Misleading token counter (frontend)
The `TokenUsageBadge` displayed **cumulative session tokens** (sum of ALL requests) against the model's **per-request context window** (e.g. 200k). After 5 messages it showed "122k / 200k" — making it look like the context window was almost full, when each individual request only used ~24k/200k (~12%).

### 3. Overly broad error matching (backend)
The chatbot router's error handler matched `"token" in error_msg` — any exception containing the word "token" (rate limits, auth errors, streaming errors) was misclassified as "Message too long for model context window."

---

## Fixes Applied

### Fix 1: Proper multi-turn conversation with `message_history` + `instructions`
**File**: `backend/service/chatbot/core.py`

- **Changed** `Agent(model, system_prompt=...)` → `Agent(model, instructions=...)`
- **Added** `_build_message_history()` that converts `ChatMessage` list to proper pydantic-ai `ModelRequest`/`ModelResponse` objects
- **Pass** `message_history` to `agent.run_stream()` and `agent.run()`

**Why `instructions` instead of `system_prompt`**:
- `system_prompt` creates `SystemPromptPart` in the first request's parts — pydantic-ai **skips** generating it when `message_history` is provided (assumes history already has one)
- `instructions` is set on the `ModelRequest.instructions` field — pydantic-ai **always** includes it regardless of history
- Provider adapters (OpenAI, Anthropic) extract `instructions` via `_get_instructions()` and insert them as the system message **at position 0** (before all history messages)

**Result**: System prompt is always at the beginning, history is properly structured, no duplication.

### Fix 2: Per-request token display
**Files**: `frontend/src/components/ui/TokenUsageBadge.tsx`, `frontend/src/hooks/useChatbot.ts`, `frontend/src/components/chatbot/ChatbotModal.tsx`, `frontend/src/app/page.tsx`

- Added `lastRequestUsage` state to `useChatbot` hook (tracks per-request usage separately from cumulative `sessionUsage`)
- `TokenUsageBadge` now shows **last request's input tokens vs context window** in the badge label
- Tooltip shows both per-request breakdown and cumulative session total
- Badge correctly shows ~24k/200k consistently across all messages (not growing)

### Fix 3: Tightened error handler + rate limit detection
**File**: `backend/api/chatbot/router.py`

- **Removed** broad `"token" in error_msg` match that caused false positives
- **Replaced** with specific patterns: `"context_length"`, `"context window"`, `"too long"`, `"max_tokens"`, `"maximum context length"`, `"token limit"`
- **Added** 429 rate limit detection: `"rate limit"`, `"rate_limit"`, `"tokens per minute"`, `"429"`
- **Added** `print()` logging for all chatbot errors (the `logger.error()` was not producing visible output in Docker)

---

## Token Flow (verified with diagnostics)

The system prompt is **constant at ~24k tokens** per request (100k chars). It contains:
- Knowledge base (usage_guide.md): ~78k chars / ~20k tokens (79% of total)
- Actions registry JSON: ~9k chars / ~2.3k tokens
- Changelog: ~9k chars / ~2.3k tokens
- App context, transcript, constraints: ~4k chars / ~1k tokens

Per-request token usage:
```
Turn 1:  system(24k) + user(tiny)           = ~24k input
Turn 2:  system(24k) + history(~0.2k) + user = ~24.2k input
Turn 5:  system(24k) + history(~1k) + user   = ~25k input
Turn 11: system(24k) + history(~2k) + user   = ~26k input
```

Each request uses ~12-13% of the 200k context window. History grows by only ~200 tokens per turn.

---

## Test Results

11 consecutive messages (6 actions + 5 questions) all succeeded:
- Token badge stayed at 24-25k / 200k throughout
- Actions produced proper `\`\`\`action` code blocks with confirmation UI
- Auto-confirm (! prefix) worked correctly
- No false "Message too long" errors
- Rate limit errors (429) now correctly identified instead of misclassified as context overflow

---

## Remaining Considerations

- **Knowledge base is 79% of per-request cost**: If further token reduction is desired, the 78k-char usage_guide.md could be condensed or made conditional (only include on first message, or only when QA toggle is on)
- **Prompt caching**: Anthropic and OpenAI support prompt caching for repeated system prompts — could reduce cost for subsequent requests without code changes
- **Logger visibility**: `logger.error()` / `logger.warning()` don't produce visible output in Docker logs for this project. The `print(flush=True)` workaround is used for the error handler. Worth investigating the logging config.
