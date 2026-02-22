from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from db.engine import get_db
from service.auth.core import AuthService

auth_router = APIRouter(prefix="/auth")
_service = AuthService()


@auth_router.get("/verify")
async def verify_email(email: str = Query(...), db: AsyncSession = Depends(get_db)):
    """Verify if an email has access. No authentication required."""
    return await _service.verify_email(email, db)
