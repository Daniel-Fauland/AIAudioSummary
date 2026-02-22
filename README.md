# AIAudioSummary

## Introduction

AIAudioSummary is a self-hosted web application for transcribing audio files (meeting recordings, interviews, lectures) and generating AI-powered summaries. It supports two modes:

- **Standard mode** — Upload or record audio → batch transcription → streaming summary generation
- **Realtime mode** — Live microphone capture → real-time transcription via WebSocket → periodic incremental summaries

**How it works:**

1. Sign in with your Google account (access is controlled by an admin allowlist).
2. Upload an audio file, or record directly in the browser.
3. The backend transcribes the audio using AssemblyAI's speech-to-text API.
4. Review the transcript, rename detected speakers, and choose a prompt template.
5. Select an LLM provider and generate a summary — streamed live as formatted Markdown.

**Bring Your Own Key (BYOK):** API keys are entered in the browser and stored in `localStorage`. They are never sent to or stored on the server.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS, shadcn/ui |
| Backend | FastAPI (Python 3.12+) |
| Database | PostgreSQL 16 (user management, access control, optional preference sync) |
| Auth | Google OAuth via Auth.js v5 |
| Speech-to-text | AssemblyAI (batch + streaming WebSocket) |
| Summarization | OpenAI, Anthropic, Google Gemini, or Azure OpenAI via pydantic-ai |
| Deployment | Docker Compose |

---

## Local Development

### Prerequisites

