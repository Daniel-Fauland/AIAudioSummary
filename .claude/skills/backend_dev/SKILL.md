---
name: backend-dev
description: Backend development skill for implementing non-frontend features. Triggered manually with "Implement BE:".
---

# Backend Development Skill

You are implementing a backend feature for the AIAudioSummary project (FastAPI + Python 3.12+).

## Step 1: Understand the request

Read and understand the feature request passed via `$ARGUMENTS`.

## Step 2: Research libraries and frameworks

Before writing any code, use the **Context7 MCP** (`mcp__context7`) to look up current, accurate documentation for every library or framework you will use (e.g., FastAPI, Pydantic, AssemblyAI SDK, OpenAI SDK, etc.). Do NOT rely on memory alone — always fetch up-to-date docs first.

## Step 3: Plan the implementation

- Identify which layers need changes (router, service, models, config, utils, prompt templates).
- Follow the existing architecture: **Router → Service → External API**.
- Read all files you intend to modify before making changes.

## Step 4: Implement following best practices

Adhere to these project-specific conventions:

- **Async**: all router handlers and service methods must be `async def`.
- **Pydantic models**: use Pydantic models for all request/response validation.
- **Routing**: use camelCase endpoint paths (e.g., `/createSomething`).
- **Error handling**: raise `HTTPException` in routers, use try/except with cleanup in services.
- **Logging**: use the project logger (`from utils.logging import logger`).
- **Config**: use Pydantic `BaseSettings` in `config.py` for any new environment variables.
- **Dependencies**: add new packages with `uv add <package>` in the `backend/` directory.
- **Type hints**: use proper type annotations on all function signatures.
- **Keep it simple**: avoid over-engineering. Only add what is directly needed.

## Step 5: Test your implementation

Before finishing, you **must** verify your changes work:

1. Run the backend to confirm it starts without errors: `cd backend && uv run main.py`
2. Use `curl` or similar to test new/modified endpoints against the running server.
3. Verify request validation by testing with both valid and invalid inputs.
4. Check that existing endpoints are not broken.

Notify the user of the test results — what passed, what was tested, and any issues found.

## Step 6: Update documentation

As the very last step, review `CLAUDE.md` in the project root. If your changes introduced new endpoints, architectural changes, configuration options, or anything that alters the project structure, update `CLAUDE.md` accordingly. If no documentation update is needed, explicitly state that.
