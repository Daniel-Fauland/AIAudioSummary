# US-10 — Preferences Sync Behavior

**Epic**: Epic 5 — Profile Menu & Storage Mode
**Depends on**: US-09
**Blocks**: —

---

## Goal

When a user is in `storage_mode='account'`, automatically load their preferences from the server on app startup and save changes to the server whenever any setting changes.

---

## Background

US-09 handles the explicit opt-in/opt-out switching flow. This story implements the ongoing sync behavior that makes account storage actually useful day-to-day: preferences are fetched on load and pushed on every change, so all devices stay in sync without the user having to do anything.

---

## Acceptance Criteria

### On App Load (page.tsx)

- [ ] After the session is available (user is authenticated), call `GET /users/me` to determine `storage_mode`
- [ ] If `storage_mode === 'account'`:
  1. Call `GET /users/me/preferences`
  2. Apply each preference to the corresponding `useState` initial value **and** write it to `localStorage` as a cache
  3. The preferences from the server **override** any values already in localStorage
- [ ] If `storage_mode === 'local'`: continue using localStorage as today (no change)
- [ ] During initial preferences fetch, show a loading indicator (e.g., the existing full-page config loading skeleton) — do not render the main app until preferences are applied

### On Setting Change (write-through)

- [ ] Every place in the app that writes a preference to localStorage should also — when `storage_mode === 'account'` — call `PUT /users/me/preferences` with the **full** current preferences payload (not a partial update)
- [ ] This includes changes to: provider, model, app mode, realtime interval, feature overrides, theme, Azure config
- [ ] The backend call is fire-and-forget (do not block the UI or show a loading state for individual setting saves)
- [ ] On error: log to console but do not show a toast (avoid spamming the user for transient network errors on minor setting changes)

### `usePreferences` Hook (or equivalent)

- [ ] Extract the preferences sync logic into a dedicated hook `usePreferences` (or integrate into the existing `useApiKeys` / `useConfig` hooks):
  - `storageMode: 'local' | 'account'`
  - `loadPreferences()` — fetches and applies server prefs
  - `savePreferences()` — pushes current state to server (called after each change)
  - `isLoading: boolean` — true while fetching on startup
- [ ] The hook reads `storageMode` from `GET /users/me` response and keeps it in memory

### Conflict Resolution

- [ ] Server preferences always win on initial load (server is source of truth in account mode)
- [ ] No conflict resolution for mid-session changes (last write wins; concurrent sessions on different devices will naturally diverge until next load)

---

## Files Likely Affected

- `frontend/src/app/page.tsx` — add preferences load on mount, pass storage mode down
- `frontend/src/hooks/usePreferences.ts` — new hook
- `frontend/src/lib/api.ts` — `getMe()`, `getPreferences()`, `putPreferences()` (from US-11)
- All settings change handlers in `page.tsx` and `SettingsSheet` — add `savePreferences()` call after each `safeSet()` call

---

## Notes

- **API keys are explicitly excluded from all sync operations** — the `savePreferences()` function must never read or write `aias:v1:apikey:*` keys.
- The `useConfig` hook fetches backend configuration (providers, templates, etc.) — this is separate from user preferences and unchanged.
- `localStorage` continues to be used as a local cache even in account mode; this ensures the app works offline and avoids flicker on reload.
- If `GET /users/me/preferences` returns `null` (user has account mode set but no preferences saved yet), fall back to current localStorage values without overwriting them.
