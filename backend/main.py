import asyncio
import os
from contextlib import asynccontextmanager
from pathlib import Path

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import config
from utils.logging import logger
from api.assemblyai.router import assembly_ai_router
from api.llm.router import llm_router
from api.misc.router import misc_router
from api.realtime.router import realtime_router
from api.prompt_assistant.router import prompt_assistant_router
from api.live_questions.router import live_questions_router
from api.auth.router import auth_router
from api.users.router import users_router


def _run_migrations_sync() -> None:
    """Run Alembic migrations synchronously.

    Designed to be called from a thread executor so that asyncio.run()
    inside alembic/env.py gets its own clean event loop.
    """
    from alembic.config import Config as AlembicConfig
    from alembic import command

    ini_path = Path(__file__).parent / "alembic.ini"
    alembic_cfg = AlembicConfig(str(ini_path))
    command.upgrade(alembic_cfg, "head")


async def _seed_admins() -> None:
    """Seed initial admin users from the INITIAL_ADMINS config value."""
    if not config.initial_admins.strip():
        return

    from sqlalchemy import select
    from db.engine import AsyncSessionLocal
    from db.models import User

    if AsyncSessionLocal is None:
        return

    emails = [e.strip() for e in config.initial_admins.split(",") if e.strip()]
    async with AsyncSessionLocal() as session:
        for email in emails:
            result = await session.execute(select(User).where(User.email == email))
            user = result.scalar_one_or_none()
            if user is None:
                session.add(User(email=email, role="admin"))
                logger.info(f"Seeded admin user: {email}")
            elif user.role != "admin":
                user.role = "admin"
                logger.info(f"Updated existing user to admin: {email}")
        await session.commit()


@asynccontextmanager
async def lifespan(app: FastAPI):
    if config.database_url:
        loop = asyncio.get_event_loop()
        try:
            logger.info("Running database migrations...")
            await loop.run_in_executor(None, _run_migrations_sync)
            logger.info("Database migrations complete.")
            await _seed_admins()
        except Exception as e:
            logger.error(f"Database startup failed: {e}")
            raise
    else:
        logger.warning("DATABASE_URL not set — skipping database setup.")
    yield


app = FastAPI(lifespan=lifespan)

# Add CORS middleware
allowed_origins = os.environ.get("ALLOWED_ORIGINS", "http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in allowed_origins],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(assembly_ai_router, tags=["AssemblyAI"])
app.include_router(llm_router, tags=["LLM"])
app.include_router(misc_router, tags=["Misc"])
app.include_router(realtime_router, tags=["Realtime"])
app.include_router(prompt_assistant_router, tags=["PromptAssistant"])
app.include_router(live_questions_router, tags=["LiveQuestions"])
app.include_router(auth_router, tags=["Auth"])
app.include_router(users_router, tags=["Users"])


@app.get("/")
def read_root():
    return {
        "Message": config.fastapi_welcome_msg
    }


if __name__ == "__main__":
    logger.debug("Config loaded successfully")
    environment = os.environ.get("ENVIRONMENT", "development")
    uvicorn.run("main:app", host="0.0.0.0", port=8080,
                log_level="info", reload=(environment == "development"))