- [uv](https://github.com/astral-sh/uv) — Python package manager
- [Node.js](https://nodejs.org/) v18+ and npm
- [Docker](https://www.docker.com/) (optional, for running PostgreSQL locally)

**Install uv:**

```bash
# macOS / Linux
curl -LsSf https://astral.sh/uv/install.sh | sh
```

### 1. Backend

```bash
cd backend
cp .env.example .env    # edit as needed
uv run main.py          # starts on http://localhost:8080 with hot-reload
```

If you don't set `DATABASE_URL` in `backend/.env`, the server starts without database features (a warning is logged). To run PostgreSQL locally for development:

```bash
docker run -d --name aias-pg \
  -e POSTGRES_USER=aias \
  -e POSTGRES_PASSWORD=secret \
  -e POSTGRES_DB=aias_db \
  -p 5432:5432 postgres:16-alpine
```

Then set in `backend/.env`:

```
DATABASE_URL = postgresql+asyncpg://aias:secret@localhost:5432/aias_db
INITIAL_ADMINS = your@email.com
```

### 2. Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local   # edit as needed
npm run dev                         # starts on http://localhost:3000
```

API docs available at http://localhost:8080/docs when the backend is running.

---

## Self-Hosted Deployment (Hetzner / Docker Compose)

This section walks through everything that needs to be configured before running `docker compose up` on a fresh server.

### Step 1 — Clone the repository

```bash
git clone <your-repo-url> AIAudioSummary
cd AIAudioSummary
```

### Step 2 — Create Google OAuth credentials

The app uses Google OAuth for authentication. You need a Google Cloud project with OAuth credentials.

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services → Credentials**
2. Click **+ Create Credentials → OAuth client ID** → Application type: **Web application**
3. Add **Authorized JavaScript origins**:
   - `https://your-domain.com`
4. Add **Authorized redirect URIs**:
   - `https://your-domain.com/api/auth/callback/google`
5. Copy the **Client ID** and **Client Secret** — you will need them in Step 4.

> If the OAuth consent screen is in "Testing" mode, only explicitly added test users can sign in. Publish it to allow any Google account (your user database still controls who gets access).

### Step 3 — Configure the root `.env` file (Docker Compose secrets)

Create a `.env` file in the **project root** (next to `docker-compose.yml`). This file is read by Docker Compose to inject variables into all services.

```bash
cp .env.example .env
nano .env   # or use your preferred editor
```

Set the following values:

```dotenv
# PostgreSQL — choose any username/password/database name
POSTGRES_USER=aias
POSTGRES_PASSWORD=<generate a strong password>
POSTGRES_DB=aias_db

# Shared JWT secret — must be the same value you set in frontend/.env.local
# Generate with: openssl rand -base64 32
AUTH_SECRET=<your-generated-secret>

# Comma-separated list of Google email addresses that will be created as
# admin users on first startup. At least one admin is required to manage
# user access via the admin panel.
INITIAL_ADMINS=your@gmail.com
```

**Never commit `.env` to version control.** It is already in `.gitignore`.

### Step 4 — Configure the frontend `.env.local` file

Create `frontend/.env.local`. This file is read at Docker build time for auth configuration and at runtime for server-side variables.

```bash
cp frontend/.env.local.example frontend/.env.local
nano frontend/.env.local
```

Set the following values:

```dotenv
# Google OAuth credentials from Step 2
AUTH_GOOGLE_ID=<your-client-id>.apps.googleusercontent.com
AUTH_GOOGLE_SECRET=<your-client-secret>

# MUST match AUTH_SECRET in the root .env (Step 3)
# Generate with: openssl rand -base64 32
AUTH_SECRET=<same-secret-as-root-env>

# Required for non-Vercel deployments — do not change
AUTH_TRUST_HOST=true

# Optional: your legal/imprint info displayed in the footer
NEXT_PUBLIC_OWNER_NAME=Your Name
NEXT_PUBLIC_OWNER_STREET=Your Street 1
NEXT_PUBLIC_OWNER_CITY=12345 Your City
NEXT_PUBLIC_OWNER_COUNTRY=Germany
NEXT_PUBLIC_OWNER_EMAIL=you@example.com
NEXT_PUBLIC_OWNER_PHONE=+49 ...
```

### Step 5 — Update production URLs in `docker-compose.yml`

Open `docker-compose.yml` and update the two values that reference the production domain:

```yaml
backend:
  environment:
    ALLOWED_ORIGINS: https://your-domain.com   # ← change from localhost

frontend:
  build:
    args:
      # WebSocket URL reachable from the user's browser (for realtime mode)
      NEXT_PUBLIC_BACKEND_WS_URL: wss://your-domain.com/ws   # ← change from ws://localhost:8080
```

> **Note on WebSocket routing:** In production, the realtime WebSocket (`/ws/realtime`) needs to be reachable from the browser. If you run Nginx in front of Docker, proxy `/ws/` to the backend service on port 8080 with WebSocket upgrade headers. Alternatively, expose the backend on a dedicated subdomain (e.g. `api.your-domain.com`) and set `NEXT_PUBLIC_BACKEND_WS_URL=wss://api.your-domain.com`.

### Step 6 — Build and start all services

```bash
docker compose up --build -d
```

This starts three containers:
- `postgres` — PostgreSQL 16 database (waits for health check before backend starts)
- `backend` — FastAPI on port 8080 (runs migrations + seeds admins on first start)
- `frontend` — Next.js on port 3000

On first startup, the backend will:
1. Run all Alembic migrations (creates the `users` table)
2. Create admin accounts for every email listed in `INITIAL_ADMINS`

Check the logs to confirm a clean start:

```bash
docker compose logs backend --tail=50
# Should see: "Database migrations complete." and "Seeded admin user: your@gmail.com"

docker compose logs frontend --tail=20
# Should see: "Ready"
```

### Step 7 — Set up a reverse proxy (Nginx)

Docker exposes the frontend on port 3000. In production you should put Nginx in front to handle SSL/TLS and route traffic.

Minimal Nginx config:

```nginx
server {
    listen 443 ssl;
    server_name your-domain.com;

    # SSL certificate (e.g. from Let's Encrypt / certbot)
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # All HTTP traffic → Next.js frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket traffic for realtime transcription → backend
    location /ws/ {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}

server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$host$request_uri;
}
```

Install a certificate with certbot:

```bash
certbot --nginx -d your-domain.com
```

### Step 8 — Verify the deployment

1. Visit `https://your-domain.com` — you should be redirected to the login page.
2. Sign in with the Google account from `INITIAL_ADMINS`.
3. You should land on the main app as an admin.
4. Open the profile menu (top-right avatar) → **Admin Panel** to verify the admin panel loads.
5. Add additional user emails via the admin panel to grant access to other people.

---

## Configuration Reference

### Root `.env` (Docker Compose)

| Variable | Example | Description |
|----------|---------|-------------|
| `POSTGRES_USER` | `aias` | PostgreSQL username |
| `POSTGRES_PASSWORD` | `s3cr3t!` | PostgreSQL password — use a strong random value |
| `POSTGRES_DB` | `aias_db` | PostgreSQL database name |
| `AUTH_SECRET` | *(generated)* | Shared JWT secret — **must match** `AUTH_SECRET` in `frontend/.env.local`. Generate with `openssl rand -base64 32` |
| `INITIAL_ADMINS` | `you@gmail.com` | Comma-separated admin email(s) seeded on first startup |

### Frontend `frontend/.env.local`

| Variable | Example | Description |
|----------|---------|-------------|
| `AUTH_GOOGLE_ID` | `123....apps.googleusercontent.com` | Google OAuth Client ID |
| `AUTH_GOOGLE_SECRET` | `GOCSPX-...` | Google OAuth Client Secret |
| `AUTH_SECRET` | *(generated)* | **Must match** `AUTH_SECRET` in root `.env` |
| `AUTH_TRUST_HOST` | `true` | Required for self-hosted deployments |
| `NEXT_PUBLIC_OWNER_NAME` | `Jane Doe` | Name shown in the footer imprint |
| `NEXT_PUBLIC_OWNER_STREET` | `Main St 1` | Street shown in footer imprint |
| `NEXT_PUBLIC_OWNER_CITY` | `12345 Berlin` | City shown in footer imprint |
| `NEXT_PUBLIC_OWNER_COUNTRY` | `Germany` | Country shown in footer imprint |
| `NEXT_PUBLIC_OWNER_EMAIL` | `jane@example.com` | Contact email in footer imprint |
| `NEXT_PUBLIC_OWNER_PHONE` | `+49 ...` | Phone in footer imprint (optional) |

### `docker-compose.yml` — values to update for production

| Location | Value | What to change |
|----------|-------|----------------|
| `backend.environment.ALLOWED_ORIGINS` | `http://localhost:3000` | → `https://your-domain.com` |
| `frontend.build.args.NEXT_PUBLIC_BACKEND_WS_URL` | `ws://localhost:8080` | → `wss://your-domain.com/ws` (or your backend URL) |

---

## Managing Users

Access to the app is controlled by the **user database**, not a static list:

- **Admin panel** — navigate to `/admin` (visible in the profile dropdown for admins) to add or remove users.
- **Initial admins** — set `INITIAL_ADMINS` in the root `.env` before first startup. These accounts are created automatically.
- **Adding users** — admins can add new users by email via the admin panel at any time, without restarting the server.
- **Revoking access** — delete a user in the admin panel. They will be denied on next login.

> API keys (AssemblyAI, OpenAI, Anthropic, etc.) are **never** stored in the database. They remain in each user's browser `localStorage`.

---

## Updating the App

```bash
git pull
docker compose up --build -d
```

Database migrations run automatically on startup — no manual `alembic upgrade` needed.

---

## Useful Commands

```bash
# View logs
docker compose logs -f

# Restart a single service
docker compose restart backend

# Stop everything
docker compose down

# Stop and delete the database volume (WARNING: destroys all user data)
docker compose down -v

# Open a psql shell on the database
docker compose exec postgres psql -U aias -d aias_db
```
