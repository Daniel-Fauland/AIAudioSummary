import os

from sqlalchemy import select

from db.engine import AsyncSessionLocal
from db.models import User
from utils.logging import logger


async def seed_dev_user() -> None:
    """Seed a dev user from the SEED_DEV_USER env var (for local no-auth mode)."""
    seed_email = os.environ.get("SEED_DEV_USER", "").strip()
    if not seed_email:
        return

    if AsyncSessionLocal is None:
        return

    async with AsyncSessionLocal() as session:
        result = await session.execute(select(User).where(User.email == seed_email))
        user = result.scalar_one_or_none()
        if user is None:
            session.add(User(email=seed_email, name="Dev User", role="admin"))
            logger.info(f"Seeded dev user: {seed_email}")
        elif user.role != "admin":
            user.role = "admin"
            logger.info(f"Updated dev user to admin: {seed_email}")
        await session.commit()
