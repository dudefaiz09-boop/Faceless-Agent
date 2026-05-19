# AI Provider Setup

EduConnect keeps free and offline AI behavior by default.

Fallback order:

1. OpenRouter free models when `OPENROUTER_API_KEY` is configured.
2. Gemini when `GEMINI_API_KEY` is configured.
3. Offline deterministic provider when no live provider is available.

OpenRouter:

- `OPENROUTER_API_KEY`
- optional `OPENROUTER_MODEL`
- only the approved free model list is accepted

Gemini:

- `GEMINI_API_KEY`
- optional `GEMINI_MODEL`, default `gemini-2.5-flash`

Status endpoint:

`GET /api/ai/status`

The endpoint reports enabled state, active provider, model, key presence flags, free-model enforcement, and check time. Do not send unnecessary student PII to external AI providers; summarize records into the smallest useful context.
