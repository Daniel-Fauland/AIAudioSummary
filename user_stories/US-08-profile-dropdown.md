# US-08 — Profile Dropdown Menu

**Epic**: Epic 5 — Profile Menu & Storage Mode
**Depends on**: US-04, US-05
**Blocks**: US-09

---

## Goal

Replace the existing static `UserMenu` component with a clickable dropdown that shows user profile info, storage mode, an Admin Panel link (admin-only), and a Sign Out option.

---

## Background

The current `UserMenu` component (`components/auth/UserMenu.tsx`) shows the user's avatar and a sign-out button. Now that we have roles and storage modes, this needs to become a richer dropdown menu that consolidates all user-level actions.

---

## Acceptance Criteria

### Trigger

- [ ] The user avatar/icon in the header opens a `DropdownMenu` (shadcn/ui `DropdownMenu` component) on click
- [ ] The trigger is the same avatar button as today — no visual change to the header when closed

### Dropdown Content

The dropdown contains the following items in order:

1. **Email header** (not clickable)
   - Displays `session.user.email`
   - Style: `text-xs text-foreground-muted`, cursor `default`
   - Separated from the items below by a `DropdownMenuSeparator`

2. **Storage Mode item**
   - Label: "Storage Mode"
   - Sub-label / value: "Local Storage" or "Account Storage" (current mode)
   - Clicking opens the storage mode toggle flow (US-09 implements this — for now, clicking shows a toast "Coming soon" or is a placeholder)
   - Icon: `HardDrive` (local) or `Cloud` (account) from Lucide

3. **Admin Panel item** (only visible if `session.user.role === 'admin'`)
   - Label: "Admin Panel"
   - Icon: `Shield` from Lucide
   - Navigates to `/admin` on click
   - Separated from the item above by a `DropdownMenuSeparator`

4. **Sign Out item**
   - Label: "Sign out"
   - Icon: `LogOut` from Lucide
   - Calls NextAuth `signOut()` on click
   - Style: `text-destructive` (red) to signal a destructive action, consistent with shadcn DropdownMenuItem destructive variant

### Data Loading

- [ ] On dropdown open, call `GET /users/me` to get the latest `storage_mode` and `role`
- [ ] While loading: show a skeleton or the previously cached values
- [ ] Cache the result in component state (no need for global state); re-fetch on each open

### Session Role

- [ ] `session.user.role` (populated in US-04) is used as the initial role check for showing/hiding the Admin Panel item — the `/users/me` call confirms the latest value

---

## Files Likely Affected

- `frontend/src/components/auth/UserMenu.tsx` — replace with dropdown implementation
- Add `DropdownMenu` shadcn component if not already installed: `npx shadcn@latest add dropdown-menu`

---

## UX Notes

- Follow the UX_SPECIFICATION.md for colors and button styles.
- The dropdown should be `min-w-[200px]` to comfortably show email addresses.
- The "Sign out" item should have a slight `text-destructive` color, consistent with shadcn DropdownMenuItem destructive usage.
- On mobile, the dropdown should still open (not a sheet/drawer for this iteration).
