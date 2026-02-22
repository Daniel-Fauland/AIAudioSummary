# US-13 — Update Cookie Settings Page

**Epic**: Epic 6 — Legal / Privacy Updates
**Depends on**: US-12
**Blocks**: —

---

## Goal

Update the Cookie Settings dialog to mention the optional server-side preference storage as a distinct data category separate from cookies, and clarify that it requires explicit opt-in.

---

## Background

The Cookie Settings dialog currently covers browser-based storage (localStorage, session cookies for auth). The new optional account storage (US-09) stores data server-side — this is not a cookie but should be mentioned in the Cookie Settings context so users have a complete picture of all data storage mechanisms in one place.

---

## Acceptance Criteria

### New Section or Note: "Account Storage (Optional)"

- [ ] A new entry or section is added to the Cookie Settings dialog labeled "Account Storage (Optional)"
- [ ] It clarifies:
  - This is **not** a cookie — it is server-side storage in a database
  - It is **disabled by default**; only activated when the user explicitly enables "Account Storage" in their profile menu
  - **What is stored**: App preferences (settings, theme, selected models, prompt templates)
  - **What is never stored**: API keys
  - Users can disable this and delete all server-side data at any time via the profile menu → "Storage Mode" → "Switch to Local"
- [ ] The section is visually distinct from the cookie entries (e.g., with a `--color-info-muted` background note or a separator)

### Existing Entries

- [ ] Existing cookie entries (e.g., authentication session cookie, localStorage entries) are unchanged
- [ ] If any existing entry incorrectly describes server-side storage as non-existent, update it

### Toggle State

- [ ] The "Account Storage" section does **not** have a toggle switch (it is not a cookie consent choice — it is managed via the profile menu)
- [ ] Instead, show a "Manage in Profile" link/button that:
  - On desktop: opens the profile dropdown
  - On mobile: navigates to the profile area
  - Or simply shows a static note: *"Manage this setting in your profile menu → Storage Mode"*

---

## Files Likely Affected

- The component that renders the Cookie Settings dialog content (likely in `frontend/src/components/layout/Footer.tsx` or a dedicated `CookieSettingsDialog` component)

---

## Notes

- Keep the tone consistent with the rest of the Cookie Settings content — factual, concise, and user-friendly.
- The distinction between "cookie" and "server-side database storage" should be stated plainly for non-technical users.
- This story completes the legal/privacy epic — no further legal updates are expected for this milestone.
