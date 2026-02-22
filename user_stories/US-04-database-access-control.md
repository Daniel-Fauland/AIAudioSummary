# US-04 — Replace ALLOWED_EMAILS with Database Access Control

**Epic**: Epic 3 — User Access Management
**Depends on**: US-03
**Blocks**: US-06, US-08

---

## Goal

Remove the static `ALLOWED_EMAILS` environment variable and replace it with database-driven access control: only users whose email exists in the `users` table can log in via Google OAuth.

---

## Background

Currently, the NextAuth `signIn` callback checks the user's email against the `ALLOWED_EMAILS` env var. This is cumbersome to manage (requires redeployment to change the list) and doesn't scale. Moving to a database allowlist allows admins to grant/revoke access at runtime via the admin panel.

---

## Acceptance Criteria

### Backend

- [ ] A new endpoint `GET /auth/verify` accepts query param `email` and returns:
  - `200 { "allowed": true, "name": "...", "role": "user"|"admin" }` if the email exists in the `users` table
  - `200 { "allowed": false }` if the email is not found
  - No authentication required for this endpoint (it is called during the sign-in flow before a session exists)
- [ ] The endpoint is registered in `main.py` under a new `auth` router

### Frontend — NextAuth Config

- [ ] `ALLOWED_EMAILS` is removed from `frontend/.env.local.example` and all code
- [ ] The `signIn` callback in `frontend/src/auth.ts` is updated:
  1. After Google OAuth returns a valid Google account, call `GET {BACKEND_INTERNAL_URL}/auth/verify?email={email}` from within the callback (server-side call)
  2. If `allowed: false` → return `false` (deny login)
  3. If `allowed: true` → return `true` (allow login); optionally store `role` in the session token

### Frontend — Session Token

- [ ] The NextAuth `jwt` callback enriches the token with `role` from the verify response (so it is available in `useSession()` on the client)
- [ ] The NextAuth `session` callback exposes `session.user.role` to the client

### Frontend — Error Page

- [ ] When a login is denied, NextAuth redirects to `/login?error=AccessDenied`
- [ ] The login page (`src/app/login/page.tsx`) shows a user-friendly message when `error=AccessDenied` is in the query string: *"Access denied. Please contact an administrator to request access."*

### Verification

- [ ] A user whose email is in the `users` table can log in
- [ ] A user whose email is NOT in the `users` table is redirected to `/login?error=AccessDenied` with the error message shown
- [ ] Removing `ALLOWED_EMAILS` from `.env.local` causes no startup errors

---

## Files Likely Affected

**Backend**
- `backend/api/auth/router.py` — new file, `GET /auth/verify`
- `backend/service/auth/core.py` — new file, DB lookup logic
- `backend/main.py` — register auth router

**Frontend**
- `frontend/src/auth.ts` — update `signIn` and `jwt` callbacks
- `frontend/src/app/login/page.tsx` — show AccessDenied error
- `frontend/.env.local.example` — remove `ALLOWED_EMAILS`

---

## Security Notes

- The `/auth/verify` endpoint returns only a boolean and role — it does not expose sensitive user data.
- The call is made server-side (within the NextAuth callback using `BACKEND_INTERNAL_URL`), never from the browser directly.
- The endpoint has no authentication requirement by design — there is no session yet at the point it is called.
