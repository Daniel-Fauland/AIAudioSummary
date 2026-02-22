# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.
When I say something like "push to git" use git add -A by default to push everything unless explicitly specified differently.
Make sure you always know the codebase if a user asks you a code or feature related question. In this case read [architecture.md](./docs/architecture.md) file.

## Skills

You have a skill various skills available: "backend_dev", "frontend_dev" & "implement_feature". Whenever the user is asking you to implement feature starting with the phrase "Implement Feature:" Make sure to use the skill "implement_feature". This skill will under the hood use "backend_dev" and/or "frontend_dev" based on the feature to implement.

## Project Overview

AIAudioSummary is a web app for uploading audio files (meeting recordings) and generating transcripts + AI-powered summaries. It uses AssemblyAI for speech-to-text and multi-provider LLM support (OpenAI, Anthropic, Google Gemini, Azure OpenAI) via pydantic-ai for summarization, with a Next.js frontend and FastAPI backend.

## Development Commands

```bash
# Run backend (auto-installs Python 3.12+ and deps on first run)
cd backend && uv run main.py        # Starts on http://localhost:8080, hot-reload enabled

# Run frontend (Next.js)
cd frontend && npm run dev           # Starts on http://localhost:3000

# Build frontend
cd frontend && npm run build

# Add backend dependencies
cd backend && uv add <package>

# Add frontend dependencies
cd frontend && npm install <package>

# Add shadcn/ui components
cd frontend && npx shadcn@latest add <component>
```

API docs available at http://localhost:8080/docs when backend is running.

## Architecture

### Backend (`backend/`) — FastAPI

Three-layer architecture: **Router → Service → External API**

- **Routers** (`api/`): HTTP endpoint definitions, organized by domain
  - `assemblyai/router.py` — `POST /createTranscript` (audio file upload + transcription, AssemblyAI key via `X-AssemblyAI-Key` header)
  - `llm/router.py` — `POST /createSummary` (multi-provider summary generation, supports streaming via `StreamingResponse`)
  - `misc/router.py` — `GET /getConfig`, `POST /getSpeakers`, `POST /updateSpeakers`
- **Services** (`service/`): Business logic and external API integration
  - `assembly_ai/core.py` — `AssemblyAIService`: saves uploaded file to temp, calls AssemblyAI SDK, cleans up
  - `llm/core.py` — `LLMService`: multi-provider LLM support via pydantic-ai (OpenAI, Anthropic, Gemini, Azure OpenAI)
  - `misc/core.py` — `MiscService`: speaker detection via regex, timezone-aware date handling
- **Models** (`models/`): Pydantic models for request/response validation
  - `llm.py` — `LLMProvider` enum, `CreateSummaryRequest/Response`, `AzureConfig`
  - `config.py` — `ConfigResponse`, `ProviderInfo`, `PromptTemplate`, `LanguageOption`, speaker models
- **Config** (`config.py`): Pydantic `BaseSettings` loaded from `.env`, validates on startup
- **Prompt Templates** (`prompt_templates/`): Markdown files served via `/getConfig`

### Frontend (`frontend/`) — Next.js 15 + shadcn/ui

Single-page app (SPA) with App Router. Dark-mode only. 3-step workflow: Upload → Transcript → Summary.

- **App** (`src/app/`):
  - `layout.tsx` — Root layout with Inter font, Toaster, dark theme
  - `page.tsx` — Main orchestrator: state management, step transitions, API call handlers
- **Components** (`src/components/`):
  - `layout/` — `Header`, `StepIndicator`, `SettingsSheet`
  - `settings/` — `ApiKeyManager`, `ProviderSelector`, `ModelSelector`, `AzureConfigForm`
  - `workflow/` — `FileUpload`, `TranscriptView`, `SpeakerMapper`, `PromptEditor`, `SummaryView`
  - `ui/` — shadcn/ui primitives (button, card, input, select, sheet, etc.)
- **Hooks** (`src/hooks/`):
  - `useApiKeys.ts` — localStorage API key management (prefix: `aias:v1:`)
  - `useConfig.ts` — Backend config fetching/caching
- **Lib** (`src/lib/`):
  - `types.ts` — TypeScript types mirroring backend Pydantic models
  - `api.ts` — Centralized API client with streaming support
  - `utils.ts` — shadcn/ui utility

## Configuration

Backend `.env` (copy from `.env.example`):

- `PROMPT_TEMPLATE_DIRECTORY` — path to prompt templates (default: `"./prompt_templates"`)

Frontend `.env.local` (copy from `.env.local.example`):

- `NEXT_PUBLIC_API_URL` — Backend API URL (default: `http://localhost:8080`)

API keys are provided per-request from the frontend UI (stored in browser localStorage), not in backend config.

## Key Patterns

- **Backend package manager**: uv (not pip/conda). Uses `uv run` as the entrypoint.
- **Frontend package manager**: npm. Uses `npm run dev` / `npm run build`.
- **API endpoint naming**: camelCase paths (`/createTranscript`, `/createSummary`, `/getSpeakers`)
- **BYOK (Bring Your Own Key)**: API keys stored in browser localStorage, sent per-request via headers/body
- **Async throughout**: all router handlers and service methods are `async def`
- **Streaming**: summary generation supports streaming via `ReadableStream` on frontend, `StreamingResponse` on backend
- **Temp file cleanup**: transcription router uses try/finally to ensure temp files are deleted
- **Language support**: English, German, French, Spanish. German has formal/informal toggle affecting pronoun usage in prompts.
- **Dark mode only**: Frontend uses custom dark theme with accent color `#FC520B`
- **Component library**: shadcn/ui components in `frontend/src/components/ui/`
