import asyncio
from dataclasses import dataclass, field
from datetime import datetime, timezone


@dataclass
class SessionState:
    session_id: str
    accumulated_transcript: str = ""
    current_partial: str = ""
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    last_activity: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


class SessionManager:
    def __init__(self) -> None:
        self._sessions: dict[str, SessionState] = {}
        self._lock = asyncio.Lock()

    async def create_session(self, session_id: str) -> SessionState:
        async with self._lock:
            session = SessionState(session_id=session_id)
            self._sessions[session_id] = session
            return session

    async def get_session(self, session_id: str) -> SessionState | None:
        async with self._lock:
            return self._sessions.get(session_id)

    async def append_final_text(self, session_id: str, text: str) -> None:
        async with self._lock:
            session = self._sessions.get(session_id)
            if session is None:
                return
            session.accumulated_transcript += text
            session.last_activity = datetime.now(timezone.utc)

    async def update_partial(self, session_id: str, text: str) -> None:
        async with self._lock:
            session = self._sessions.get(session_id)
            if session is None:
                return
            session.current_partial = text
            session.last_activity = datetime.now(timezone.utc)

    async def remove_session(self, session_id: str) -> None:
        async with self._lock:
            self._sessions.pop(session_id, None)

    async def cleanup_stale_sessions(self, max_age_hours: int = 4) -> None:
        async with self._lock:
            now = datetime.now(timezone.utc)
            stale_ids = [
                sid
                for sid, session in self._sessions.items()
                if (now - session.created_at).total_seconds() > max_age_hours * 3600
            ]
            for sid in stale_ids:
                del self._sessions[sid]
