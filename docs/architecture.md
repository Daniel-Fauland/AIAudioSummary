# Architecture Guide

Everything you need to know to implement a new feature or change an existing one.

---

## Table of Contents

- [Project Overview](#project-overview)
- [Tech Stack](#tech-stack)
- [Directory Structure](#directory-structure)
- [Deployment Architecture](#deployment-architecture)
  - [Request Flow](#request-flow)
  - [Authentication (Google OAuth)](#authentication-google-oauth)
  - [API Proxy Layer](#api-proxy-layer)
  - [Route Protection](#route-protection)
  - [Environment Variables](#environment-variables)
- [Backend Architecture](#backend-architecture)
  - [Three-Layer Pattern](#three-layer-pattern)
  - [Adding a New Backend Endpoint](#adding-a-new-backend-endpoint)
  - [Router Conventions](#router-conventions)
  - [Service Layer](#service-layer)
  - [Models (Pydantic Schemas)](#models-pydantic-schemas)
  - [Configuration & Environment](#configuration--environment)
  - [Prompt Template System](#prompt-template-system)
  - [Error Handling](#error-handling)
  - [Streaming Responses](#streaming-responses-backend)
  - [API Key Handling (BYOK)](#api-key-handling-byok)
  - [CORS & Middleware](#cors--middleware)
  - [Logging](#logging)
- [Frontend Architecture](#frontend-architecture)
  - [App Structure](#app-structure)
  - [3-Step Workflow](#3-step-workflow)
  - [Component Hierarchy](#component-hierarchy)
  - [Adding a New Frontend Component](#adding-a-new-frontend-component)
  - [State Management](#state-management)
  - [API Client](#api-client)
  - [Streaming Responses](#streaming-responses-frontend)
  - [localStorage & API Keys](#localstorage--api-keys)
  - [Styling & Theme](#styling--theme)
  - [shadcn/ui Components](#shadcnui-components)
  - [Types](#types)
- [End-to-End Data Flows](#end-to-end-data-flows)
- [Common Tasks](#common-tasks)
- [GCP Setup Guide (Google OAuth)](#gcp-setup-guide-google-oauth)
- [Render Deployment Guide](#render-deployment-guide)

---

## Project Overview

AIAudioSummary is a web app for uploading or recording audio files (meeting recordings) and generating transcripts + AI-powered summaries. It supports two modes:

- **Standard mode**: Upload/record audio → batch transcription → streaming summary generation
- **Realtime mode**: Live microphone capture → streaming transcription via WebSocket → periodic incremental summaries

It uses:

- **AssemblyAI** for speech-to-text (batch SDK + streaming WebSocket API)
- **Multi-provider LLM support** (OpenAI, Anthropic, Google Gemini, Azure OpenAI) via `pydantic-ai` for summarization
- **Next.js 16** frontend with shadcn/ui
- **FastAPI** backend with WebSocket support
- **Google OAuth** (via Auth.js v5) for authentication with email allowlist
- **Render** for deployment (both services on free tier with API proxy)

The key architectural decision is **BYOK (Bring Your Own Key)**: API keys are stored in the browser's localStorage and sent per-request. The backend never stores keys.

---

## Tech Stack

| Layer    | Technology                                     | Package Manager |
| -------- | ---------------------------------------------- | --------------- |
| Backend  | Python 3.12+, FastAPI, pydantic-ai             | uv              |
| Frontend | Next.js 16, React 19, TypeScript 5             | npm             |
| UI       | shadcn/ui, Tailwind CSS v4                     | -               |
| STT      | AssemblyAI SDK + Streaming WebSocket API       | -               |
| Realtime | websockets (Python), AudioWorklet (browser)    | -               |
| LLMs     | pydantic-ai (OpenAI, Anthropic, Gemini, Azure) | -               |

---

## Directory Structure

```
project-root/
├── backend/
│   ├── api/                        # Router layer (HTTP endpoints)
│   │   ├── assemblyai/router.py    #   POST /createTranscript
│   │   ├── llm/router.py          #   POST /createSummary
│   │   ├── misc/router.py         #   GET /getConfig, POST /getSpeakers, POST /updateSpeakers
│   │   └── realtime/router.py    #   WS /ws/realtime, POST /createIncrementalSummary
│   ├── service/                    # Service layer (business logic)
│   │   ├── assembly_ai/core.py    #   AssemblyAIService
│   │   ├── llm/core.py            #   LLMService (multi-provider)
│   │   ├── misc/core.py           #   MiscService (speakers, dates)
│   │   └── realtime/             #   RealtimeTranscriptionService, SessionManager
│   ├── models/                     # Pydantic request/response models
│   │   ├── assemblyai.py
│   │   ├── config.py
│   │   ├── llm.py
│   │   └── realtime.py            #   IncrementalSummaryRequest/Response
│   ├── utils/
│   │   ├── helper.py              # File listing & reading utilities
│   │   └── logging.py             # Logger configuration
│   ├── prompt_templates/           # Markdown prompt files (loaded dynamically)
│   ├── config.py                   # Pydantic BaseSettings (from .env)
│   ├── main.py                     # FastAPI app entry point
│   └── pyproject.toml              # uv dependencies
│
├── frontend/
│   ├── src/
│   │   ├── auth.ts                 # Auth.js v5 config (Google OAuth, email allowlist)
│   │   ├── proxy.ts                # Next.js 16 proxy (route protection, replaces middleware.ts)
│   │   ├── app/
│   │   │   ├── api/
│   │   │   │   ├── auth/[...nextauth]/route.ts  # Auth.js route handler
│   │   │   │   └── proxy/[...path]/route.ts     # API proxy to backend
│   │   │   ├── login/page.tsx      # Google sign-in page
│   │   │   ├── layout.tsx          # Root layout (dark mode, font, toaster, SessionWrapper)
│   │   │   ├── page.tsx            # Main orchestrator (all state lives here)
│   │   │   └── globals.css         # Theme variables, animations
│   │   ├── components/
│   │   │   ├── auth/               # SessionWrapper, UserMenu
│   │   │   ├── layout/             # Header, StepIndicator, SettingsSheet
│   │   │   ├── settings/           # ApiKeyManager, ProviderSelector, ModelSelector, AzureConfigForm
│   │   │   ├── workflow/           # FileUpload, AudioRecorder, TranscriptView, SpeakerMapper, PromptEditor, SummaryView
│   │   │   ├── realtime/          # RealtimeMode, RealtimeControls, RealtimeTranscriptView, RealtimeSummaryView, ConnectionStatus
│   │   │   └── ui/                 # shadcn/ui primitives + AudioPlayer composite component
│   │   ├── hooks/
│   │   │   ├── useApiKeys.ts       # localStorage key management
│   │   │   ├── useConfig.ts        # Backend config fetching
│   │   │   └── useRealtimeSession.ts # Realtime session lifecycle (WS, audio, transcript, summary timer)
│   │   └── lib/
│   │       ├── api.ts              # Centralized API client (routes through /api/proxy)
│   │       ├── errors.ts           # getErrorMessage() — maps ApiError status codes to user-friendly strings
│   │       ├── types.ts            # TypeScript types (mirrors backend models)
│   │       └── utils.ts            # cn() Tailwind merge utility
│   ├── public/
│   │   └── pcm-worklet-processor.js  # AudioWorklet for PCM16 capture
│   ├── package.json
│   └── next.config.ts
│
├── render.yaml                     # Render Blueprint (IaC deployment config)
├── docs/                           # Documentation
├── user_stories/                   # Feature specifications
└── CLAUDE.md                       # AI assistant instructions
```

---

## Deployment Architecture

### Request Flow

In production (Render), both services are **public web services** on the free tier. All API calls from the browser go through a Next.js API proxy route which checks authentication before forwarding to the backend. The backend is technically reachable directly, but since it uses BYOK (users supply their own API keys per-request), there are no stored secrets to abuse.

```
Browser (client)
    │
    ├── HTTP ──► Next.js Frontend (public, Render web service)
    │                ├── proxy.ts ── checks auth session, redirects to /login if unauthenticated
    │                ├── /api/auth/* ── Auth.js handles Google OAuth flow
    │                └── /api/proxy/* ── forwards requests to backend
    │                        │
    │                        ▼
    │                FastAPI Backend (public, Render web service)
    │                    └── /createTranscript, /createSummary, /getConfig, etc.
    │
    └── WebSocket ──► FastAPI Backend (direct, bypasses proxy)
                         └── /ws/realtime (realtime transcription relay)
```

Locally, the HTTP proxy route forwards `localhost:3000/api/proxy/*` to `localhost:8080/*`. The WebSocket connection goes directly from the browser to the backend (`ws://localhost:8080/ws/realtime`) — it bypasses the Next.js proxy because Auth.js session cookies are not sent over WebSocket connections. Authentication for the WebSocket is handled via the AssemblyAI API key sent in the init message.

### Authentication (Google OAuth)

Authentication uses **Auth.js v5** (`next-auth@beta`) with the Google provider.

| File                                      | Purpose                                                                                              |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `src/auth.ts`                             | Auth.js config: Google provider, email allowlist from `ALLOWED_EMAILS` env var, custom `/login` page |
| `src/app/api/auth/[...nextauth]/route.ts` | Auth.js route handler (GET/POST for OAuth callbacks)                                                 |
| `src/app/login/page.tsx`                  | Server Component login page with "Sign in with Google" button                                        |
| `src/components/auth/SessionWrapper.tsx`  | Client `<SessionProvider>` wrapper (needed because `layout.tsx` is a Server Component)               |
| `src/components/auth/UserMenu.tsx`        | Client component showing user email, avatar, and sign-out button                                     |

**Email allowlist**: The `ALLOWED_EMAILS` env var is a comma-separated list of emails. If empty, all authenticated Google users are allowed. The check happens in the `signIn` callback in `auth.ts`.

### API Proxy Layer

`src/app/api/proxy/[...path]/route.ts` is a catch-all route handler that:

1. Checks the user's auth session (returns 401 if unauthenticated)
2. Reads `BACKEND_INTERNAL_URL` env var (default `http://localhost:8080`)
3. Forwards the request method, headers (stripping `host`, `cookie`, `connection`), query params, and body
4. **Streaming**: Detects `content-type: text/plain` responses and passes the `ReadableStream` directly through — this preserves chunk-by-chunk delivery for `/createSummary`
5. **File uploads**: Passes `request.body` as a raw stream with `duplex: "half"` for multipart/form-data

### Route Protection

`src/proxy.ts` is the Next.js 16 proxy file (replaces `middleware.ts`). It runs on every request and:

- **Allows through** without auth: `/login`, `/api/auth/*`, `/_next/*`, `/favicon.ico`
- **Redirects** unauthenticated users to `/login` for all other routes

### Environment Variables

| Variable               | Service  | Default                 | Description                                                  |
| ---------------------- | -------- | ----------------------- | ------------------------------------------------------------ |
| `BACKEND_INTERNAL_URL`        | Frontend | `http://localhost:8080` | Backend URL for HTTP proxy (auto-populated on Render)        |
| `NEXT_PUBLIC_BACKEND_WS_URL` | Frontend | `ws://localhost:8080`   | Backend WebSocket URL for realtime transcription (direct)    |
| `AUTH_GOOGLE_ID`              | Frontend | —                       | Google OAuth client ID                                       |
| `AUTH_GOOGLE_SECRET`   | Frontend | —                       | Google OAuth client secret                                   |
| `AUTH_SECRET`          | Frontend | —                       | Random secret for session encryption                         |
| `ALLOWED_EMAILS`       | Frontend | (empty = allow all)     | Comma-separated email allowlist                              |
| `AUTH_TRUST_HOST`      | Frontend | —                       | Set to `"true"` for non-Vercel deployments                   |
| `ENVIRONMENT`          | Backend  | `development`           | `development` (enables reload) or `production`               |
| `ALLOWED_ORIGINS`      | Backend  | `http://localhost:3000` | Comma-separated CORS origins                                 |

---

## Backend Architecture

### Three-Layer Pattern

Every backend feature follows: **Router -> Service -> External API**

```
HTTP Request
    │
    ▼
┌──────────┐    Validates input, returns HTTP responses
│  Router   │    Location: api/{domain}/router.py
└────┬─────┘
     │
     ▼
┌──────────┐    Business logic, orchestration
│  Service  │    Location: service/{domain}/core.py
└────┬─────┘
     │
     ▼
┌──────────┐    SDK calls, external HTTP requests
│ External  │    (AssemblyAI SDK, pydantic-ai providers)
│   API     │
└──────────┘
```

### Adding a New Backend Endpoint

1. **Create the model** in `models/` — define Pydantic `BaseModel` classes for request and response:

   ```python
   # models/my_feature.py
   from pydantic import BaseModel

   class MyRequest(BaseModel):
       text: str  # Use min_length=1 for required strings

   class MyResponse(BaseModel):
       result: str
   ```

2. **Create the service** in `service/{domain}/core.py`:

   ```python
   # service/my_feature/core.py
   class MyFeatureService:
       async def process(self, text: str) -> str:
           # Business logic here
           return result
   ```

3. **Create the router** in `api/{domain}/router.py`:

   ```python
   # api/my_feature/router.py
   from fastapi import APIRouter
   from models.my_feature import MyRequest, MyResponse
   from service.my_feature.core import MyFeatureService

   my_feature_router = APIRouter()
   service = MyFeatureService()

   @my_feature_router.post("/myEndpoint", response_model=MyResponse, status_code=200)
   async def my_endpoint(request: MyRequest) -> MyResponse:
       result = await service.process(request.text)
       return MyResponse(result=result)
   ```

4. **Register the router** in `main.py`:

   ```python
   from api.my_feature.router import my_feature_router
   app.include_router(my_feature_router, tags=["MyFeature"])
   ```

5. **Create `__init__.py`** files in `api/my_feature/` and `service/my_feature/` (can be empty).

### Router Conventions

- **Endpoint paths**: camelCase (`/createTranscript`, `/getSpeakers`); WebSocket paths use `/ws/` prefix (`/ws/realtime`)
- **HTTP methods**: `POST` for operations, `GET` for data retrieval
- **WebSocket**: `@router.websocket("/ws/path")` for persistent connections
- **All handlers are `async def`**
- **Services instantiated at module level**: `service = MyService()` (no DI framework)
- **Response model declared in decorator**: `@router.post("/path", response_model=MyResponse)`
- **Tags for OpenAPI grouping**: `app.include_router(router, tags=["Domain"])`

### Service Layer

- All methods are `async def`
- Services are plain classes (no base class, no DI)
- Error handling: raise exceptions, let the router catch and convert to HTTP responses
- The **realtime service** (`service/realtime/`) contains:
  - `RealtimeTranscriptionService` (`core.py`): manages WebSocket connections to AssemblyAI's streaming API (connect, send audio, terminate)
  - `SessionManager` (`session.py`): in-memory session state with asyncio Lock for thread safety — tracks accumulated transcript, current partial, and timestamps per session
  - `SessionState` dataclass: `session_id`, `accumulated_transcript`, `current_partial`, `created_at`, `last_activity`
- The LLM service uses a factory method `_create_model()` to instantiate the correct pydantic-ai provider:

  | Provider       | Model Class       | Provider Class      |
  | -------------- | ----------------- | ------------------- |
  | `openai`       | `OpenAIChatModel` | `OpenAIProvider`    |
  | `anthropic`    | `AnthropicModel`  | `AnthropicProvider` |
  | `gemini`       | `GoogleModel`     | `GoogleProvider`    |
  | `azure_openai` | `OpenAIChatModel` | `AzureProvider`     |

### Models (Pydantic Schemas)

- All request/response schemas are Pydantic `BaseModel` subclasses
- Use `min_length=1` for required string fields
- Use `| None = None` for optional fields
- Enums extend `str, Enum` for JSON serialization
- Custom validators via `@model_validator` (e.g., Azure config required when provider is `azure_openai`)

Key models:

| File                   | Key Classes                                                                          |
| ---------------------- | ------------------------------------------------------------------------------------ |
| `models/llm.py`        | `LLMProvider` (enum), `CreateSummaryRequest`, `CreateSummaryResponse`, `AzureConfig` |
| `models/config.py`     | `ConfigResponse`, `ProviderInfo`, `PromptTemplate`, `LanguageOption`, speaker models |
| `models/assemblyai.py` | `CreateTranscriptResponse`                                                           |
| `models/realtime.py`   | `IncrementalSummaryRequest`, `IncrementalSummaryResponse`                            |

### Configuration & Environment

Backend settings use Pydantic `BaseSettings` loaded from `.env`:

```python
# config.py
class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False, extra="ignore")

    logging_level: str = "INFO"
    fastapi_welcome_msg: str = "Access the swagger docs at '/docs'"
    prompt_template_directory: str = "./prompt_templates"

config = Settings()  # Singleton, imported throughout
```

Environment variables (`.env`):

| Variable                    | Default                 | Description                                |
| --------------------------- | ----------------------- | ------------------------------------------ |
| `LOGGING_LEVEL`             | `INFO`                  | DEBUG, INFO, WARNING, ERROR, CRITICAL      |
| `FASTAPI_WELCOME_MSG`       | (swagger docs message)  | Root endpoint message                      |
| `PROMPT_TEMPLATE_DIRECTORY` | `./prompt_templates`    | Path to prompt markdown files              |
| `ENVIRONMENT`               | `development`           | `development` (hot-reload) or `production` |
| `ALLOWED_ORIGINS`           | `http://localhost:3000` | Comma-separated CORS origins               |

To add a new setting: add a field to `Settings` in `config.py`, add the corresponding variable to `.env` and `.env.example`.

### Prompt Template System

Prompt templates are Markdown files in `prompt_templates/`. They are loaded dynamically:

1. `GET /getConfig` calls `Helper.list_files(config.prompt_template_directory)`
2. Each `.md` file becomes a `PromptTemplate` with:
   - `id`: filename stem (e.g., `short_meeting_summary`)
   - `name`: auto-generated display name (snake_case -> Title Case)
   - `content`: full Markdown content
3. Templates use `{{Day of the week}}` and `{{YYYY-MM-DD}}` as placeholders, replaced by `LLMService.build_prompt()`

**To add a new template**: create a new `.md` file in `prompt_templates/`. It will automatically appear in the frontend template selector.

> **Note**: The **realtime incremental summary** (`/createIncrementalSummary`) does **not** use the prompt template system. It uses a hardcoded stability-focused system prompt defined in `api/realtime/router.py` (`_REALTIME_SYSTEM_PROMPT`). The target language is auto-detected from the transcript using the `langdetect` library rather than being selected by the user.

### Error Handling

Routers catch exceptions and return categorized HTTP errors:

```python
try:
    result = await service.do_something(...)
except Exception as e:
    error_msg = str(e).lower()
    if "auth" in error_msg or "api key" in error_msg:
        raise HTTPException(status_code=401, detail="Invalid API key")
    elif "model" in error_msg and "not found" in error_msg:
        raise HTTPException(status_code=400, detail="Model not found")
    else:
        raise HTTPException(status_code=502, detail="Provider error")
```

| Status | Meaning        | When                              |
| ------ | -------------- | --------------------------------- |
| 400    | Bad request    | Missing param, model not found    |
| 401    | Unauthorized   | Invalid/missing API key           |
| 500    | Internal error | Unexpected server errors          |
| 502    | Bad gateway    | External API (LLM provider) error |

### Streaming Responses (Backend)

The `/createSummary` endpoint supports streaming via `StreamingResponse`:

```python
# Router
if request.stream:
    generator = await service.generate_summary(request)  # Returns AsyncGenerator
    return StreamingResponse(generator, media_type="text/plain")

# Service
async def _stream_response(agent, user_prompt) -> AsyncGenerator[str, None]:
    async with agent.run_stream(user_prompt) as stream:
        async for chunk in stream.stream_text(delta=True):
            yield chunk  # delta=True yields only new text
```

- Media type: `text/plain` (not JSON)
- Chunks: plain text deltas
- pydantic-ai `Agent.run_stream()` with `delta=True`

### API Key Handling (BYOK)

Keys are sent per-request, never stored on the backend:

| Key           | Transport                    | Validation              |
| ------------- | ---------------------------- | ----------------------- |
| AssemblyAI    | `X-AssemblyAI-Key` header    | Router checks non-empty |
| LLM providers | `api_key` field in JSON body | Pydantic `min_length=1` |

### CORS & Middleware

```python
allowed_origins = os.environ.get("ALLOWED_ORIGINS", "http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in allowed_origins],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

CORS origins are configured via the `ALLOWED_ORIGINS` env var (comma-separated). Defaults to `http://localhost:3000` for local development. In production, set this to your frontend's Render URL (e.g., `https://aias-frontend.onrender.com`).

### Logging

```python
from utils.logging import logger

logger.info("Processing request")
logger.error(f"Failed: {e}")
```

Format: `timestamp | level | filename:line | function | message`

---

## Frontend Architecture

### App Structure

- **Next.js 16** with App Router. Two pages: `/` (main app) and `/login` (Google sign-in)
- **`"use client"`** — the main page is a client component (all interactivity)
- **Authentication**: Google OAuth via Auth.js v5. `layout.tsx` wraps all children in `<SessionWrapper>` for client-side session access. `proxy.ts` redirects unauthenticated users to `/login`.
- **API proxy**: All API calls go through `/api/proxy/*` which forwards to the backend. The frontend never calls the backend directly.
- **Toast notifications**: Sonner, positioned top-right (72px from top, clearing the 64px header), 5-second auto-dismiss with hover-pause
- **Style Guide**: Always follow [UX_SPECIFICATION.md](../user_stories/UX_SPECIFICATION.md) when implementing any frontend feature!

### App Modes

The app has two top-level modes controlled by `appMode` state (`"standard"` | `"realtime"`), toggled via a tab bar below the header. The selected mode is persisted to localStorage (`aias:v1:app_mode`).

### Standard Mode (3-Step Workflow)

The standard mode follows a linear workflow managed by `currentStep` state (1, 2, or 3):

```
Step 1: Input                 Step 2: Transcript              Step 3: Summary
┌─────────────────────┐      ┌──────────────────────┐        ┌────────────┬────────────┐
│ [Upload] [Record]   │      │  TranscriptView      │        │ Transcript │  Summary   │
│ ─────────────────── │      │  (editable)          │  ──►   │ (readonly) │  (stream)  │
│  FileUpload      OR │ ──►  │  SpeakerMapper       │        │            │            │
│  AudioRecorder      │      │  PromptEditor        │        │            │            │
└─────────────────────┘      │  [Generate] button   │        └────────────┴────────────┘
                             └──────────────────────┘              Two-column grid
```

Step 1 has two modes controlled by `step1Mode` state (`"upload"` | `"record"`), toggled via a tab bar. Both modes call the same `handleFileSelected()` handler when a file is ready.

Transitions:

- **1 -> 2**: `handleFileSelected()` — uploads/sends file, calls `/createTranscript`
- **2 -> 3**: `handleGenerate()` — calls `/createSummary` with streaming
- **3 -> 2**: "Back to Transcript" button
- **3 -> 1**: "Start Over" resets all state

### Realtime Mode

The realtime mode provides live transcription and incremental summarization:

```
┌──────────────────────────────────────────────────────────────┐
│  RealtimeControls                                            │
│  [Start/Pause/Stop]  [Mic]  [Status]  [00:00]  [mm:ss] [↻] │
│                                     elapsed  countdown  btn  │
├──────────────────────────┬───────────────────────────────────┤
│  RealtimeTranscriptView  │  RealtimeSummaryView              │
│  (live, auto-scrolling)  │  (markdown, periodic updates)     │
│  Final text + partials   │  "Updating..." badge + timestamp  │
└──────────────────────────┴───────────────────────────────────┘
         Desktop: two-column grid / Mobile: tabbed
```

The `useRealtimeSession` hook manages the entire lifecycle:
1. **Start**: getUserMedia → AudioContext → AudioWorklet (PCM16 @ 16kHz, buffered in 100ms chunks) → WebSocket to backend → relay to AssemblyAI
2. **During session**: transcript accumulates from WS `turn` events; summary timer fires at configurable interval (1-10 min, set in Settings panel) calling `POST /createIncrementalSummary`; countdown timer (`mm:ss`) shown in controls bar; timer pauses when recording is paused and restarts on resume
3. **Manual summary**: "Refresh Summary" button in controls triggers immediate summary and resets the auto-timer from that point
4. **Stop**: sends stop message → closes WS → triggers final full-transcript summary → shows copy buttons

### Component Hierarchy

```
RootLayout (layout.tsx)
└── SessionWrapper             ← Auth.js SessionProvider (client boundary)
    │
    ├── /login ── LoginPage    ← Server Component, redirects to / if authenticated
    │
    └── / ── Page (page.tsx) ─── All state lives here
        ├── Header
        │   ├── UserMenu       ← user email, avatar, sign-out button
        │   └── Settings gear icon
        ├── SettingsSheet (right-side drawer, 380px)
        │   ├── ApiKeyManager          ← uses useApiKeys() hook
        │   ├── ProviderSelector
        │   ├── ModelSelector           ← dropdown or free-text input
        │   └── AzureConfigForm        ← only if provider is azure_openai
        ├── Mode Tab Bar               ← [Standard] [Realtime] toggle
        │
        ├── (Standard mode):
        │   ├── StepIndicator          ← visual 3-step progress bar
        │   └── Step Content (conditional):
        │       ├── Step 1: tab toggle → FileUpload | AudioRecorder
        │       ├── Step 2: TranscriptView + SpeakerMapper + PromptEditor
        │       └── Step 3: TranscriptView (readonly) + SummaryView
        │
        └── (Realtime mode):
            └── RealtimeMode           ← orchestrator, uses useRealtimeSession() hook
                ├── RealtimeControls   ← Start/Pause/Stop, mic selector, elapsed timer, countdown + Refresh button
                │   └── ConnectionStatus
                ├── RealtimeTranscriptView  ← live transcript with auto-scroll
                └── RealtimeSummaryView     ← markdown summary with periodic updates
```

### Adding a New Frontend Component

1. **Create the component** in the appropriate subdirectory:
   - `components/auth/` — authentication-related components (SessionWrapper, UserMenu)
   - `components/layout/` — structural/layout components
   - `components/settings/` — settings panel sub-components
   - `components/workflow/` — standard mode step-specific workflow components
   - `components/realtime/` — realtime mode components (RealtimeMode, Controls, TranscriptView, SummaryView, ConnectionStatus)

2. **Define a props interface**:

   ```tsx
   interface MyComponentProps {
     value: string;
     onChange: (value: string) => void;
     disabled?: boolean;
   }

   export function MyComponent({ value, onChange, disabled }: MyComponentProps) {
     return (/* ... */);
   }
   ```

3. **Wire it into `page.tsx`**: add state in the Page component and pass it down as props.

4. **If it calls the backend**: add the API function in `lib/api.ts` and corresponding types in `lib/types.ts`.

Key conventions:

- Named exports (not default exports)
- Props interfaces defined in the same file
- State lifted to `page.tsx` — components are controlled
- Use `useCallback` for event handlers passed as props
- Use shadcn/ui primitives from `components/ui/`

### State Management

All application state lives in `page.tsx` using `useState`. There is no global state library.

| State Category    | Persisted?         | Storage Key Pattern         |
| ----------------- | ------------------ | --------------------------- |
| API keys          | Yes (localStorage) | `aias:v1:apikey:{provider}` |
| Azure config      | Yes (localStorage) | `aias:v1:azure:{field}`     |
| Selected provider | Yes (localStorage) | `aias:v1:selected_provider` |
| Selected model    | Yes (localStorage) | `aias:v1:model:{provider}`  |
| App mode          | Yes (localStorage) | `aias:v1:app_mode`          |
| Realtime interval | Yes (localStorage) | `aias:v1:realtime_interval` |
| Workflow state    | No                 | -                           |
| Prompt/language   | No                 | -                           |
| Realtime session  | No (hook state)    | -                           |

Pattern for persisted state:

```tsx
const [selectedProvider, setSelectedProvider] = useState<LLMProvider>(
  () => safeGet("aias:v1:selected_provider", "openai") as LLMProvider,
);

const handleProviderChange = (provider: LLMProvider) => {
  setSelectedProvider(provider);
  safeSet("aias:v1:selected_provider", provider);
};
```

### API Client

All backend calls go through `lib/api.ts`. The base URL is `/api/proxy`, which routes all requests through the Next.js API proxy layer (`src/app/api/proxy/[...path]/route.ts`). The proxy forwards to the backend using `BACKEND_INTERNAL_URL`.

| Function                       | Method | Endpoint                     | Returns                                       |
| ------------------------------ | ------ | ---------------------------- | --------------------------------------------- |
| `getConfig()`                  | GET    | `/getConfig`                 | `ConfigResponse`                              |
| `createTranscript()`           | POST   | `/createTranscript`          | `string` (transcript)                         |
| `getSpeakers()`                | POST   | `/getSpeakers`               | `string[]` (speaker labels)                   |
| `updateSpeakers()`             | POST   | `/updateSpeakers`            | `string` (updated transcript)                 |
| `extractKeyPoints()`           | POST   | `/extractKeyPoints`          | `ExtractKeyPointsResponse`                    |
| `createSummary()`              | POST   | `/createSummary`             | `string` (full text, with streaming callback) |
| `createIncrementalSummary()`   | POST   | `/createIncrementalSummary`  | `IncrementalSummaryResponse`                  |

Error handling: `ApiError` class with `status` and `message`. The `handleResponse<T>()` helper extracts `detail` from FastAPI error JSON. Use `getErrorMessage(error, context)` from `lib/errors.ts` in catch blocks to map `ApiError` status codes to user-friendly toast messages — never show raw backend error strings to the user.

**To add a new API call**: add a function in `api.ts`, add types in `types.ts`, call it from `page.tsx` or a component.

### Streaming Responses (Frontend)

`createSummary()` accepts an `onChunk` callback for real-time streaming:

```tsx
// In api.ts
export async function createSummary(
  request: CreateSummaryRequest,
  onChunk: (chunk: string) => void,
): Promise<string> {
  const response = await fetch(`${API_BASE}/createSummary`, { ... });

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let fullText = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    fullText += chunk;
    onChunk(chunk);  // UI update callback
  }
  return fullText;
}

// In page.tsx
await createSummary(
  request,
  (chunk) => setSummary((prev) => prev + chunk)  // Append each chunk
);
```

The `SummaryView` component auto-scrolls during streaming and shows a blinking cursor animation (`.streaming-cursor` in CSS).

### localStorage & API Keys

The `useApiKeys` hook manages all key storage:

```tsx
const { getKey, setKey, hasKey, clearKey, getAzureConfig, setAzureConfig } = useApiKeys();
```

Key prefix: `aias:v1:` — all localStorage operations use safe try/catch wrappers to handle SSR and disabled localStorage.

| Key                             | Contents                        |
| ------------------------------- | ------------------------------- |
| `aias:v1:apikey:assemblyai`     | AssemblyAI API key              |
| `aias:v1:apikey:openai`         | OpenAI API key                  |
| `aias:v1:apikey:anthropic`      | Anthropic API key               |
| `aias:v1:apikey:gemini`         | Gemini API key                  |
| `aias:v1:apikey:azure_openai`   | Azure OpenAI API key            |
| `aias:v1:azure:api_version`     | Azure API version               |
| `aias:v1:azure:endpoint`        | Azure endpoint URL              |
| `aias:v1:azure:deployment_name` | Azure deployment name           |
| `aias:v1:selected_provider`     | Currently selected LLM provider |
| `aias:v1:model:{provider}`      | Selected model per provider     |
| `aias:v1:app_mode`              | App mode (`standard` or `realtime`) |
| `aias:v1:realtime_interval`     | Realtime auto-summary interval (minutes: 1/2/3/5/10) |

### Styling & Theme

- **Dark mode only** — no light mode support
- **Accent color**: `#FC520B` (orange)
- **Background**: `#0A0A0A` (near-black)
- **Cards**: `#141414` (slightly lighter)
- **Borders**: `#262626`

Custom CSS variables are defined in `globals.css` under `:root`. Semantic colors:

| Variable        | Color     | Usage              |
| --------------- | --------- | ------------------ |
| `--primary`     | `#FC520B` | Buttons, accents   |
| `--success`     | `#22C55E` | Saved indicators   |
| `--warning`     | `#F59E0B` | Missing key badges |
| `--destructive` | `#EF4444` | Error states       |
| `--info`        | `#3B82F6` | Info messages      |

Custom animations:

- `.streaming-cursor` — blinking orange cursor during streaming
- `.step-content` — fade-in + slide-up on step transitions
- `.summary-fade-enter` — 400ms fade-in on realtime summary updates
- `.connection-dot` — colored status dots (green/amber/gray/red) with blink animation for connecting/reconnecting states
- `.realtime-partial` — muted italic style for in-progress transcript text

### shadcn/ui Components

Primitives live in `components/ui/`. **Do not edit these directly** — they are generated by shadcn CLI.

To add a new shadcn component:

```bash
cd frontend && npx shadcn@latest add <component-name>
```

Currently used: `badge`, `button`, `card`, `dialog`, `input`, `label`, `select`, `separator`, `sheet`, `slider`, `sonner`, `switch`, `tabs`, `textarea`.

`components/ui/audio-player.tsx` is a custom composite component (not generated by shadcn CLI) that combines `Button` and `Slider` into a dark-themed audio playback widget with play/pause, seek bar, time display, mute toggle, and volume control. It is used by `AudioRecorder` to preview recordings after they are stopped.

The `cn()` utility from `lib/utils.ts` merges Tailwind classes without conflicts:

```tsx
import { cn } from "@/lib/utils";

<div className={cn("px-4", isActive && "bg-primary")} />;
```

### Types

`lib/types.ts` mirrors the backend Pydantic models as TypeScript interfaces:

```tsx
export type LLMProvider = "openai" | "anthropic" | "gemini" | "azure_openai";

export interface ProviderInfo {
  id: LLMProvider;
  name: string;
  models: string[];
  requires_azure_config: boolean;
}

export interface ConfigResponse {
  providers: ProviderInfo[];
  prompt_templates: PromptTemplate[];
  languages: LanguageOption[];
}
// ... etc.
```

**When adding a new API endpoint**: keep `types.ts` in sync with the corresponding backend Pydantic models.

---

## End-to-End Data Flows

### Transcription Flow

```
User drops/selects a file (FileUpload)
  OR records audio and clicks "Use for Transcript" (AudioRecorder)
    │
    ▼
File validated as audio/video (AudioRecorder always produces audio/webm)
    │
    ▼
page.tsx: handleFileSelected()
    ├── Checks AssemblyAI key exists (localStorage)
    ├── Sets step=2, isTranscribing=true
    │
    ▼
api.ts: createTranscript(file, apiKey)
    ├── POST /createTranscript (multipart/form-data)
    ├── Header: X-AssemblyAI-Key
    │
    ▼
Router: saves file to temp, calls service
    │
    ▼
AssemblyAIService.get_transcript()
    ├── Sets API key on aai.settings
    ├── Configures: best model, speaker labels, language detection
    ├── Calls aai.Transcriber().transcribe()
    ├── Formats utterances as "Speaker X: text\n"
    │
    ▼
Router: returns CreateTranscriptResponse, deletes temp file (finally)
    │
    ▼
Frontend: sets transcript state, shows in TranscriptView
```

### Summary Generation Flow

```
User clicks "Generate Summary"
    │
    ▼
page.tsx: handleGenerate()
    ├── Checks LLM key exists (localStorage)
    ├── Sets step=3, isGenerating=true, summary=""
    │
    ▼
api.ts: createSummary(request, onChunk)
    ├── POST /createSummary (JSON body with provider, key, model, prompt, text)
    │
    ▼
Router: calls LLMService.generate_summary(request)
    │
    ▼
LLMService:
    ├── _create_model() → provider-specific pydantic-ai model
    ├── build_prompt() → enhances prompt with language/date instructions
    ├── Creates Agent with model + system prompt + temperature=0.5
    ├── agent.run_stream(user_prompt)
    │
    ▼
Router: wraps AsyncGenerator in StreamingResponse (text/plain)
    │
    ▼
api.ts: reads stream with ReadableStream API
    ├── reader.read() in loop
    ├── TextDecoder for each chunk
    ├── Calls onChunk(chunk) → setSummary(prev => prev + chunk)
    │
    ▼
SummaryView: re-renders with updated summary, auto-scrolls, shows cursor
```

### Realtime Transcription Flow

```
User clicks "Start" in Realtime mode
    │
    ▼
RealtimeMode: validates API keys (AssemblyAI + LLM provider)
    │
    ▼
useRealtimeSession.startSession():
    ├── getUserMedia() → microphone stream
    ├── AudioContext (48kHz) → AudioWorklet (pcm-worklet-processor)
    │   └── Downsamples to 16kHz, converts Float32 → Int16 PCM
    │       Buffers 1600 samples (100ms) before posting — AAI requires 50-1000ms chunks
    ├── Opens WebSocket to backend: ws://localhost:8080/ws/realtime
    ├── Sends init JSON: {api_key, session_id, sample_rate}
    │
    ▼
Backend /ws/realtime handler:
    ├── Creates SessionState via SessionManager
    ├── Connects to AssemblyAI: wss://streaming.eu.assemblyai.com/v3/ws
    │   └── Auth header, params: pcm_s16le, 16kHz, universal-streaming-multilingual, format_turns=true
    ├── Sends {type: "session_started"} to browser
    ├── Runs two concurrent asyncio tasks:
    │   ├── browser_to_aai: forwards binary audio frames
    │   └── aai_to_browser: parses PascalCase turn events (Turn/Begin/Termination)
    │       └── format_turns=true → AAI sends two Turn events per sentence:
    │           1. end_of_turn=true, turn_is_formatted=false → skipped
    │           2. turn_is_formatted=true → used as final transcript
    │
    ▼
Browser receives {type: "turn", transcript, is_final}:
    ├── is_final=true → accumulatedTranscript += transcript
    ├── is_final=false → currentPartial = transcript (live partial display)
    │
    ▼
Summary timer (configurable interval via Settings, default 2 min):
    ├── Pauses automatically when recording is paused; restarts on resume
    ├── Countdown shown as mm:ss in controls bar; manual "Refresh Summary" resets it
    ├── Calls POST /createIncrementalSummary via api.ts
    ├── Language auto-detected from transcript via langdetect (Python)
    ├── Hardcoded system prompt (stability-focused, not from prompt_templates/)
    ├── Incremental: sends previous_summary + new_transcript_chunk, temperature=0.1
    ├── Every 10th call: full recompute for consistency
    ├── Response: {summary, updated_at} → updates RealtimeSummaryView
    │
    ▼
User clicks "Stop":
    ├── Sends {type: "stop"} over WS → backend terminates AAI connection
    ├── Cleans up: WS, AudioContext, MediaStream, timers
    └── Triggers final full-transcript summary
```

### Config Flow

```
App mounts → useConfig() hook
    │
    ▼
api.ts: getConfig() → GET /getConfig
    │
    ▼
misc/router.py:
    ├── Hardcoded PROVIDERS list (with model suggestions)
    ├── Loads prompt templates from markdown files in prompt_template_directory
    ├── Hardcoded LANGUAGES list
    ├── Returns ConfigResponse
    │
    ▼
Frontend: populates provider dropdown, template selector, language picker
```

---

## Common Tasks

### Add a new LLM provider

1. **Backend**: Add value to `LLMProvider` enum in `models/llm.py`
2. **Backend**: Add provider creation logic in `LLMService._create_model()` in `service/llm/core.py`
3. **Backend**: Add provider info to `PROVIDERS` list in `api/misc/router.py`
4. **Frontend**: Add the provider string to the `LLMProvider` type in `lib/types.ts`

### Add a new language

1. **Backend**: Add `LanguageOption` to `LANGUAGES` list in `api/misc/router.py`
2. **Backend**: If special handling needed (like German formal/informal), update `LLMService.build_prompt()` in `service/llm/core.py`

### Add a new prompt template

1. Create a new `.md` file in `backend/prompt_templates/`
2. Use `{{Day of the week}}` and `{{YYYY-MM-DD}}` for date placeholders
3. It will automatically appear in the frontend template selector

### Add a new backend setting

1. Add field to `Settings` class in `backend/config.py`
2. Add corresponding variable to `.env` and `.env.example`
3. Import `config` where needed: `from config import config`

### Add a new API endpoint (full stack)

1. **Backend**: Create model in `models/`, service in `service/`, router in `api/`
2. **Backend**: Register router in `main.py`
3. **Frontend**: Add types to `lib/types.ts`
4. **Frontend**: Add API function to `lib/api.ts`
5. **Frontend**: Add state and handler in `page.tsx`
6. **Frontend**: Create/update component in `components/`

### Add a new shadcn/ui component

```bash
cd frontend && npx shadcn@latest add <component-name>
```

Then import from `@/components/ui/<component-name>`.

### Run the project locally

```bash
# Terminal 1: Backend
cd backend && uv run main.py        # http://localhost:8080

# Terminal 2: Frontend
cd frontend && npm run dev           # http://localhost:3000
```

API docs: http://localhost:8080/docs

For authentication to work locally, you need Google OAuth credentials configured (see [GCP Setup Guide](#gcp-setup-guide-google-oauth)) and the relevant env vars in `frontend/.env.local` (see `frontend/.env.local.example`).

---

## GCP Setup Guide (Google OAuth)

Step-by-step instructions to create Google OAuth credentials for the app.

### 1. Create a Google Cloud project (or use an existing one)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click the project dropdown at the top → **New Project**
3. Name it (e.g., `AIAudioSummary`) → **Create**
4. Select the new project from the dropdown

### 2. Configure the OAuth consent screen

1. Navigate to **APIs & Services → OAuth consent screen**
2. Choose **External** user type (or **Internal** if you have a Google Workspace org and want to restrict to your org only) → **Create**
3. Fill in the required fields:
   - **App name**: `AI Audio Summary`
   - **User support email**: your email
   - **Developer contact email**: your email
4. Click **Save and Continue**
5. On the **Scopes** page, click **Add or Remove Scopes** and add:
   - `openid`
   - `email`
   - `profile`
6. Click **Save and Continue**
7. On the **Test users** page (only relevant if consent screen is in "Testing" mode):
   - Add the Google accounts you want to allow to sign in during testing
8. Click **Save and Continue** → **Back to Dashboard**

### 3. Create OAuth credentials

1. Navigate to **APIs & Services → Credentials**
2. Click **+ Create Credentials → OAuth client ID**
3. Application type: **Web application**
4. Name: `AIAudioSummary` (or anything descriptive)
5. **Authorized JavaScript origins**:
   - `http://localhost:3000` (for local development)
   - `https://your-frontend-domain.onrender.com` (for production — add after deploying)
6. **Authorized redirect URIs**:
   - `http://localhost:3000/api/auth/callback/google` (local)
   - `https://your-frontend-domain.onrender.com/api/auth/callback/google` (production — add after deploying)
7. Click **Create**
8. Copy the **Client ID** and **Client Secret**

### 4. Configure environment variables

Add the credentials to `frontend/.env.local`:

```
AUTH_GOOGLE_ID=<your-client-id>.apps.googleusercontent.com
AUTH_GOOGLE_SECRET=<your-client-secret>
AUTH_SECRET=<generate with: openssl rand -base64 32>
ALLOWED_EMAILS=user1@gmail.com,user2@gmail.com
AUTH_TRUST_HOST=true
```

### 5. Publish the OAuth consent screen (for production)

While in "Testing" mode, only the test users you added can sign in. To allow any Google account (filtered by `ALLOWED_EMAILS`):

1. Go to **APIs & Services → OAuth consent screen**
2. Click **Publish App**
3. Confirm the prompt

> **Note**: For External apps requesting only basic scopes (openid, email, profile), Google does not require a verification review.

---

## Render Deployment Guide

Step-by-step instructions to deploy the app on Render using the `render.yaml` Blueprint.

### 1. Push your code to GitHub

Make sure the repository (with `render.yaml` at the root) is pushed to GitHub.

### 2. Create a Render account

1. Go to [Render](https://render.com/) and sign up (GitHub sign-in recommended)

### 3. Deploy via Blueprint

1. In the Render dashboard, click **New → Blueprint**
2. Connect your GitHub repository
3. Render will detect the `render.yaml` and show the two services:
   - **aias-backend** (Web Service, free tier)
   - **aias-frontend** (Web Service, free tier)
4. Click **Apply**

### 4. Configure environment variables

After the Blueprint creates the services, some env vars need manual values:

**Frontend service (`aias-frontend`)**:

1. Go to the frontend service → **Environment**
2. Set these variables:
   - `AUTH_GOOGLE_ID` — your Google OAuth Client ID
   - `AUTH_GOOGLE_SECRET` — your Google OAuth Client Secret
   - `ALLOWED_EMAILS` — comma-separated list of allowed emails (leave empty to allow all)
3. `AUTH_SECRET` is auto-generated by the Blueprint
4. `AUTH_TRUST_HOST` is pre-set to `true`
5. `BACKEND_INTERNAL_URL` is auto-populated from the backend service's external URL

**Backend service (`aias-backend`)**:

1. Go to the backend service → **Environment**
2. Set:
   - `ALLOWED_ORIGINS` — your frontend's public URL, e.g., `https://aias-frontend.onrender.com`

### 5. Update Google OAuth redirect URIs

After deployment, copy your frontend's public URL from Render and go back to GCP:

1. Go to **APIs & Services → Credentials** → click your OAuth client
2. Add to **Authorized JavaScript origins**:
   - `https://aias-frontend.onrender.com` (your actual Render URL)
3. Add to **Authorized redirect URIs**:
   - `https://aias-frontend.onrender.com/api/auth/callback/google`
4. Click **Save**

### 6. Trigger a redeploy

After setting all env vars and updating GCP, trigger a manual deploy for both services:

1. Go to each service in Render → **Manual Deploy → Deploy latest commit**

### 7. Verify

1. Visit your frontend URL (e.g., `https://aias-frontend.onrender.com`)
2. You should be redirected to the login page
3. Sign in with a Google account that's in your `ALLOWED_EMAILS` list
4. You should be redirected to the main app
5. Test the full workflow: upload a file, generate a transcript, generate a summary
6. Verify streaming works (summary text appears incrementally)

### Troubleshooting

| Issue                         | Solution                                                                                                                                 |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| "redirect_uri_mismatch" error | Ensure the redirect URI in GCP exactly matches `https://<your-domain>/api/auth/callback/google`                                          |
| 401 errors on API calls       | Check that `BACKEND_INTERNAL_URL` is set correctly on the frontend service                                                               |
| Backend unreachable           | Verify the backend is running (check Render logs). Check that `BACKEND_INTERNAL_URL` on the frontend service points to the backend's URL |
| "Access denied" on sign-in    | Check `ALLOWED_EMAILS` — the signing-in user's email must be in the list (or the list must be empty)                                     |
| OAuth consent screen errors   | Make sure the consent screen is published if using External user type in production                                                      |
