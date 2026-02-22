# US-11 — Backend Preferences Endpoints

**Epic**: Epic 5 — Profile Menu & Storage Mode
**Depends on**: US-03
**Blocks**: US-09, US-10

---

## Goal

Implement the backend endpoints for reading, writing, and deleting user preferences, and updating `storage_mode` in the `users` table.

---

## Background

These endpoints are the server-side half of the preferences sync feature. They store and retrieve arbitrary JSON blobs (the preferences payload) in the `preferences` JSONB column of the `users` table. `storage_mode` is managed as part of these operations.

---

## Acceptance Criteria

### `GET /users/me/preferences`

- Auth: any authenticated user
- Returns the user's `preferences` JSONB field and `storage_mode`:
  ```json
  {
    "storage_mode": "account",
    "preferences": { ... }
  }
  ```
- If `preferences` is `null` in the DB, return `{ "storage_mode": "local", "preferences": null }`
- Status: `200`

### `PUT /users/me/preferences`

- Auth: any authenticated user
- Body: the full preferences JSON object (the payload structure defined in US-09)
- Upserts the `preferences` JSONB field for the current user
- Sets `storage_mode = 'account'`
- Updates `updated_at`
- Returns: `{ "storage_mode": "account", "preferences": { ... } }`
- Status: `200`

### `DELETE /users/me/preferences`

- Auth: any authenticated user
- Sets `preferences = NULL` and `storage_mode = 'local'` for the current user
- Updates `updated_at`
- Returns: `204 No Content`

### Pydantic Models

- [ ] `PreferencesResponse` model:
  ```python
  class PreferencesResponse(BaseModel):
      storage_mode: str
      preferences: dict | None
  ```
- [ ] `PreferencesRequest` model:
  ```python
  class PreferencesRequest(BaseModel):
      # Accepts any JSON object; validation is intentionally loose
      # since the frontend owns the schema
      model_config = ConfigDict(extra="allow")
  ```
  Or simply accept `dict` directly in the route handler.

### Frontend Types & API Client

- [ ] `lib/types.ts` gains:
  ```ts
  export interface UserPreferences {
    selected_provider?: string;
    models?: Record<string, string>;
    app_mode?: string;
    realtime_interval?: number;
    feature_overrides?: Record<string, unknown>;
    theme?: string;
    azure?: {
      api_version?: string;
      endpoint?: string;
      deployment_name?: string;
    };
  }

  export interface PreferencesResponse {
    storage_mode: "local" | "account";
    preferences: UserPreferences | null;
  }
  ```

- [ ] `lib/api.ts` gains:
  ```ts
  export async function getPreferences(): Promise<PreferencesResponse>
  export async function putPreferences(prefs: UserPreferences): Promise<PreferencesResponse>
  export async function deletePreferences(): Promise<void>
  ```

---

## Files Likely Affected

**Backend**
- `backend/api/users/router.py` — add the three preferences routes (extend existing users router from US-05)
- `backend/service/users/core.py` — add preference read/write/delete methods
- `backend/models/users.py` — add `PreferencesResponse`, `PreferencesRequest` Pydantic models

**Frontend**
- `frontend/src/lib/types.ts` — add `UserPreferences`, `PreferencesResponse`
- `frontend/src/lib/api.ts` — add `getPreferences`, `putPreferences`, `deletePreferences`

---

## Notes

- No schema validation is enforced on the `preferences` JSON at the DB level — it is treated as an opaque blob. The frontend defines the schema.
- If the backend receives a `preferences` object with extra keys (unknown future preference keys), it stores them as-is (`extra="allow"` on the Pydantic model).
- The endpoint reuses the `get_current_user` dependency from US-05 for authentication.
