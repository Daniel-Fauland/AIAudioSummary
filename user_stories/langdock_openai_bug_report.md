# Langdock OpenAI Proxy Bug Report: `max_completion_tokens` ignored for GPT-5.2

## Summary

When making requests to `https://api.langdock.com/openai/{region}/v1/chat/completions` with model `gpt-5.2`, the Langdock proxy **ignores the `max_completion_tokens` parameter** provided in the request body and instead auto-computes an absurdly large value (~14.4M tokens), which then fails validation against the model's 128K completion token limit.

The same request works correctly when sent directly to OpenAI's API (`api.openai.com`).

## Error

```json
{
  "message": "400 max_tokens is too large: 14393555. This model supports at most 128000 completion tokens, whereas you provided 14393555."
}
```

The value `14393555` is **not** provided by the client. It varies slightly between requests (e.g., 14,395,403 → 14,393,555 → 14,390,407), suggesting Langdock computes it as `total_context_window - prompt_tokens`.

## Reproduction

### Request body sent to Langdock

```json
{
  "model": "gpt-5.2",
  "messages": [
    {"role": "system", "content": "You are a helpful assistant."},
    {"role": "user", "content": "Hello"}
  ],
  "max_completion_tokens": 128000,
  "temperature": 0.3,
  "stream": false
}
```

- `max_completion_tokens: 128000` is **explicitly set** in the request body.
- Langdock **ignores** it and substitutes its own computed value (~14.4M).
- The same request to `api.openai.com` works perfectly.

### Additional finding: `max_tokens` is also rejected

Sending the legacy `max_tokens` parameter (instead of `max_completion_tokens`) results in:

```json
{
  "message": "400 Unsupported parameter: 'max_tokens' is not supported with this model. Use 'max_completion_tokens' instead."
}
```

This confirms Langdock **does** read `max_tokens` from the request body, but rejects it for reasoning models (correct behavior). However, Langdock does **not** read `max_completion_tokens` from the request body (incorrect behavior).

## Expected behavior

Langdock should:

1. Forward the client-provided `max_completion_tokens` to the underlying model, OR
2. If auto-computing a default when the parameter is omitted, cap it at the model's maximum completion token limit (128,000 for GPT-5.2)

## Environment

- Langdock endpoint: `https://api.langdock.com/openai/eu/v1`
- Model: `gpt-5.2`
- Client: OpenAI Python SDK v2.21.0
- Date: 2026-02-27

## Affected models

- `gpt-5.2` (confirmed)
- Potentially all reasoning models (GPT-5.x, o-series) that require `max_completion_tokens` instead of `max_tokens`

## Workaround

None currently known on the client side. The proxy ignores the `max_completion_tokens` parameter regardless of how it's sent.
