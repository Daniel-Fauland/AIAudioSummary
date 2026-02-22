import jwt
from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.responses import Response

from config import config
from db.engine import get_db
from db.models import User
from dependencies.auth import get_current_user, require_admin
from models.users import CreateUserRequest, UserResponse, PreferencesRequest, PreferencesResponse
from service.users.core import UsersService

users_router = APIRouter(prefix="/users")
_service = UsersService()


def _get_token_name(request: Request) -> str | None:
    """Extract name claim from the Authorization JWT if present."""
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer ") and config.auth_secret:
        try:
            payload = jwt.decode(
                auth_header.removeprefix("Bearer "),
                config.auth_secret,
                algorithms=["HS256"],
            )
            return payload.get("name")
        except Exception:
            pass
    return None


@users_router.get("/me", response_model=UserResponse)
async def get_me(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    token_name = _get_token_name(request)
    return await _service.get_me(current_user, token_name, db)


@users_router.get("", response_model=list[UserResponse])
async def get_users(
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    return await _service.get_all_users(db)


@users_router.post("", response_model=UserResponse, status_code=201)
async def create_user(
    body: CreateUserRequest,
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    return await _service.create_user(body.email, body.name, db)


@users_router.delete("/{user_id}", status_code=204)
async def delete_user(
    user_id: int,
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    await _service.delete_user(user_id, db)
    return Response(status_code=204)


@users_router.get("/me/preferences", response_model=PreferencesResponse)
async def get_my_preferences(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await _service.get_preferences(current_user, db)


@users_router.put("/me/preferences", response_model=PreferencesResponse)
async def put_my_preferences(
    body: PreferencesRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    data = body.model_dump()
    return await _service.put_preferences(current_user, data, db)


@users_router.delete("/me/preferences", status_code=204)
async def delete_my_preferences(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _service.delete_preferences(current_user, db)
    return Response(status_code=204)
