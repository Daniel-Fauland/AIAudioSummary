# US-07 — Admin Panel UI

**Epic**: Epic 4 — Admin Panel
**Depends on**: US-06
**Blocks**: —

---

## Goal

Build the admin panel interface at `/admin` that allows admins to view all users, add new users by email, and delete non-admin users.

---

## Background

Admins need a web interface to manage who can access the application. The panel must clearly display all users, make mutations easy, and protect against accidentally deleting admin accounts.

---

## Acceptance Criteria

### Layout

- [ ] The page has a sticky header consistent with the main app header (same `Header` component if reusable, or a matching layout with "Admin Panel" as the title)
- [ ] A "Back to App" link/button navigates to `/`
- [ ] The main content area is a card with max-width `768px`, centered

### User Table

- [ ] Fetches all users from `GET /users` on mount
- [ ] Displays a table with columns: **Email**, **Name**, **Role**, **Joined**, **Actions**
- [ ] **Email**: plain text
- [ ] **Name**: plain text, "—" if null
- [ ] **Role**: a badge — `admin` badge uses `--primary-muted` background + `--foreground-accent` text; `user` badge uses `--card-elevated` background + `--foreground-secondary` text
- [ ] **Joined**: formatted date, e.g. "Feb 22, 2026"
- [ ] **Actions**: a "Delete" button (`variant="destructive" size="sm"`) — hidden/disabled for users with `role='admin'`
- [ ] Loading state: skeleton rows while fetching
- [ ] Empty state: "No users found." in `--foreground-muted` (should not normally happen if seeding works)

### Add User

- [ ] An "Add User" button (primary variant) sits above the table (right-aligned)
- [ ] Clicking it opens a Dialog with:
  - Title: "Add User"
  - Email input (required, validated as email format)
  - Name input (optional)
  - "Cancel" (ghost) and "Add User" (primary) buttons
  - Loading state on "Add User" button while request is in flight
- [ ] On success: close dialog, refresh user list, show success toast: *"User {email} added successfully."*
- [ ] On `409 Conflict`: show error toast: *"A user with this email already exists."*
- [ ] On other error: show generic error toast

### Delete User

- [ ] Clicking "Delete" on a user row opens a confirmation Dialog:
  - Title: "Delete User"
  - Body: *"Are you sure you want to remove access for {email}? This action cannot be undone."*
  - "Cancel" (ghost) and "Delete" (destructive) buttons
  - Loading state on "Delete" button while request is in flight
- [ ] On success: close dialog, refresh user list, show success toast: *"User {email} removed."*
- [ ] On `403 Forbidden`: show error toast: *"Admin users cannot be deleted."*
- [ ] On other error: show generic error toast

### Refresh

- [ ] A small refresh icon button next to "Add User" allows manually re-fetching the user list

---

## Files Likely Affected

- `frontend/src/app/admin/page.tsx` — full UI implementation
- `frontend/src/components/admin/UserTable.tsx` — new component (optional, can be inline in page)
- `frontend/src/components/admin/AddUserDialog.tsx` — new component
- `frontend/src/components/admin/DeleteUserDialog.tsx` — new component

---

## UX Notes

- Follow the UX_SPECIFICATION.md for colors, spacing, button variants, and toast patterns.
- The table should use `shadcn/ui` primitives where applicable (no new dependencies needed — a plain HTML `<table>` styled with Tailwind is fine given the simple structure).
- Mobile: table columns may need to hide "Name" or "Joined" on small screens for readability; "Email" + "Role" + "Actions" are the minimum visible columns.
- The delete button for `admin` users should be visually absent (not just disabled) to avoid confusion.
