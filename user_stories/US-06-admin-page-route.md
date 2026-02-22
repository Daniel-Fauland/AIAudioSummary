# US-06 — Admin Page Route & Access Guard

**Epic**: Epic 4 — Admin Panel
**Depends on**: US-04, US-05
**Blocks**: US-07

---

## Goal

Create the `/admin` route in the Next.js app, protected so that only users with `role='admin'` can access it. Non-admin users are redirected to `/` with an error toast.

---

## Background

The admin panel allows admins to manage user access at runtime. Before building the UI (US-07), the route structure and access guard must be in place. The guard uses the `role` already present in the NextAuth session token (populated in US-04).

---

## Acceptance Criteria

### Route & Page Skeleton

- [ ] A new page exists at `frontend/src/app/admin/page.tsx`
- [ ] The page is a client component (`"use client"`)
- [ ] On mount, it reads `session.user.role` from the NextAuth session (via `useSession()`)
- [ ] If role is NOT `'admin'`:
  - Redirect to `/` using `router.push('/')`
  - Show a Sonner error toast: *"You do not have admin access."*
- [ ] If role is `'admin'`: render the admin panel content (placeholder text is fine for this story; full UI in US-07)

### Route Protection in proxy.ts

- [ ] `src/proxy.ts` is updated to also allow `/admin` through for authenticated users (it is not a public route — the page itself handles the role check, so the proxy only needs to ensure the user is authenticated)

### Navigation

- [ ] A link to `/admin` appears in the profile dropdown (US-08 implements the dropdown — add the link when that story is implemented). For now, `/admin` is accessible by navigating directly to the URL.

### Loading State

- [ ] While `session` is loading (`status === 'loading'`), show a full-page spinner or skeleton (consistent with the app's existing loading patterns)

---

## Files Likely Affected

- `frontend/src/app/admin/page.tsx` — new file
- `frontend/src/proxy.ts` — ensure `/admin` is not blocked

---

## UX Notes

- The redirect + toast should feel instant — no flash of admin content before redirect.
- Use the same Sonner error toast pattern as the rest of the app (see `lib/errors.ts` / existing `toast.error()` calls in `page.tsx`).
- The page title in the browser tab should read "Admin — AI Audio Summary".
