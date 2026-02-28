# Chatbot Context Duplication, Action Confusion & Failure Rate

## Original Problems

1. **Action confusion**: The LLM re-proposes actions or answers questions never asked
2. **Context explosion**: Even a one-liner Q&A increases context by 20k+ tokens per turn
3. **30-50% failure rate**: Generic "Chat provider error" with no useful diagnostics

**Root cause**: The backend flattens the entire message history into a single user prompt string instead of using pydantic-ai's native `message_history` parameter. This causes the LLM to see all prior turns (including old action proposals) as one blob, and combined with the large system prompt (knowledge base, action registry, transcript), quickly overflows context windows.

---

## What Was Attempted

### Attempt 1: Use pydantic-ai's native `message_history`

**Approach**: Replace the manual history flattening with proper multi-turn conversation using pydantic-ai's `message_history` parameter:
- `_build_message_history()` converts `ChatMessage` list to `ModelMessage` objects (`ModelRequest` with `UserPromptPart` for user, `ModelResponse` with `TextPart` for assistant)
- Pass all messages except the last as `message_history` to `agent.run_stream()`
- Pass only the last user message as `user_prompt`
- Agent created with `system_prompt` parameter as before

**Result**: **Actions completely stopped working.** The LLM stopped producing ` ```action ` code blocks entirely. Instead it would output text like "Switching you to dark mode! 🌙" without any action block — the action confirmation UI never appeared and no action was executed.

**Diagnosis**: pydantic-ai appears to attach the Agent's `system_prompt` (as `instructions`) to the **new** `ModelRequest` it creates for the current turn, which is placed **after** all `message_history` entries. This means the model sees:
```
user: "previous message"        ← from history
assistant: "previous response"  ← from history
system: [long system prompt]    ← placed HERE by pydantic-ai, after history
user: "current message"         ← new request
```
Models follow system instructions much less reliably when the system message appears after user/assistant turns rather than at the beginning.

### Attempt 2: Embed system prompt in first history message

**Approach**: Instead of using Agent's `system_prompt`, manually set `instructions=system_prompt` on the first `ModelRequest` in the message history. Create the Agent without `system_prompt` for multi-turn (to avoid duplication). For first message (no history), keep Agent with `system_prompt`.

**Result**: **First message works, subsequent messages don't.** The first action (e.g., speaker count) produced a proper action block with confirmation UI. But all subsequent actions (light mode, dark mode) responded with text only — no action blocks.

**Diagnosis**: pydantic-ai likely ignores or doesn't forward the `instructions` field from manually-constructed `ModelRequest` objects in the `message_history`. Only the Agent's own system_prompt mechanism is forwarded to the model. So when creating `Agent(model, model_settings=...)` without `system_prompt`, the model receives no system instructions at all for multi-turn requests.

### Attempt 3: Revert to flattened history + frontend improvements

**Approach**: Reverted backend to original flattened history approach (proven to produce action blocks reliably). Kept frontend improvements:
- Strip ` ```action ` blocks from assistant messages in `apiMessages` before sending to backend
- Attach action status context (`[The "change_theme" action was applied successfully]`) to the **next user message** instead of the assistant message
- Better error detection (413 for context overflow)
- Removed dead `confirmed_action` code

**Result**: **Actions work again, but context explosion is now WORSE than before.** The context window limit is hit after just 3 messages. The frontend now strips action blocks from history but the flattened approach still embeds all history in the user prompt. The action status annotations on user messages add even more text per turn. Combined with the large system prompt (knowledge base + action registry + changelog + app context), the context fills extremely fast.

---

## Current State of the Code

### Files Modified (relative to pre-change baseline)

| File | Current State |
|---|---|
| `backend/service/chatbot/core.py` | Reverted to flattened history approach. `confirmed_action` system prompt section removed. Added action format reinforcement in system prompt. |
| `backend/api/chatbot/router.py` | Added context window overflow error detection (HTTP 413). |
| `backend/models/chatbot.py` | `confirmed_action` field removed from `ChatRequest`. |
| `frontend/src/hooks/useChatbot.ts` | `stripActionBlock()` helper added. `apiMessages` strips action blocks from assistant messages and attaches action status to next user message. |
| `frontend/src/lib/types.ts` | `confirmed_action` removed from `ChatRequest` interface. |

### Changes That Are Working Well
- **Action block stripping** (frontend): Prevents old action JSON from leaking into history sent to backend
- **Action status on user messages** (frontend): Gives LLM context about action outcomes without it mimicking the pattern
- **Context overflow error detection** (backend): Returns actionable 413 error instead of generic 502
- **Dead code removal**: `confirmed_action` field and prompt section removed cleanly
- **System prompt reinforcement**: Instructions to always use ` ```action ` format and never write status markers

### The Core Unsolved Problem
The flattened history approach duplicates all previous messages inside the user prompt on every turn. With the system prompt being ~15-20k tokens (knowledge base + action registry + changelog + app context + transcript), the context fills up after just a few exchanges. pydantic-ai's `message_history` would solve this but breaks action block generation due to system prompt placement issues.

---

## Key Constraints Discovered

1. **pydantic-ai `message_history` + `system_prompt`**: The system prompt ends up after history messages, not at the beginning. This causes models to ignore action block format instructions.
2. **pydantic-ai `message_history` + manual `instructions`**: Setting `instructions` on manually-constructed `ModelRequest` objects in message_history does NOT forward the system prompt to the model.
3. **Flattened history**: Works for actions but duplicates all history in every request, causing rapid context exhaustion.
4. **Action status in assistant messages**: LLM mimics the pattern (e.g., outputs `[Action applied: change_theme]` as text instead of using ` ```action ` blocks). Must be on user messages instead.
