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
  - [Session Data Persistence](#session-data-persistence)
  - [API Client](#api-client)
  - [Streaming Responses](#streaming-responses-frontend)
  - [localStorage & API Keys](#localstorage--api-keys)
  - [Styling & Theme](#styling--theme)
  - [shadcn/ui Components](#shadcnui-components)
  - [Types](#types)
- [End-to-End Data Flows](#end-to-end-data-flows)
- [Common Tasks](#common-tasks)
- [GCP Setup Guide (Google OAuth)](#gcp-setup-guide-google-oauth)

---

## Project Overview

AIAudioSummary is a web app for uploading or recording audio files (meeting recordings) and generating transcripts + AI-powered summaries. It supports two modes:

- **Standard mode**: Upload/record audio → batch transcription → streaming summary generation
- **Realtime mode**: Live microphone capture → streaming transcription via WebSocket → periodic incremental summaries

It uses:

- **AssemblyAI** for speech-to-text (batch SDK + streaming WebSocket API)
- **Multi-provider LLM support** (OpenAI, Anthropic, Google Gemini, Azure OpenAI) via `pydantic-ai` for summarization
- **AI Chatbot** — floating assistant overlay with Q&A knowledge base, transcript context (standard + realtime live transcript), agentic app control, and voice input
- **Next.js 16** frontend with shadcn/ui
- **FastAPI** backend with WebSocket support
- **Google OAuth** (via Auth.js v5) for authentication with database-driven access control
- **Docker Compose** for self-hosted deployment (Hetzner)

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
│   │   ├── realtime/router.py    #   WS /ws/realtime, POST /createIncrementalSummary
│   │   ├── prompt_assistant/router.py  #   POST /prompt-assistant/analyze, POST /prompt-assistant/generate
│   │   ├── live_questions/router.py    #   POST /live-questions/evaluate
│   │   ├── form_output/router.py     #   POST /form-output/fill
│   │   ├── chatbot/router.py      #   POST /chatbot/chat, GET /chatbot/knowledge, WS /chatbot/ws/voice
│   │   ├── auth/router.py         #   GET /auth/verify (no auth required)
│   │   └── users/router.py        #   GET /users/me, GET /users, POST /users, DELETE /users/{id}
│   ├── service/                    # Service layer (business logic)
│   │   ├── assembly_ai/core.py    #   AssemblyAIService
│   │   ├── llm/core.py            #   LLMService (multi-provider)
│   │   ├── misc/core.py           #   MiscService (speakers, dates)
│   │   ├── realtime/             #   RealtimeTranscriptionService, SessionManager
│   │   ├── prompt_assistant/core.py  #   PromptAssistantService (analyze + generate)
│   │   ├── live_questions/core.py    #   LiveQuestionsService (strict LLM evaluation)
│   │   ├── form_output/core.py      #   FormOutputService (structured form filling)
│   │   ├── chatbot/core.py        #   ChatbotService (chat, knowledge base, actions)
│   │   ├── chatbot/actions.py     #   ACTION_REGISTRY (available chatbot actions)
│   │   ├── auth/core.py           #   AuthService (email verification against DB)
│   │   └── users/core.py          #   UsersService (CRUD, name sync)
│   ├── dependencies/               # FastAPI dependencies
│   │   └── auth.py                #   get_current_user (HS256 JWT validation), require_admin
│   ├── models/                     # Pydantic request/response models
│   │   ├── assemblyai.py
│   │   ├── config.py
│   │   ├── llm.py
│   │   ├── realtime.py            #   IncrementalSummaryRequest/Response
│   │   ├── prompt_assistant.py    #   AssistantQuestion, AnalyzeRequest/Response, GenerateRequest/Response
│   │   ├── live_questions.py      #   EvaluateQuestionsRequest/Response, QuestionInput, QuestionEvaluation
│   │   ├── form_output.py        #   FormFieldType, FormFieldDefinition, FillFormRequest/Response
│   │   └── chatbot.py            #   ChatRole, ChatMessage, ActionProposal, ChatRequest/ChatResponse
│   ├── db/                         # Database layer (SQLAlchemy async)
│   │   ├── engine.py              #   async_engine, AsyncSessionLocal, get_db(), Base
│   │   └── models.py              #   User ORM model (id, email, name, role, preferences, storage_mode)
│   ├── alembic/                    # Database migrations (Alembic)
│   │   ├── env.py                 #   Async migration runner
│   │   ├── script.py.mako         #   Migration file template
│   │   └── versions/
│   │       └── 0001_initial_users.py  #   Creates users table
│   ├── utils/
│   │   ├── helper.py              # File listing & reading utilities
│   │   └── logging.py             # Logger configuration
│   ├── prompt_templates/           # Markdown prompt files (loaded dynamically)
│   ├── alembic.ini                 # Alembic configuration
│   ├── config.py                   # Pydantic BaseSettings (from .env)
│   ├── main.py                     # FastAPI app entry point (lifespan: runs migrations + seeds admins)
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
│   │   │   ├── admin/page.tsx      # Admin panel (role-guarded, user management)
│   │   ├── login/page.tsx      # Google sign-in page
│   │   │   ├── layout.tsx          # Root layout (dark mode, font, toaster, SessionWrapper)
│   │   │   ├── page.tsx            # Main orchestrator (all state lives here)
│   │   │   └── globals.css         # Theme variables, animations
│   │   ├── components/
│   │   │   ├── admin/              # AddUserDialog, DeleteUserDialog
│   │   ├── auth/               # SessionWrapper, UserMenu, StorageModeDialog, ConfigExportDialog
│   │   │   ├── layout/             # Header, Footer, StepIndicator, SettingsSheet
│   │   │   ├── settings/           # ApiKeyManager, ProviderSelector, ModelSelector, AzureConfigForm
│   │   │   ├── workflow/           # FileUpload, AudioRecorder, TranscriptView, SpeakerMapper, PromptEditor (+ Prompt Assistant trigger), SummaryView
│   │   │   ├── realtime/          # RealtimeMode, RealtimeControls, RealtimeTranscriptView, RealtimeSummaryView, ConnectionStatus
│   │   │   ├── live-transcript/   # LiveQuestions, LiveQuestionItem, AddQuestionInput, useLiveQuestions hook
│   │   │   ├── form-output/      # FormTemplateEditor, FormTemplateSelector, FormOutputView, RealtimeFormOutput, useFormOutput hook
│   │   │   ├── prompt-assistant/  # PromptAssistantModal, StepBasePrompt, StepQuestions, StepSummary, StepResult, QuestionField, usePromptAssistant hook
│   │   │   ├── chatbot/          # ChatbotFAB, ChatbotModal, ChatMessage, ChatMessageList, ChatInputBar, TranscriptBadge, ActionConfirmCard
│   │   │   └── ui/                 # shadcn/ui primitives + AudioPlayer composite component
│   │   ├── hooks/
│   │   │   ├── useApiKeys.ts       # localStorage key management
│   │   │   ├── useConfig.ts        # Backend config fetching
│   │   │   ├── useCustomTemplates.ts # Custom prompt template CRUD (localStorage + server sync)
│   │   │   ├── useFormTemplates.ts  # Form template CRUD (localStorage + server sync)
│   │   │   ├── usePreferences.ts   # Server preference sync (loads on mount, fire-and-forget saves)
│   │   │   ├── useSessionPersistence.ts # Session data persistence (localStorage: transcript, summary, form output, questions)
│   │   │   ├── useRealtimeSession.ts # Realtime session lifecycle (WS, audio, transcript, summary timer)
│   │   │   └── useChatbot.ts      # Chatbot hook (messages, streaming, actions, persistent voice session, mic device selection)
│   │   └── lib/
│   │       ├── api.ts              # Centralized API client (routes through /api/proxy)
│   │       ├── config-export.ts    # Settings export/import: collect, serialize, compress (pako), encode (Base64), validate, restore
│   │       ├── errors.ts           # getErrorMessage() — maps ApiError status codes to user-friendly strings
│   │       ├── types.ts            # TypeScript types (mirrors backend models)
│   │       └── utils.ts            # cn() Tailwind merge utility
│   ├── public/
│   │   └── pcm-worklet-processor.js  # AudioWorklet for PCM16 capture
│   ├── package.json
│   └── next.config.ts
│
├── docker-compose.yml              # Docker Compose for local and self-hosted deployment (includes postgres service)
├── .env.example                    # Root env template for Docker Compose (POSTGRES_*, AUTH_SECRET, INITIAL_ADMINS)
├── docs/                           # Documentation
├── user_stories/                   # Feature specifications
└── CLAUDE.md                       # AI assistant instructions
```

---

## Deployment Architecture

### Request Flow

Both services run in Docker containers (orchestrated by Docker Compose). All API calls from the browser go through a Next.js API proxy route which checks authentication before forwarding to the backend. The backend is technically reachable directly, but since it uses BYOK (users supply their own API keys per-request), there are no stored secrets to abuse.

```
Browser (client)
    │
    ├── HTTP ──► Next.js Frontend (Docker container)
    │                ├── proxy.ts ── checks auth session, redirects to /login if unauthenticated
    │                ├── /api/auth/* ── Auth.js handles Google OAuth flow
    │                └── /api/proxy/* ── forwards requests to backend
    │                        │
    │                        ▼
    │                FastAPI Backend (Docker container)
    │                    └── /createTranscript, /createSummary, /getConfig, etc.
    │
    └── WebSocket ──► FastAPI Backend (direct, bypasses proxy)
                         ├── /ws/realtime (realtime transcription relay)
                         └── /chatbot/ws/voice (chatbot voice input relay)
```

The HTTP proxy route forwards requests from the frontend container to the backend container via `BACKEND_INTERNAL_URL` (Docker internal network: `http://backend:8080`). The WebSocket connections go directly from the browser to the backend — they bypass the Next.js proxy because Auth.js session cookies are not sent over WebSocket connections. Authentication for WebSocket connections is handled via the AssemblyAI API key sent in the init message.

### Authentication (Google OAuth)

Authentication uses **Auth.js v5** (`next-auth@beta`) with the Google provider.

| File                                      | Purpose                                                                                              |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `src/auth.ts`                             | Auth.js config: Google provider, email allowlist from `ALLOWED_EMAILS` env var, custom `/login` page |
| `src/app/api/auth/[...nextauth]/route.ts` | Auth.js route handler (GET/POST for OAuth callbacks)                                                 |
| `src/app/login/page.tsx`                  | Server Component login page with "Sign in with Google" button                                        |
| `src/components/auth/SessionWrapper.tsx`  | Client `<SessionProvider>` wrapper (needed because `layout.tsx` is a Server Component)               |
| `src/components/auth/UserMenu.tsx`        | Client component: dropdown with user avatar, storage mode toggle, config export/import, admin panel link, and sign-out     |
| `src/components/auth/StorageModeDialog.tsx` | Dialog for switching between local and account storage modes (uploads/downloads preferences)       |
| `src/components/auth/ConfigExportDialog.tsx` | Dialog for exporting/importing settings as a portable compressed config string                    |

**Database access control**: The `signIn` callback in `auth.ts` calls `GET {BACKEND_INTERNAL_URL}/auth/verify?email=...` server-side. Only emails that exist in the `users` DB table are allowed in. Denied users are redirected to `/login?error=AccessDenied`. The `jwt` callback fetches the user's `role` and stores it in the session token; the `session` callback exposes it as `session.user.role`.

### API Proxy Layer

`src/app/api/proxy/[...path]/route.ts` is a catch-all route handler that:

1. Checks the user's auth session (returns 401 if unauthenticated)
2. Reads `BACKEND_INTERNAL_URL` env var (default `http://localhost:8080`)
3. Creates a short-lived HS256 JWT (2-minute expiry) signed with `AUTH_SECRET`, containing `{email, name, role}` from the session, and adds it as `Authorization: Bearer <token>` for the backend to validate
4. Forwards the request method, headers (stripping `host`, `cookie`, `connection`), query params, and body
5. **Streaming**: Detects `content-type: text/plain` responses and passes the `ReadableStream` directly through — this preserves chunk-by-chunk delivery for `/createSummary`
6. **File uploads**: Passes `request.body` as a raw stream with `duplex: "half"` for multipart/form-data
7. **204 No Content**: Returns `new Response(null, { status: 204 })` — the HTTP spec requires 204 responses to have a null body

### Route Protection

`src/proxy.ts` is the Next.js 16 proxy file (replaces `middleware.ts`). It runs on every request and:

- **Allows through** without auth: `/login`, `/api/auth/*`, `/_next/*`, `/favicon.ico`
- **Redirects** unauthenticated users to `/login` for all other routes

### Environment Variables

| Variable               | Service  | Default                 | Description                                                  |
| ---------------------- | -------- | ----------------------- | ------------------------------------------------------------ |
| `BACKEND_INTERNAL_URL`        | Frontend | `http://localhost:8080` | Backend URL for HTTP proxy (set to `http://backend:8080` in Docker)  |
| `NEXT_PUBLIC_BACKEND_WS_URL` | Frontend | `ws://localhost:8080`   | Backend WebSocket URL for realtime transcription (direct)    |
| `AUTH_GOOGLE_ID`              | Frontend | —                       | Google OAuth client ID                                       |
| `AUTH_GOOGLE_SECRET`   | Frontend | —                       | Google OAuth client secret                                   |
| `AUTH_SECRET`          | Frontend | —                       | Random secret for session encryption                         |
| ~~`ALLOWED_EMAILS`~~   | Frontend | (removed)               | Replaced by database-driven access control (US-04)           |
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
- The **chatbot service** (`service/chatbot/`) contains:
  - `ChatbotService` (`core.py`): manages chat conversations with streaming, system prompt assembly based on enabled capabilities (Q&A, transcript context, actions), knowledge base loading from `usage_guide/usage_guide.md`, and conversation history trimming (last 20 messages)
  - `actions.py`: `ACTION_REGISTRY` — list of available chatbot actions (change theme, switch app mode, change provider/model, toggle settings, open settings, update API key). Each action has an `action_id`, `description`, and typed `params` schema. Also includes `PROVIDER_MODELS` — a mapping of valid models per provider used for LLM-side and frontend-side validation.
  - The chatbot router (`api/chatbot/router.py`) exposes three endpoints:
    - `POST /chatbot/chat` — streaming chat (same `StreamingResponse` pattern as `/createSummary`)
    - `GET /chatbot/knowledge` — returns knowledge base loaded status and size
    - `WS /chatbot/ws/voice` — persistent voice input relay to AssemblyAI. The WebSocket stays open for the lifetime of the chatbot and supports multiple recording sessions via `start`/`stop` commands (AAI connects on `start`, terminates on `stop`). This avoids re-establishing the connection on every mic-press.
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

| File                         | Key Classes                                                                                      |
| ---------------------------- | ------------------------------------------------------------------------------------------------ |
| `models/llm.py`              | `LLMProvider` (enum), `CreateSummaryRequest`, `CreateSummaryResponse`, `AzureConfig`             |
| `models/config.py`           | `ConfigResponse`, `ProviderInfo`, `PromptTemplate`, `LanguageOption`, speaker models             |
| `models/assemblyai.py`       | `CreateTranscriptResponse`                                                                       |
| `models/realtime.py`         | `IncrementalSummaryRequest`, `IncrementalSummaryResponse`                                        |
| `models/prompt_assistant.py` | `QuestionType` (enum), `AssistantQuestion`, `AnalyzeRequest`, `AnalyzeResponse` (incl. `suggested_target_system`), `GenerateRequest/Response` |
| `models/live_questions.py`   | `QuestionInput`, `EvaluateQuestionsRequest`, `QuestionEvaluation`, `EvaluateQuestionsResponse`                                                    |
| `models/form_output.py`     | `FormFieldType` (enum), `FormFieldDefinition`, `FillFormRequest`, `FillFormResponse`             |
| `models/chatbot.py`         | `ChatRole` (enum), `ChatMessage`, `ActionProposal`, `ChatRequest`, `ChatResponse`                |

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
| `DATABASE_URL`              | `""` (disabled)         | Async SQLAlchemy URL (`postgresql+asyncpg://...`); if empty, DB is skipped |
| `AUTH_SECRET`               | `""` (disabled)         | Shared JWT secret (must match frontend `AUTH_SECRET`) |
| `INITIAL_ADMINS`            | `""` (none)             | Comma-separated emails to seed as admin on startup |

To add a new setting: add a field to `Settings` in `config.py`, add the corresponding variable to `.env` and `.env.example`.

### Database Layer

The backend uses **async SQLAlchemy 2.x** with **asyncpg** and **Alembic** for schema migrations.

| File | Purpose |
| ---- | ------- |
| `db/engine.py` | `async_engine`, `AsyncSessionLocal`, `get_db()` FastAPI dependency, `Base` declarative base |
| `db/models.py` | `User` ORM model |
| `alembic/` | Migration scripts (run automatically on startup) |
| `alembic.ini` | Alembic configuration |

**`User` table** (`users`):

| Column | Type | Notes |
| ------ | ---- | ----- |
| `id` | `INTEGER` | Auto-increment primary key |
| `email` | `VARCHAR(255)` | Unique, not null |
| `name` | `VARCHAR(255)` | Nullable |
| `role` | `VARCHAR(50)` | `'user'` or `'admin'`, default `'user'` |
| `preferences` | `JSONB` | Nullable; server-side preference storage |
| `storage_mode` | `VARCHAR(10)` | `'local'` or `'account'`, default `'local'` |
| `created_at` | `TIMESTAMPTZ` | Server default `now()` |
| `updated_at` | `TIMESTAMPTZ` | Server default `now()`, updated on write |

**Startup behaviour** (in `main.py` lifespan):
1. If `DATABASE_URL` is set: runs `alembic upgrade head` in a thread executor (keeps async event loop clean), then seeds any emails in `INITIAL_ADMINS` as `role='admin'`.
2. If `DATABASE_URL` is empty: skips DB setup with a warning — existing functionality is unaffected.

**Using the DB in a router**:
```python
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from db.engine import get_db

@router.get("/example")
async def example(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User))
    return result.scalars().all()
```

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

> **Note**: The **Prompt Assistant** (`/prompt-assistant/analyze` and `/prompt-assistant/generate`) also does **not** use the prompt template system. It uses two hardcoded system prompts defined in `service/prompt_assistant/core.py`. Key constraints baked into the analysis prompt: always assume GitHub-Flavored Markdown (never ask the user about it); never ask about target language (handled separately in Prompt Settings); never ask about target system / output destination (injected programmatically — see below); never suggest "Links & references" as a section option (links from chats are not part of transcripts). The generation prompt includes explicit tailoring rules for each supported target system.

> **Note**: The **Chatbot** (`/chatbot/chat`) does **not** use the prompt template system. Its system prompt is assembled dynamically in `ChatbotService._build_system_prompt()` based on enabled capabilities (Q&A, transcript context, agentic actions). The knowledge base is loaded from `backend/usage_guide/usage_guide.md` (cached in memory). The action registry (`service/chatbot/actions.py`) includes `PROVIDER_MODELS` for model validation and `ACTION_REGISTRY` for available actions — both are serialized into the system prompt when actions are enabled.

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

CORS origins are configured via the `ALLOWED_ORIGINS` env var (comma-separated). Defaults to `http://localhost:3000` for local development. In production, set this to your frontend's public domain (e.g., `https://klartextai.com`).

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
- **2 -> 3**: `handleGenerate()` — calls `/createSummary` with streaming (forward navigation goes directly without confirmation)
- **3 -> 2**: "Back to Transcript" button
- **3 -> 1**: "Start Over" returns to step 1 but transcript/summary persist in localStorage until a new file is uploaded
- **On mount**: step is derived from loaded session data (e.g., if transcript + summary exist, starts at step 3)
- **"Show previous" links**: allow returning to existing transcript/summary/form data from earlier steps

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

**Always-mounted**: `RealtimeMode` is always mounted in the DOM (hidden with CSS `display: none` when in standard mode) so that WebSocket connections and session state survive mode switching. Initial values (transcript, summary, questions, form values) are passed as props from `useSessionPersistence`.

The `useRealtimeSession` hook manages the entire lifecycle:
1. **Start**: getUserMedia → AudioContext → AudioWorklet (PCM16 @ 16kHz, buffered in 100ms chunks) → WebSocket to backend → relay to AssemblyAI
2. **During session**: transcript accumulates from WS `turn` events; summary timer fires at configurable interval (1-10 min, set in Settings panel) calling `POST /createIncrementalSummary`; countdown timer (`mm:ss`) shown in controls bar; timer pauses when recording is paused and restarts on resume
3. **Manual summary**: "Refresh Summary" button in controls triggers immediate summary and resets the auto-timer from that point
4. **Stop**: sends stop message → closes WS → triggers final full-transcript summary → shows copy buttons

**Clear actions**: Each realtime panel has a trash icon with a confirmation dialog:
- **Live Transcript**: trash icon left of copy button, clears accumulated transcript via `clearTranscript()` on `useRealtimeSession`
- **Summary**: trash icon left of fullscreen button, clears summary via `clearSummary()` on `useRealtimeSession`
- **Questions & Topics**: trash icon in header, clears all questions via `clearAll()` on `useLiveQuestions`
- **Form Output**: "No template" option added to template dropdown to deselect the current template

### Component Hierarchy

```
RootLayout (layout.tsx)
└── SessionWrapper             ← Auth.js SessionProvider (client boundary)
    │
    ├── /login ── LoginPage    ← Server Component, redirects to / if authenticated
    │
    └── / ── Home (page.tsx) ─── Outer shell: useConfig() + usePreferences(), loading gate
        └── HomeInner ──────────── All state lives here (mounts after prefs loaded)
        ├── Header
        │   ├── UserMenu       ← dropdown: avatar, storage mode, config export/import, admin panel link, sign-out
        │   │   ├── StorageModeDialog ← upload/download prefs when switching storage modes
        │   │   └── ConfigExportDialog ← export/import settings as portable compressed config string (CFG1_ prefix + Base64 + pako deflate)
        │   └── Settings gear icon
        ├── SettingsSheet (right-side drawer, 380px)
        │   ├── ApiKeyManager          ← uses useApiKeys() hook
        │   ├── ProviderSelector       ← "Default AI Model" section
        │   ├── ModelSelector          ← dropdown or free-text input
        │   ├── AzureConfigForm        ← only if provider is azure_openai
        │   └── FeatureModelOverrides  ← collapsible per-feature model overrides
        │       ├── FeatureModelRow    ← one row per LLMFeature
        │       └── FeatureModelConfigModal ← dialog: ProviderSelector + ModelSelector + config form
        ├── Mode Tab Bar               ← [Standard] [Realtime] toggle
        │
        ├── (Standard mode):
        │   ├── StepIndicator          ← visual 3-step progress bar
        │   └── Step Content (conditional):
        │       ├── Step 1: tab toggle → FileUpload | AudioRecorder
        │       ├── Step 2: TranscriptView + SpeakerMapper + [Summary|Form Output] toggle
        │       │               ├── (Summary mode) PromptEditor
        │       │               │   └── PromptAssistantModal (Dialog)
        │       │               │       ├── StepBasePrompt, StepQuestions, StepSummary, StepResult
        │       │               └── (Form Output mode) FormTemplateSelector + FormTemplateEditor (Dialog)
        │       └── Step 3: TranscriptView (readonly) + SummaryView | FormOutputView
        │
        ├── RealtimeMode (always mounted, hidden via CSS when in standard mode):
        │   └── orchestrator, uses useRealtimeSession() + useFormOutput() + useLiveQuestions() hooks
        │       ├── RealtimeControls   ← Start/Pause/Stop, mic selector, elapsed timer, countdown + Refresh button
        │       │   └── ConnectionStatus
        │       ├── RealtimeTranscriptView  ← live transcript with auto-scroll + trash/clear icon
        │       ├── RealtimeSummaryView     ← markdown summary with periodic updates + trash/clear icon
        │       └── [Questions & Topics | Form Output] tab bar
        │           ├── LiveQuestions        ← questions + topics evaluation + clear all icon
        │           └── RealtimeFormOutput   ← live form filling with template selector ("No template" option)
        │
        ├── (Chatbot overlay, when chatbotEnabled):
        │   ├── ChatbotFAB            ← Floating action button (bottom-right, shifts when settings open)
        │   └── ChatbotModal          ← Chat panel, uses useChatbot() hook
        │       ├── ChatMessageList   ← Scrollable messages with auto-scroll, thinking indicator
        │       │   └── ChatMessage   ← User/assistant bubble, copy button, ActionConfirmCard
        │       ├── TranscriptBadge   ← Shows when transcript attached; live variant (green pulsing dot + bucketed word count) in realtime mode
        │       └── ChatInputBar     ← Text input, send button, mic button (voice input) + mic device selector dropdown
        │
        └── Footer                     ← Imprint / Privacy Policy / Cookie Settings links (each opens a Dialog)
```

### Adding a New Frontend Component

1. **Create the component** in the appropriate subdirectory:
   - `components/auth/` — authentication-related components (SessionWrapper, UserMenu)
   - `components/layout/` — structural/layout components
   - `components/settings/` — settings panel sub-components (including ChatbotSettings)
   - `components/workflow/` — standard mode step-specific workflow components
   - `components/realtime/` — realtime mode components (RealtimeMode, Controls, TranscriptView, SummaryView, ConnectionStatus)
   - `components/chatbot/` — chatbot overlay components (ChatbotFAB, ChatbotModal, ChatMessage, ChatMessageList, ChatInputBar, TranscriptBadge, ActionConfirmCard)

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

| State Category      | Persisted?         | Synced to server? | Storage Key Pattern         |
| ------------------- | ------------------ | ----------------- | --------------------------- |
| API keys            | Yes (localStorage) | **Never**         | `aias:v1:apikey:{provider}` |
| Azure config        | Yes (localStorage) | Yes               | `aias:v1:azure:{field}`     |
| Selected provider   | Yes (localStorage) | Yes               | `aias:v1:selected_provider` |
| Selected model      | Yes (localStorage) | Yes               | `aias:v1:model:{provider}`  |
| App mode            | Yes (localStorage) | Yes               | `aias:v1:app_mode`          |
| Realtime interval   | Yes (localStorage) | Yes               | `aias:v1:realtime_interval` |
| Feature overrides   | Yes (localStorage) | Yes               | `aias:v1:feature_overrides` |
| Auto key points     | Yes (localStorage) | Yes               | `aias:v1:auto_key_points`   |
| Speaker labels      | Yes (localStorage) | Yes               | `aias:v1:speaker_labels`    |
| Speaker count range | Yes (localStorage) | Yes               | `aias:v1:min_speakers`, `aias:v1:max_speakers` |
| Final summary toggle| Yes (localStorage) | Yes               | `aias:v1:realtime_final_summary` |
| Realtime sys prompt | Yes (localStorage) | Yes               | `aias:v1:realtime_system_prompt` |
| Custom templates    | Yes (localStorage) | Yes               | `aias:v1:custom_templates`  |
| Theme               | Yes (localStorage) | Yes               | `aias:v1:theme`             |
| Chatbot enabled     | Yes (localStorage) | Yes               | `aias:v1:chatbot_enabled`   |
| Chatbot Q&A toggle  | Yes (localStorage) | Yes               | `aias:v1:chatbot_qa`        |
| Chatbot transcript  | Yes (localStorage) | Yes               | `aias:v1:chatbot_transcript`|
| Chatbot actions     | Yes (localStorage) | Yes               | `aias:v1:chatbot_actions`   |
| Chatbot transcript mode | Yes (localStorage) | Yes           | `aias:v1:chatbot_transcript_mode` |
| Mic device ID       | Yes (localStorage) | No                | `aias:v1:mic_device_id` (shared by AudioRecorder, RealtimeControls, useChatbot) |
| Session data (std)  | Yes (localStorage) | No                | `aias:v1:session:standard:*` (transcript, summary, form, output_mode) |
| Session data (rt)   | Yes (localStorage) | No                | `aias:v1:session:realtime:*` (transcript, summary, form, questions) |
| Workflow state      | No (derived)       | No                | - (step derived from persisted session data on mount) |
| Prompt/language     | No                 | No                | -                           |
| Realtime session    | No (hook state)    | No                | -                           |
| Realtime transcript | No (page state)    | No                | - (lifted from RealtimeMode via onTranscriptChange for chatbot context) |
| Chatbot messages    | No (hook state)    | No                | -                           |

Pattern for persisted state (in `HomeInner`, which receives `serverPreferences` as a prop):

```tsx
// Prefer server preferences (account mode), fall back to localStorage
const [selectedProvider, setSelectedProvider] = useState<LLMProvider>(
  () => (serverPreferences?.selected_provider as LLMProvider) || safeGet("aias:v1:selected_provider", "openai") as LLMProvider,
);

const handleProviderChange = useCallback((provider: LLMProvider) => {
  setSelectedProvider(provider);
  safeSet("aias:v1:selected_provider", provider);
  savePreferences(); // fire-and-forget sync to server (only in account mode)
}, [savePreferences]);
```

### Session Data Persistence

The `useSessionPersistence` hook (`frontend/src/hooks/useSessionPersistence.ts`) persists session data to localStorage so transcripts, summaries, form outputs, and questions survive page reloads and navigation.

**Storage keys** follow the `aias:v1:session:` prefix convention:

| Mode | Persisted Fields |
|---|---|
| Standard | `transcript`, `summary`, `form_template_id`, `form_values`, `output_mode`, `updated_at` |
| Realtime | `transcript`, `summary`, `form_template_id`, `form_values`, `questions`, `updated_at` |

**Design decision**: localStorage only (no server sync). Session data can be very large (full transcripts, summaries, form output) and re-uploading on every preference change would be expensive. The primary use case is surviving page reloads on the same browser.

**How it works**:

- **Standard mode**: On mount, transcript, summary, form values, selected template, and output mode are initialized from localStorage. The current step is derived from the loaded data (e.g., transcript + summary present implies step 3).
- **Realtime mode**: `RealtimeMode` is always mounted (hidden via CSS when in standard mode) so WebSocket connections survive mode switching. Initial values (`initialTranscript`, `initialSummary`, `initialQuestions`, `initialValues`) are passed as props to sub-hooks.
- **"Start Over"**: Returns to step 1 but transcript/summary persist in localStorage until a new file is uploaded.
- **Step navigation**: Forward navigation (e.g., step 2 to 3) goes directly without confirmation. "Show previous transcript/summary/form" links allow returning to existing data.

**Sub-hooks that accept initial values**:

| Hook | Initial Value Props |
|---|---|
| `useRealtimeSession` | `initialTranscript`, `initialSummary` |
| `useLiveQuestions` | `initialQuestions` |
| `useFormOutput` | `initialValues` |

**Chatbot transcript mode** (`chatbot_transcript_mode`): Controls which transcript the chatbot uses as context. Stored as `aias:v1:chatbot_transcript_mode` in localStorage and synced via `usePreferences`.

| Value | Behaviour |
|---|---|
| `"current_mode"` (default) | Chatbot uses the transcript from the active Standard/Realtime mode |
| `"latest"` | Chatbot uses the most recently updated transcript regardless of current mode, comparing `updated_at` timestamps |

The setting is exposed as a radio group in `ChatbotSettings.tsx` (nested under the "Transcript Context" toggle). The type `ChatbotTranscriptMode` is defined in `lib/types.ts`.

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
| `analyzePrompt()`              | POST   | `/prompt-assistant/analyze`  | `PromptAssistantAnalyzeResponse`              |
| `generatePrompt()`             | POST   | `/prompt-assistant/generate` | `PromptAssistantGenerateResponse`             |
| `evaluateLiveQuestions()`      | POST   | `/live-questions/evaluate`   | `EvaluateQuestionsResponse`                   |
| `fillForm()`                   | POST   | `/form-output/fill`          | `FillFormResponse`                            |
| `chatbotChat()`                | POST   | `/chatbot/chat`              | `string` (streaming, same pattern as summary) |
| `getMe()`                      | GET    | `/users/me`                  | `UserProfile`                                 |
| `getUsers()`                   | GET    | `/users`                     | `UserProfile[]` (admin only)                  |
| `createUser(email, name?)`     | POST   | `/users`                     | `UserProfile` (admin only)                    |
| `deleteUser(id)`               | DELETE | `/users/{id}`                | `void` (admin only)                           |
| `getPreferences()`             | GET    | `/users/me/preferences`      | `PreferencesResponse`                         |
| `putPreferences(prefs)`        | PUT    | `/users/me/preferences`      | `PreferencesResponse`                         |
| `deletePreferences()`          | DELETE | `/users/me/preferences`      | `void`                                        |

Error handling: `ApiError` class with `status` and `message`. The `handleResponse<T>()` helper extracts `detail` from FastAPI error JSON. Use `getErrorMessage(error, context)` from `lib/errors.ts` in catch blocks to map `ApiError` status codes to user-friendly toast messages — never show raw backend error strings to the user.

`ErrorContext` values: `"summary"` | `"keyPoints"` | `"transcript"` | `"speakers"` | `"analyze"` | `"generate"` | `"regenerate"` | `"chatbot"` | `"formOutput"`. The `analyze`/`generate`/`regenerate` contexts are used by the Prompt Assistant hook; `chatbot` is used by the `useChatbot` hook; `formOutput` is used by the form output feature.

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

The `usePreferences` hook syncs non-API-key preferences between localStorage and the server:

```tsx
const { storageMode, setStorageMode, isLoading, serverPreferences, savePreferences } = usePreferences();
```

- On mount (when the user is authenticated): fetches `GET /users/me` to determine `storage_mode`, then if `"account"` fetches `GET /users/me/preferences`, writes them to localStorage via `applyPreferences()`, and stores them in `serverPreferences` state. All state updates (`setStorageMode`, `setServerPreferences`, `setIsLoading`) are batched after async work completes to avoid mid-flight cancellation.
- The outer `Home` component passes `serverPreferences` directly to `HomeInner` as a prop. `HomeInner`'s `useState` initialisers prefer `serverPreferences` over localStorage, ensuring correct values even if `applyPreferences()` fails.
- `savePreferences()`: fire-and-forget `PUT /users/me/preferences` — collects current non-API-key values from localStorage and pushes them to the server. Called after every settings change handler in `page.tsx` (only actually sends if `storageMode === "account"`).
- API keys are **never** included in the synced payload.
- The `StorageModeDialog` handles initial upload (local → account) and download (account → local) of preferences, including all synced fields.

| Key                             | Contents                        | Synced? |
| ------------------------------- | ------------------------------- | ------- |
| `aias:v1:apikey:assemblyai`     | AssemblyAI API key              | Never   |
| `aias:v1:apikey:openai`         | OpenAI API key                  | Never   |
| `aias:v1:apikey:anthropic`      | Anthropic API key               | Never   |
| `aias:v1:apikey:gemini`         | Gemini API key                  | Never   |
| `aias:v1:apikey:azure_openai`   | Azure OpenAI API key            | Never   |
| `aias:v1:azure:api_version`     | Azure API version               | Yes     |
| `aias:v1:azure:endpoint`        | Azure endpoint URL              | Yes     |
| `aias:v1:azure:deployment_name` | Azure deployment name           | Yes     |
| `aias:v1:selected_provider`     | Currently selected LLM provider | Yes     |
| `aias:v1:model:{provider}`      | Selected model per provider     | Yes     |
| `aias:v1:app_mode`              | App mode (`standard` or `realtime`) | Yes |
| `aias:v1:realtime_interval`     | Realtime auto-summary interval (minutes: 1/2/3/5/10) | Yes |
| `aias:v1:feature_overrides`     | JSON: per-feature model overrides (`Partial<Record<LLMFeature, FeatureModelOverride>>`); features: `summary_generation`, `realtime_summary`, `key_point_extraction`, `prompt_assistant`, `live_question_evaluation`, `form_output` | Yes |
| `aias:v1:auto_key_points`       | Auto-extract key points toggle (`"true"`/`"false"`) | Yes |
| `aias:v1:speaker_labels`        | Auto-suggest speaker names from transcript (`"true"`/`"false"`) | Yes |
| `aias:v1:min_speakers`          | Minimum expected speakers (number) | Yes  |
| `aias:v1:max_speakers`          | Maximum expected speakers (number) | Yes  |
| `aias:v1:realtime_final_summary`| Generate final summary on stop (`"true"`/`"false"`) | Yes |
| `aias:v1:realtime_system_prompt`| Custom realtime summary system prompt | Yes |
| `aias:v1:custom_templates`      | JSON array of custom prompt templates (`PromptTemplate[]`) | Yes |
| `aias:v1:form_templates`        | JSON array of form templates (`FormTemplate[]`) for structured form output | Yes |
| `aias:v1:chatbot_transcript_mode` | Chatbot transcript source: `"current_mode"` or `"latest"` | Yes |
| `aias:v1:session:standard:*`   | Standard mode session data (transcript, summary, form_template_id, form_values, output_mode, updated_at) | No |
| `aias:v1:session:realtime:*`   | Realtime mode session data (transcript, summary, form_template_id, form_values, questions, updated_at) | No |

### Styling & Theme

- **Theme support**: Light / Dark / System (follows OS preference). Managed by `next-themes` (`ThemeProvider` in `layout.tsx`, stored as `aias:v1:theme` in localStorage).
- **Theme toggle**: `ThemeToggle` button in the header (between UserMenu and Settings) cycles Light → Dark → System.
- **Dark mode background**: `#0A0A0A` (near-black); **Light mode background**: `#FAFAFA`
- **Accent color**: `#FC520B` (orange) — same in both themes
- **Dark cards**: `#141414`; **Light cards**: `#FFFFFF`

CSS variables are structured in `globals.css`:
- `:root` — light mode values
- `.dark` — dark mode overrides (class applied to `<html>` by `next-themes`)

All components use Tailwind utility classes that reference CSS variables (e.g., `bg-card`, `text-foreground`, `border-border`). No hardcoded hex colors in component files.

Semantic colors (differ per theme):

| Variable        | Dark Value | Light Value | Usage              |
| --------------- | ---------- | ----------- | ------------------ |
| `--primary`     | `#FC520B`  | `#FC520B`   | Buttons, accents   |
| `--color-success`     | `#22C55E`  | `#16A34A`   | Saved indicators   |
| `--color-warning`     | `#F59E0B`  | `#D97706`   | Missing key badges |
| `--destructive` | `#EF4444`  | `#DC2626`   | Error states       |
| `--color-info`        | `#3B82F6`  | `#2563EB`   | Info messages      |

Custom animations:

- `.streaming-cursor` — blinking orange cursor character (`▊`) during streaming (used in SummaryView as an inline `<span>`; in the chatbot, a CSS `::after` pseudo-element on `.streaming-active` appends the cursor to the last markdown element)
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

Currently used: `badge`, `button`, `card`, `checkbox`, `collapsible`, `dialog`, `dropdown-menu`, `input`, `label`, `scroll-area`, `select`, `separator`, `sheet`, `skeleton`, `slider`, `sonner`, `switch`, `tabs`, `textarea`, `tooltip`.

`components/ui/audio-player.tsx` is a custom composite component (not generated by shadcn CLI) that combines `Button` and `Slider` into a dark-themed audio playback widget with play/pause, seek bar, time display, mute toggle, and volume control. It is used by `AudioRecorder` to preview recordings after they are stopped.

`components/ui/theme-toggle.tsx` is a custom component that renders a ghost icon button cycling through Light / Dark / System themes using `useTheme` from `next-themes`. Placed in the header between UserMenu and Settings.

`components/ui/Logo.tsx` is a custom component that renders the branded wordmark: an `AudioLines` Lucide icon + "AI" (orange accent, bold) + "Audio Summary" (foreground, semibold, hidden on mobile). Wrapped in a `<Link href="/">` with a hover opacity effect.

The `cn()` utility from `lib/utils.ts` merges Tailwind classes without conflicts:

```tsx
import { cn } from "@/lib/utils";

<div className={cn("px-4", isActive && "bg-primary")} />;
```

### Types

`lib/types.ts` mirrors the backend Pydantic models as TypeScript interfaces:

```tsx
export type LLMProvider = "openai" | "anthropic" | "gemini" | "azure_openai";
export type ChatbotTranscriptMode = "current_mode" | "latest";

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

### Prompt Assistant Flow

```
User clicks "Prompt Assistant" button in PromptEditor (Step 2)
    │  (button is disabled when no LLM API key is configured)
    ▼
PromptAssistantModal opens (Dialog)
    │  LLM credentials (provider, api_key, model, azure_config) passed as props from page.tsx
    │  usePromptAssistant hook initialises with currentPrompt pre-filled
    │
    ▼
Step 1 — StepBasePrompt
    ├── User pastes an existing prompt (optional)
    ├── Clear (trash) icon next to the label clears the textarea (only shown when field has content)
    ├── Clicks "Next" → analyzes the prompt as-is
    ├── Clicks "Skip" → clears the field and calls analyze with no base_prompt
    │   Loading text: "Analyzing your prompt..." (with text) / "Generating questions..." (empty)
    │
    ▼
api.ts: analyzePrompt() → POST /prompt-assistant/analyze
    │  Body: { provider, api_key, model, azure_config, base_prompt? }
    │
    ▼
PromptAssistantService.analyze():
    ├── _create_model() — same factory as LLMService
    ├── pydantic-ai Agent with output_type=AnalyzeResponse (structured output)
    ├── System prompt constraints: assume GFM, skip language question, skip target system question,
    │   exclude "Links & references"; when base prompt present, also infer suggested_target_system
    ├── Returns 3–5 AssistantQuestion objects (type: single_select | multi_select | free_text)
    │   with options, defaults, and inferred flags where answers derive from the base prompt
    ├── Service injects "target_system" as the FIRST question (never delegated to the LLM):
    │   options: Email | Chat message | Wiki article | User story | Personal notes | custom
    │   default logic:
    │     - No base prompt → default "Email"
    │     - Base prompt + LLM inferred target → pre-selected + "Inferred from your prompt" badge
    │     - Base prompt + LLM could not infer → no default (user must choose)
    │
    ▼
Step 2 — StepQuestions
    ├── QuestionField renders each question by type:
    │   ├── single_select → Select dropdown + "Other (custom)..." option
    │   │     Custom mode: inline Input with confirm/cancel; shown value with edit/clear buttons
    │   ├── multi_select  → Checkbox list + "Add custom option" (create/edit/delete custom items)
    │   └── free_text     → Textarea
    ├── Inferred answers show "Inferred from your prompt" badge + explanation text
    │
    ▼
Step 3 — StepSummary
    ├── Key-value table of all answers for review
    ├── "Anything else?" Textarea for additional notes
    ├── Clicks "Create Prompt"
    │
    ▼
api.ts: generatePrompt() → POST /prompt-assistant/generate
    │  Body: { provider, api_key, model, azure_config, base_prompt?, answers, additional_notes? }
    │
    ▼
PromptAssistantService.generate():
    ├── _create_model() — same factory as LLMService
    ├── pydantic-ai Agent (plain text output, temperature=0.4)
    ├── System prompt: output ONLY the ready-to-use system prompt string;
    │   target_system answer drives output format (email → subject/greeting/sign-off,
    │   chat → short/direct/no ceremony, wiki → structured/contextual, user story → AC format,
    │   personal notes → informal/abbreviations ok)
    ├── Returns GenerateResponse { generated_prompt }
    │
    ▼
Step 4 — StepResult
    ├── Editable Textarea pre-filled with generated prompt
    ├── Collapsible feedback section → "Regenerate" re-calls generate endpoint
    │   (feedback appended to additional_notes)
    ├── "Use this prompt" → calls onPromptGenerated(prompt) callback
    │
    ▼
PromptEditor: onPromptChange(generatedPrompt) — populates the Prompt textarea
    Modal closes, wizard resets on next open
```

### Chatbot Flow

```
User opens chatbot via floating action button (ChatbotFAB, bottom-right)
    │  Chatbot enabled by default (toggle in Settings → AI Chatbot)
    │  Four independently toggleable capabilities:
    │    - App Usage Q&A (knowledge base)
    │    - Transcript Context (auto-attaches transcript; source controlled by chatbot_transcript_mode setting — "current_mode" uses active mode, "latest" compares updated_at timestamps)
    │    - App Control (agentic actions)
    │    - Voice Input (via AssemblyAI realtime STT, persistent session, mic device selector)
    │
    ▼
ChatbotModal opens (fixed overlay, 420px wide, max 600px tall)
    │  useChatbot() hook manages: messages, streaming, actions, voice
    │  Resolves model config: chatbot feature override → default provider/model
    │
    ▼
User sends text message (or voice → auto-sent on final transcript)
    │
    ▼
useChatbot.sendMessage():
    ├── Creates user + empty assistant message in state
    ├── Builds ChatRequest: messages (last 20), provider, model, api_key,
    │   capability flags, transcript (if attached), stream=true
    │
    ▼
api.ts: chatbotChat(request, onChunk, signal)
    ├── POST /chatbot/chat (streaming, same pattern as /createSummary)
    │
    ▼
ChatbotService.chat():
    ├── _build_system_prompt():
    │   ├── Base: helpful assistant persona
    │   ├── If qa_enabled: appends usage_guide.md content (~37KB)
    │   ├── If transcript_enabled + transcript present: appends transcript
    │   ├── If actions_enabled: appends ACTION_REGISTRY JSON + constraints
    │   │   └── Constraints: no storage mode actions, only valid models per
    │   │       provider, don't confuse app mode with storage mode
    │   └── If confirmed_action: appends acknowledgment instruction
    ├── _build_messages(): trims to last 20 messages
    ├── Creates pydantic-ai Agent (temperature=0.7)
    ├── agent.run_stream() → StreamingResponse
    │
    ▼
Frontend: streaming uses direct DOM manipulation (bypasses React for zero-flicker)
    ├── useChatbot buffers chunks in a ref, flushes via requestAnimationFrame
    ├── Each rAF: marked.parse() converts accumulated text to HTML, writes innerHTML to [data-streaming-target], then sets scrollTop on [data-chat-scroll]
    ├── React state is only updated once when streaming completes (single re-render)
    ├── ChatMessage renders markdown in real-time during streaming (via marked), then ReactMarkdown + remarkGfm for finalized messages
    ├── After streaming completes: parseActionBlock() extracts ```action``` blocks
    │
    ▼
If action proposed:
    ├── ActionConfirmCard shown inline (confirm/cancel buttons)
    ├── User confirms → actionHandlers[action_id](params) executes
    │   ├── Frontend validates params (valid provider, valid model for provider, etc.)
    │   ├── On success: status = "confirmed"
    │   └── On error: status = "error"
    └── User cancels → status = "cancelled"
```

**Voice Input Flow (persistent session):**

The voice WebSocket + AudioWorklet are established once when the chatbot first opens and stay alive until the feature is disabled. Only `getUserMedia` + audio node wiring happen on each mic-press, making transcription start near-instantly.

```
Chatbot first opens (isChatOpen becomes true + has AssemblyAI key)
    │
    ▼
useChatbot.initVoiceSession():
    ├── Creates AudioContext (48kHz) + loads AudioWorklet (pcm-worklet-processor)
    ├── Opens persistent WebSocket: ws://backend:8080/chatbot/ws/voice
    ├── Sends init: {api_key, sample_rate: 16000}
    ├── Backend responds {type: "ready"} — session is now idle, ready for recordings
    │
    ▼
User clicks mic button (near-instant start)
    │
    ▼
useChatbot.startVoice():
    ├── Sends {type: "start"} to backend (triggers AAI connection, runs in parallel)
    ├── getUserMedia(deviceId) → microphone stream (uses selected device from dropdown)
    ├── Wires: mic source → AudioWorkletNode → worklet.port.onmessage → ws.send(binary)
    ├── Sets isVoiceActive = true immediately
    │   (audio sent during AAI handshake queues in WS buffer, forwarded once AAI connects)
    │
    ▼
Backend receives "start":
    ├── Connects to AssemblyAI streaming API (same as /ws/realtime)
    ├── Spawns relay task: AAI→browser (parses Turn events, sends transcripts)
    ├── Responds {type: "recording"} (informational)
    ├── Main loop forwards incoming binary audio to AAI
    │
    ▼
Browser receives transcript events:
    ├── is_final=true → appends to voiceText → synced into ChatInputBar input field
    ├── is_final=false → shown as live partial (italic, muted) after committed text
    │
    ▼
User clicks mic again (stop recording)
    │
    ▼
useChatbot.stopVoiceInternal():
    ├── Sends {type: "stop"} to backend (terminates AAI session, WS stays open)
    ├── Disconnects audio nodes, releases microphone
    ├── Appends any remaining partial to input
    └── User can review/edit text in input field, then send as chat message

Subsequent mic clicks repeat startVoice/stopVoiceInternal without reconnecting.
Session torn down when: chatbot disabled in settings, AAI key removed, or component unmounts.
```

**Microphone device selection:**

The chatbot shares the same `aias:v1:mic_device_id` localStorage key as `AudioRecorder` and `RealtimeControls`. When multiple audio input devices are available, a small chevron dropdown appears next to the mic button (split-button pattern) listing all devices via `navigator.mediaDevices.enumerateDevices()`. The selected device ID is passed to `getUserMedia({ audio: { deviceId: { exact: id } } })`. Device changes (plug/unplug) are detected via the `devicechange` event.

**Available Chatbot Actions:**

| Action ID | Description | Params | Frontend Validation |
|---|---|---|---|
| `change_theme` | Change app theme | `theme`: light/dark/system | Validates against allowed values |
| `switch_app_mode` | Switch standard/realtime | `mode`: standard/realtime | Validates against allowed values |
| `change_provider` | Change LLM provider | `provider`: enum | Validates against `config.providers` |
| `change_model` | Change LLM model | `model`: string | Validates model exists in current provider's model list |
| `toggle_speaker_key_points` | Toggle auto key points | `enabled`: boolean | — |
| `change_speaker_count` | Set speaker range | `min`, `max`: integer | — |
| `change_realtime_interval` | Set summary interval | `minutes`: 1/2/3/5/10 | — |
| `toggle_final_summary` | Toggle final summary | `enabled`: boolean | — |
| `update_api_key` | Set API key | `provider`, `key`: string | — |
| `open_settings` | Open settings panel | (none) | — |

> **Note**: Storage mode (local/account) is **not** available as a chatbot action. It requires the StorageModeDialog flow (avatar menu → Storage Mode) which involves data upload/download confirmation. The system prompt explicitly instructs the LLM to explain this to users.

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

### Extend the Prompt Assistant

**Add a new question type** (e.g., `number_input`):

1. **Backend**: Add the value to `QuestionType` enum in `models/prompt_assistant.py`
2. **Frontend**: Add the type to the `QuestionType` union in `lib/types.ts`
3. **Frontend**: Add a new `case` to `QuestionField.tsx`'s `renderInput()` switch

**Change what questions the LLM asks** (topics, constraints, option lists):

- Edit `_ANALYZE_SYSTEM_PROMPT` in `service/prompt_assistant/core.py`. The LLM generates options freely from its training knowledge — add explicit allowed lists or exclusion rules to the prompt to constrain output (e.g., the current prompt already excludes "Links & references" as a section option and forbids asking about Markdown flavor, target language, or target system).

**Add or change a programmatically injected question** (like `target_system`):

- These questions are built in `service/prompt_assistant/core.py` as `AssistantQuestion` objects and inserted into the response after the LLM call (e.g., `response.questions.insert(0, _TARGET_SYSTEM_QUESTION)`). The LLM is explicitly told in `_ANALYZE_SYSTEM_PROMPT` never to generate these questions itself. Use this pattern for questions that must always appear, have fixed options, or require logic (like defaulting) that the LLM cannot reliably provide.

**Change how the final prompt is generated**:

- Edit `_GENERATE_SYSTEM_PROMPT` in `service/prompt_assistant/core.py`. The prompt includes a dedicated section for target system tailoring — update it if you add new target system options.

### Extend the Chatbot

**Add a new chatbot action** (e.g., `change_language`):

1. **Backend**: Add the action to `ACTION_REGISTRY` in `service/chatbot/actions.py` with `action_id`, `description`, and `params` schema
2. **Frontend**: Add the handler to `chatbotActionHandlers` in `page.tsx` — include param validation (check against config/allowed values before applying)
3. If the action needs constraints the LLM should know about, update the `IMPORTANT CONSTRAINTS` section in `ChatbotService._build_system_prompt()` in `service/chatbot/core.py`

**Change chatbot personality or behaviour**:

- Edit the base system prompt in `ChatbotService._build_system_prompt()` in `service/chatbot/core.py`. The prompt is assembled from parts based on enabled capabilities.

**Update the knowledge base**:

- Edit `backend/usage_guide/usage_guide.md`. The file is loaded once on first chat request and cached in memory. Restart the backend to pick up changes.

**Add a new capability toggle**:

1. **Backend**: Add a new boolean field to `ChatRequest` in `models/chatbot.py`
2. **Backend**: Add conditional system prompt section in `ChatbotService._build_system_prompt()`
3. **Frontend**: Add localStorage key + state in `page.tsx`, pass through `useChatbot` props
4. **Frontend**: Add toggle switch in `ChatbotSettings.tsx`

### Run the project locally

```bash
# Terminal 1: Backend
cd backend && uv run main.py        # http://localhost:8080

# Terminal 2: Frontend
cd frontend && npm run dev           # http://localhost:3000
```

API docs: http://localhost:8080/docs

### Run with Docker

Docker Compose orchestrates both services. Authentication env vars (Google OAuth) must be provided separately.

```bash
# Build and start both services
docker compose up --build

# Backend:  http://localhost:8080
# Frontend: http://localhost:3000

# Build individual services
docker compose build backend
docker compose build frontend
```

**Environment variables for Docker:**

| Variable | Where to set | Notes |
|---|---|---|
| `AUTH_GOOGLE_ID` | `frontend/.env.local` | Google OAuth client ID |
| `AUTH_GOOGLE_SECRET` | `frontend/.env.local` | Google OAuth client secret |
| `AUTH_SECRET` | `frontend/.env.local` | Random secret (`openssl rand -base64 32`) |
| `ALLOWED_EMAILS` | `frontend/.env.local` | Comma-separated allowlist (empty = all) |
| `NEXT_PUBLIC_BACKEND_WS_URL` | Build arg in `docker-compose.yml` | WebSocket URL reachable from browser; defaults to `ws://localhost:8080` |

Docker file locations:
- `backend/Dockerfile` — multi-stage (uv builder → slim runtime), Python 3.12
- `frontend/Dockerfile` — multi-stage (npm build → Next.js standalone runtime), Node 20 Alpine
- `docker-compose.yml` — root-level, sets `BACKEND_INTERNAL_URL=http://backend:8080` for internal networking

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
   - `https://your-production-domain.com` (for production — add after deploying)
6. **Authorized redirect URIs**:
   - `http://localhost:3000/api/auth/callback/google` (local)
   - `https://your-production-domain.com/api/auth/callback/google` (production — add after deploying)
7. Click **Create**
8. Copy the **Client ID** and **Client Secret**

### 4. Configure environment variables

Add the credentials to `frontend/.env.local`:

```
AUTH_GOOGLE_ID=<your-client-id>.apps.googleusercontent.com
AUTH_GOOGLE_SECRET=<your-client-secret>
AUTH_SECRET=<generate with: openssl rand -base64 32>
AUTH_TRUST_HOST=true
```

### 5. Publish the OAuth consent screen (for production)

While in "Testing" mode, only the test users you added can sign in. To allow any Google account (access is controlled by the user database — see the admin panel):

1. Go to **APIs & Services → OAuth consent screen**
2. Click **Publish App**
3. Confirm the prompt

> **Note**: For External apps requesting only basic scopes (openid, email, profile), Google does not require a verification review.

---

## Self-Hosted Deployment Guide

> Deployment guide coming soon — see `docker-compose.yml` for the current local/self-hosted setup. The application is deployed on a self-hosted Hetzner Ubuntu server using Docker Compose.
