# Story 03: Backend Incremental Summary Endpoint

## Summary

Add the `POST /createIncrementalSummary` HTTP endpoint that generates or updates a summary from a realtime transcript, reusing the existing LLM service infrastructure.

## Why

The realtime mode needs periodic summary generation. Unlike the existing streaming `/createSummary`, this endpoint returns a complete (non-streaming) response and supports incremental updates where only new transcript content is summarized and merged with the previous summary.

## Depends On

- [Story 01: Backend Models & Session Manager](./01_backend_models_and_session.md)

---

## Scope

### Modified Files

**`backend/api/realtime/router.py`** — Add HTTP endpoint alongside the WebSocket endpoint

`POST /createIncrementalSummary`:
1. Accept `IncrementalSummaryRequest` body
2. Reuse `LLMService._create_model()` to create the provider-specific model
3. Reuse `LLMService.build_prompt()` to construct the system prompt with language/date instructions
4. Summary logic:
   - If `is_full_recompute` is `True` OR `previous_summary` is `None`: summarize the entire `full_transcript`
   - Otherwise: build a user prompt like:
     ```
     Previous Summary:
     {previous_summary}

     New Transcript:
     {new_transcript_chunk}

     Update the summary to incorporate the new information. Maintain the same format and structure.
     ```
5. Use `temperature=0.2` (lower than standard 0.5 for consistency)
6. Non-streaming: use `agent.run()` instead of `agent.run_stream()`
7. Return `IncrementalSummaryResponse` with `summary` text and `updated_at` ISO timestamp
8. Same error handling pattern as existing LLM router:
   - 401 for auth/API key errors
   - 400 for model not found
   - 502 for provider errors

**`backend/service/llm/core.py`** (optional refactor)
- If `_create_model()` or `build_prompt()` are private methods that need to be accessed from the realtime router, either:
  - Make them public (preferred — just remove the underscore)
  - Or instantiate `LLMService` in the realtime router and call through it

---

## Acceptance Criteria

- [ ] `POST /createIncrementalSummary` endpoint is accessible
- [ ] Full recompute mode: summarizes the entire transcript when `is_full_recompute=True` or `previous_summary` is None
- [ ] Incremental mode: updates existing summary with new transcript chunk
- [ ] Uses `temperature=0.2` for consistent output
- [ ] Returns `IncrementalSummaryResponse` with `summary` and `updated_at` (ISO timestamp)
- [ ] Error handling matches existing LLM router pattern (401, 400, 502)
- [ ] Works with all supported providers (OpenAI, Anthropic, Gemini, Azure OpenAI)
- [ ] Endpoint appears in Swagger docs at `/docs` under "Realtime" tag

## Verification

```bash
# Test with curl (example with OpenAI)
curl -X POST http://localhost:8080/createIncrementalSummary \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "openai",
    "api_key": "sk-...",
    "model": "gpt-4o-mini",
    "system_prompt": "You are a meeting summarizer.",
    "full_transcript": "Hello everyone, today we are discussing the Q4 roadmap...",
    "is_full_recompute": true,
    "target_language": "en"
  }'
```
