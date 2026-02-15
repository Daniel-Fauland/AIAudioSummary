# AIAudioSummary

## Introduction

AIAudioSummary is a web application for uploading audio files (such as meeting recordings) and automatically generating transcripts and AI-powered summaries.

**How it works:**

1. Upload an audio file via the web interface.
2. The backend transcribes the audio using AssemblyAI's speech-to-text API.
3. Review the transcript and optionally rename detected speakers (e.g. "Speaker A" → "John").
4. Choose a prompt template, language, and LLM provider, then generate a summary.
5. The summary is streamed live and rendered as formatted Markdown alongside the transcript.

**Tech stack:**

| Layer | Technology |
|-------|-----------|
| Frontend | [Next.js 15](https://nextjs.org/) (React, TypeScript, Tailwind CSS, [shadcn/ui](https://ui.shadcn.com/)) |
| Backend | [FastAPI](https://fastapi.tiangolo.com/) (Python) |
| Speech-to-text | [AssemblyAI](https://www.assemblyai.com/) |
| Summarization | Multi-provider LLM — OpenAI, Anthropic, Google Gemini, or Azure OpenAI (via [pydantic-ai](https://ai.pydantic.dev/)) |
| Package management | [uv](https://github.com/astral-sh/uv) (backend), npm (frontend) |

**Bring Your Own Key (BYOK):** API keys are entered in the browser and stored in localStorage. They are sent per-request and never saved on the server.

## Architecture

```
AIAudioSummary/
├── backend/            # FastAPI Python backend
│   ├── api/            #   Route handlers (assemblyai, llm, misc)
│   ├── service/        #   Business logic & external API calls
│   ├── models/         #   Pydantic request/response models
│   ├── prompt_templates/ # Markdown prompt templates
│   └── config.py       #   Settings loaded from .env
├── frontend/           # Next.js 15 frontend
│   └── src/
│       ├── app/        #   Root layout + main page orchestrator
│       ├── components/ #   UI components (layout, settings, workflow)
│       ├── hooks/      #   Custom React hooks (useApiKeys, useConfig)
│       └── lib/        #   TypeScript types, API client, utilities
└── user_stories/       # Feature specifications
```

### Backend

Three-layer architecture: **Router → Service → External API**

- `POST /createTranscript` — Upload audio file + transcribe via AssemblyAI
- `POST /createSummary` — Generate summary with any supported LLM provider (streaming supported)
- `GET /getConfig` — Returns available providers, prompt templates, and languages
- `POST /getSpeakers` — Detect speaker labels in a transcript
- `POST /updateSpeakers` — Replace speaker labels with real names

### Frontend

Single-page app with a 3-step workflow:

1. **Upload** — Drag-and-drop audio file upload
2. **Transcript** — Editable transcript, speaker detection & renaming, prompt/language configuration
3. **Summary** — Side-by-side transcript and streamed Markdown summary

## Getting Started

### Prerequisites

- [uv](https://github.com/astral-sh/uv) — Python package manager for the backend
- [Node.js](https://nodejs.org/) (v18+) and npm — for the frontend
- API keys for [AssemblyAI](https://www.assemblyai.com/) and at least one LLM provider ([OpenAI](https://openai.com/api/), [Anthropic](https://console.anthropic.com/), [Google Gemini](https://ai.google.dev/), or Azure OpenAI)

**Install uv:**

```bash
# macOS / Linux
curl -LsSf https://astral.sh/uv/install.sh | sh

# Windows (PowerShell)
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
```

### Backend

1. Create the backend environment file:

   ```bash
   cp backend/.env.example backend/.env
   ```

2. Start the backend (automatically installs Python 3.12+ and all dependencies on first run):

   ```bash
   cd backend
   uv run main.py
   ```

   - API: http://localhost:8080
   - Swagger docs: http://localhost:8080/docs

### Frontend

1. Install dependencies:

   ```bash
   cd frontend
   npm install
   ```

2. Create the environment file:

   ```bash
   cp .env.local.example .env.local
   ```

3. Start the dev server:

   ```bash
   npm run dev
   ```

   - App: http://localhost:3000

### First-time setup

1. Start both the backend and frontend.
2. Open http://localhost:3000 in your browser.
3. The settings panel will open automatically — enter your AssemblyAI key and at least one LLM provider key.
4. Upload an audio file and follow the workflow.

## Configuration

### Backend (`backend/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `LOGGING_LEVEL` | `INFO` | Log level (DEBUG, INFO, WARNING, ERROR, CRITICAL) |
| `PROMPT_TEMPLATE_DIRECTORY` | `./prompt_templates` | Path to prompt template Markdown files |

### Frontend (`frontend/.env.local`)

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8080` | Backend API URL |
