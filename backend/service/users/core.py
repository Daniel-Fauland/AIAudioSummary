from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException

from db.models import User


class UsersService:
    async def get_me(self, user: User, token_name: str | None, db: AsyncSession) -> User:
        """Update name from token if different, update last_visit_at for account storage users, then return user."""
        dirty = False
        if token_name and token_name != user.name:
            user.name = token_name
            dirty = True
        if user.storage_mode == "account":
            user.last_visit_at = datetime.now(timezone.utc)
            dirty = True
        if dirty:
            await db.commit()
            await db.refresh(user)
        return user

    async def get_all_users(self, db: AsyncSession) -> list[User]:
        result = await db.execute(select(User).order_by(User.created_at.asc()))
        return list(result.scalars().all())

    async def create_user(self, email: str, name: str | None, db: AsyncSession) -> User:
        user = User(email=email.lower(), name=name, role="user", storage_mode="local")
        db.add(user)
        try:
            await db.commit()
            await db.refresh(user)
        except IntegrityError:
            await db.rollback()
            raise HTTPException(status_code=409, detail="Email already exists")
        return user

    async def delete_user(self, user_id: int, db: AsyncSession) -> None:
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if user is None:
            raise HTTPException(status_code=404, detail="User not found")
        if user.role == "admin":
            raise HTTPException(status_code=403, detail="Cannot delete admin users via API")
        await db.delete(user)
        await db.commit()

    async def get_preferences(self, user: User, db: AsyncSession) -> dict:
        """Return the user's preferences and storage_mode."""
        await db.refresh(user)
        return {"storage_mode": user.storage_mode, "preferences": user.preferences}

    async def put_preferences(self, user: User, data: dict, db: AsyncSession) -> dict:
        """Store preferences and set storage_mode='account'."""
        user.preferences = data
        user.storage_mode = "account"
        await db.commit()
        await db.refresh(user)
        return {"storage_mode": user.storage_mode, "preferences": user.preferences}

    async def delete_preferences(self, user: User, db: AsyncSession) -> None:
        """Clear preferences and set storage_mode='local'."""
        user.preferences = None
        user.storage_mode = "local"
        await db.commit()
