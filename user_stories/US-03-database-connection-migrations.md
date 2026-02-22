# US-03 — Backend Database Connection & Migrations

**Epic**: Epic 2 — PostgreSQL Database
**Depends on**: US-02
**Blocks**: US-04, US-05, US-11

---

## Goal

Wire up the FastAPI backend with async SQLAlchemy and Alembic, create the initial `users` table migration, and seed admin users from the `INITIAL_ADMINS` environment variable on startup.

---

## Background

The backend needs a database layer to support user management (access control, roles, preferences). We use async SQLAlchemy with `asyncpg` for non-blocking DB access consistent with FastAPI's async architecture. Alembic handles schema migrations. The `INITIAL_ADMINS` env var seeds the first admin accounts so there is always at least one admin available after a fresh deployment.

---

## Acceptance Criteria

### Dependencies

- [ ] `sqlalchemy[asyncio]`, `asyncpg`, and `alembic` added to `backend/pyproject.toml` via `uv add`

### Database Module

- [ ] A `backend/database.py` module (or `backend/db/` package) provides:
  - `async_engine` — SQLAlchemy async engine created from `DATABASE_URL`
  - `AsyncSessionLocal` — async session factory
  - `get_db()` — FastAPI dependency that yields an `AsyncSession`
  - `Base` — SQLAlchemy `DeclarativeBase` for all models to inherit from

### User Model

- [ ] A `backend/models/db/user.py` (or similar) defines the `User` ORM model:

```python
class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    role: Mapped[str] = mapped_column(String(50), nullable=False, default="user")
    preferences: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    storage_mode: Mapped[str] = mapped_column(String(10), nullable=False, default="local")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
```

### Migrations

- [ ] Alembic is configured with `alembic.ini` and `alembic/env.py` set up for async SQLAlchemy
- [ ] An initial migration creates the `users` table with all fields above
- [ ] Running `alembic upgrade head` applies the migration successfully

### Startup Seeding

- [ ] On application startup (`main.py` lifespan or startup event), the backend:
  1. Runs all pending Alembic migrations (or uses `create_all` as a simpler alternative for initial setup)
  2. Reads `INITIAL_ADMINS` env var (comma-separated emails, may be empty)
  3. For each email in the list:
     - If user does NOT exist: create with `role='admin'`
     - If user DOES exist but role is NOT `admin`: update role to `admin`
     - If user exists and is already `admin`: no-op
  4. No users are removed or demoted by this process

### Config

- [ ] `backend/config.py` `Settings` class gains new fields:
  - `database_url: str` — full async connection string
  - `auth_secret: str` — shared secret for JWT validation
  - `initial_admins: str = ""` — comma-separated email list
- [ ] `backend/.env.example` updated with `DATABASE_URL`, `AUTH_SECRET`, `INITIAL_ADMINS`

### Verification

- [ ] `uv run main.py` starts without error when `DATABASE_URL` points to a running PostgreSQL instance
- [ ] After startup, admin emails from `INITIAL_ADMINS` are present in the `users` table with `role='admin'`

---

## File Structure

```
backend/
├── db/
│   ├── __init__.py
│   ├── engine.py          # async_engine, AsyncSessionLocal, get_db()
│   └── models.py          # User ORM model (Base lives here too)
├── alembic/
│   ├── env.py
│   ├── script.py.mako
│   └── versions/
│       └── 0001_initial_users.py
└── alembic.ini
```

---

## Notes

- `role` is a plain `VARCHAR` string (`'user'` or `'admin'`), not a PostgreSQL enum, to keep migrations simple.
- `preferences` is `JSONB` — no schema enforced at the DB level; validation happens in the Pydantic layer.
- `storage_mode` values: `'local'` or `'account'`.
- Keep the database module decoupled from FastAPI routers — routers import `get_db` as a dependency.
- Do NOT use `create_all()` in production — use Alembic migrations only. `create_all()` can be used in a local dev fallback but must not run when `ENVIRONMENT=production`.
