from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db.models import User


class AuthService:
    async def verify_email(self, email: str, db: AsyncSession) -> dict:
        result = await db.execute(select(User).where(User.email == email.lower()))
        user = result.scalar_one_or_none()
        if user is None:
            return {"allowed": False}
        return {"allowed": True, "name": user.name, "role": user.role}
