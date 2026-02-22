# US-05 — Backend User & Auth Endpoints

**Epic**: Epic 3 — User Access Management
**Depends on**: US-03
**Blocks**: US-06, US-07, US-08

---

## Goal

Implement the backend user management endpoints (`/users/me`, `/users`, `POST /users`, `DELETE /users/{id}`) with session-based authentication forwarded from the NextAuth session token.

---

## Background

The admin panel and profile menu need to read and mutate user data. All endpoints require a valid NextAuth session token (JWT) forwarded from the frontend. The backend validates this token using the shared `AUTH_SECRET` to extract the user's email and role, avoiding the need for a separate auth system.

---

## Acceptance Criteria

### Auth Middleware / Dependency

- [ ] A FastAPI dependency `get_current_user(request: Request)` is implemented that:
  1. Reads the `Authorization: Bearer <token>` header (the NextAuth JWT forwarded by the frontend proxy)
  2. Decodes and validates the JWT using `AUTH_SECRET` (HS256 or whichever algorithm NextAuth uses)
  3. Extracts `email` from the token payload
  4. Looks up the user in the DB
  5. Returns the `User` ORM object or raises `HTTPException(401)` if token is invalid/missing
- [ ] A second dependency `require_admin(current_user: User = Depends(get_current_user))` raises `HTTPException(403)` if `current_user.role != "admin"`

### Endpoints

#### `GET /users/me`
- Auth: any authenticated user
- Returns: `{ id, email, name, role, storage_mode, created_at }`
- Also updates `name` in DB if it differs from the token's name claim

#### `GET /users`
- Auth: admin only
- Returns: list of all users `[ { id, email, name, role, storage_mode, created_at }, ... ]`
- Ordered by `created_at` ascending

#### `POST /users`
- Auth: admin only
- Body: `{ "email": "user@example.com", "name": "Optional Name" }`
- Creates a new user with `role='user'`, `storage_mode='local'`
- Returns `201 { id, email, name, role, storage_mode, created_at }`
- Returns `409 Conflict` if email already exists

#### `DELETE /users/{id}`
- Auth: admin only
- Path param: user `id` (integer)
- Deletes the user
- Returns `204 No Content`
- Returns `403 Forbidden` if the target user has `role='admin'` (admins cannot be deleted via API)
- Returns `404 Not Found` if user does not exist

### Frontend — Token Forwarding

- [ ] The Next.js API proxy (`src/app/api/proxy/[...path]/route.ts`) is updated to forward the NextAuth session JWT as `Authorization: Bearer <token>` header when calling the backend
- [ ] `lib/api.ts` gains wrapper functions for each endpoint:
  - `getMe()` → `GET /users/me`
  - `getUsers()` → `GET /users`
  - `createUser(email, name?)` → `POST /users`
  - `deleteUser(id)` → `DELETE /users/{id}`
- [ ] Corresponding TypeScript types added to `lib/types.ts`:
  ```ts
  export interface UserProfile {
    id: number;
    email: string;
    name: string | null;
    role: "user" | "admin";
    storage_mode: "local" | "account";
    created_at: string;
  }
  ```

---

## Files Likely Affected

**Backend**
- `backend/api/users/router.py` — new file
- `backend/service/users/core.py` — new file
- `backend/models/users.py` — Pydantic request/response schemas
- `backend/dependencies/auth.py` — `get_current_user`, `require_admin`
- `backend/main.py` — register users router

**Frontend**
- `frontend/src/app/api/proxy/[...path]/route.ts` — forward JWT header
- `frontend/src/lib/api.ts` — add user API functions
- `frontend/src/lib/types.ts` — add `UserProfile` type

---

## Notes

- NextAuth JWT tokens are signed with `AUTH_SECRET`. The backend must use the same secret and algorithm (check NextAuth v5 default — typically HS256 or EdDSA depending on config).
- The proxy already strips `host`, `cookie`, `connection` headers — ensure it adds `Authorization` with the session token retrieved via `auth()` server-side.
- Name the Pydantic response model `UserResponse` to avoid collision with the SQLAlchemy `User` ORM model.
