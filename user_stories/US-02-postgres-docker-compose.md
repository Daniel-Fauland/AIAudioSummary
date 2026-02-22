# US-02 — Add PostgreSQL to Docker Compose

**Epic**: Epic 2 — PostgreSQL Database
**Depends on**: US-01
**Blocks**: US-03

---

## Goal

Add a PostgreSQL 16 service to `docker-compose.yml` so the backend has a persistent relational database available in all environments (local dev and production).

---

## Background

The application currently has no database. User management (access control, roles, preferences) requires persistent storage. PostgreSQL is chosen for its JSONB support (preferences storage) and reliability. All credentials are sourced from a root-level `.env` file to avoid hardcoding secrets.

---

## Acceptance Criteria

- [ ] `docker-compose.yml` has a `postgres` service using image `postgres:16-alpine`
- [ ] A named volume `pgdata` is declared and mapped to `/var/lib/postgresql/data` for persistence across container restarts
- [ ] Port `5432` is **not** exposed to the host (internal only, accessible as `postgres:5432` within the compose network)
- [ ] The postgres service reads `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` from environment (sourced from `.env` at the project root)
- [ ] The `backend` service has `depends_on: postgres` (with a health check preferred, or at minimum a simple dependency)
- [ ] The `backend` service receives `DATABASE_URL` as an environment variable, constructed as: `postgresql+asyncpg://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}`
- [ ] The `backend` service receives `AUTH_SECRET` and `INITIAL_ADMINS` environment variables
- [ ] A root-level `.env.example` file documents all new variables: `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `AUTH_SECRET`, `INITIAL_ADMINS`
- [ ] `docker compose up --build` starts all three services without errors

---

## Target Docker Compose Structure

```yaml
services:
  postgres:
    image: postgres:16-alpine
    volumes:
      - pgdata:/var/lib/postgresql/data
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    restart: always
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build: ./backend
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      DATABASE_URL: postgresql+asyncpg://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}
      AUTH_SECRET: ${AUTH_SECRET}
      INITIAL_ADMINS: ${INITIAL_ADMINS}
      # ... existing env vars ...

  frontend:
    # ... unchanged ...

volumes:
  pgdata:
```

---

## New Environment Variables

| Variable | Location | Example | Description |
|---|---|---|---|
| `POSTGRES_USER` | root `.env` | `aias` | PostgreSQL username |
| `POSTGRES_PASSWORD` | root `.env` | `secret` | PostgreSQL password |
| `POSTGRES_DB` | root `.env` | `aias_db` | PostgreSQL database name |
| `AUTH_SECRET` | root `.env` | (same value as frontend) | Shared JWT validation secret |
| `INITIAL_ADMINS` | root `.env` | `admin@example.com` | Comma-separated admin email list |

---

## Notes

- The `backend/.env` still exists for local development without Docker. `DATABASE_URL` should also be added to `backend/.env.example` for direct `uv run` usage.
- The frontend `.env.local` is unchanged by this story.
