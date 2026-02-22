from datetime import datetime

from pydantic import BaseModel, ConfigDict


class UserResponse(BaseModel):
    id: int
    email: str
    name: str | None
    role: str
    storage_mode: str
    created_at: datetime

    model_config = {"from_attributes": True}


class CreateUserRequest(BaseModel):
    email: str
    name: str | None = None


class PreferencesResponse(BaseModel):
    storage_mode: str
    preferences: dict | None


class PreferencesRequest(BaseModel):
    model_config = ConfigDict(extra="allow")
