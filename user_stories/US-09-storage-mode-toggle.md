# US-09 — Storage Mode Toggle Logic

**Epic**: Epic 5 — Profile Menu & Storage Mode
**Depends on**: US-08, US-11
**Blocks**: US-10, US-12

---

## Goal

Implement the storage mode toggle in the profile dropdown, including the privacy consent dialogs and the data migration logic when switching between local and account storage modes.

---

## Background

Users default to `storage_mode='local'` (all preferences in localStorage). Optionally, they can switch to `storage_mode='account'` to store preferences server-side, enabling cross-device sync. API keys are **always** excluded from this sync. Switching modes must be deliberate and accompanied by clear privacy communication.

---

## Acceptance Criteria

### Storage Mode Item in Dropdown (extends US-08)

- [ ] The "Storage Mode" item in the profile dropdown is fully clickable and opens the appropriate dialog based on current mode
- [ ] Current mode label updates reactively after a successful switch

---

### Switching Local → Account (Opt-in)

- [ ] A `Dialog` opens with:
  - **Title**: "Enable Account Storage"
  - **Body**: *"Your settings, prompt templates, and theme preferences will be stored on our server. This allows you to access your configuration from any device. API keys are never stored on the server and will always remain in your browser. By enabling this, you consent to your preferences being stored on our server. You can switch back to local storage at any time."*
  - **Buttons**: "Cancel" (ghost) and "Enable Account Storage" (primary)

- [ ] On "Enable Account Storage":
  1. Collect all relevant data from `localStorage` (see "Preferences Payload" below)
  2. Call `PUT /users/me/preferences` with the collected data
  3. On success:
     - Update `storage_mode` in the local state to `'account'`
     - Show success toast: *"Account storage enabled. Your preferences are now synced."*
     - Close dialog
  4. On error: show error toast, close dialog, leave mode as `'local'`

---

### Switching Account → Local (Opt-out)

- [ ] A `Dialog` opens with:
  - **Title**: "Switch to Local Storage"
  - **Body**: *"Your settings will be downloaded to this browser and deleted from our server. If you use multiple devices, your settings will no longer sync between them."*
  - **Buttons**: "Cancel" (ghost) and "Switch to Local" (secondary)

- [ ] On "Switch to Local":
  1. Call `GET /users/me/preferences` to fetch latest server preferences
  2. Write the fetched preferences to `localStorage` (all keys, overwriting current values)
  3. Call `DELETE /users/me/preferences` to clear from DB + set `storage_mode='local'`
  4. On success:
     - Update `storage_mode` in local state to `'local'`
     - Show success toast: *"Switched to local storage. Your preferences have been downloaded."*
     - Close dialog
  5. On error: show error toast, close dialog, leave mode as `'account'`

---

### Preferences Payload

The following localStorage keys are included in the preferences sync (everything EXCEPT API keys):

| localStorage key | Pref field name |
|---|---|
| `aias:v1:selected_provider` | `selected_provider` |
| `aias:v1:model:{provider}` (all providers) | `models` (object) |
| `aias:v1:app_mode` | `app_mode` |
| `aias:v1:realtime_interval` | `realtime_interval` |
| `aias:v1:feature_overrides` | `feature_overrides` |
| `aias:v1:theme` | `theme` |
| `aias:v1:azure:api_version` | `azure.api_version` |
| `aias:v1:azure:endpoint` | `azure.endpoint` |
| `aias:v1:azure:deployment_name` | `azure.deployment_name` |

**Excluded from sync (always local-only)**:
- `aias:v1:apikey:*` — all API keys
- Any other `aias:v1:apikey:*` pattern

The payload structure sent to the backend:

```json
{
  "selected_provider": "openai",
  "models": {
    "openai": "gpt-4o",
    "anthropic": "claude-sonnet-4-6"
  },
  "app_mode": "standard",
  "realtime_interval": 2,
  "feature_overrides": {},
  "theme": "dark",
  "azure": {
    "api_version": "",
    "endpoint": "",
    "deployment_name": ""
  }
}
```

---

## Files Likely Affected

- `frontend/src/components/auth/UserMenu.tsx` — add dialog logic, switching handlers
- `frontend/src/components/auth/StorageModeDialog.tsx` — new component (opt-in and opt-out dialogs)
- `frontend/src/lib/api.ts` — calls to preferences endpoints (US-11)

---

## UX Notes

- Both dialogs should have `AlertDialog`-style prominence to ensure the user reads the consequence text.
- The "Enable Account Storage" button is primary orange; "Switch to Local" is secondary to convey lower risk.
- Loading states: show a spinner inside the confirm button while the network request is in flight; disable both buttons.
- The storage mode label in the dropdown should update immediately on success (optimistic UI is fine since we confirm server-side).
