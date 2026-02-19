# Story 08: Page Integration & Mode Switching

## Summary

Add the top-level mode tab bar (`Standard` / `Realtime`) to `page.tsx` and wire the `RealtimeMode` component alongside the existing workflow.

## Why

This connects the complete realtime feature to the app's main page, allowing users to switch between the existing batch workflow and the new realtime mode.

## Depends On

- [Story 07: Frontend RealtimeMode Orchestrator](./07_frontend_realtime_mode.md)

---

## Scope

### Modified Files

**`frontend/src/app/page.tsx`**

1. **New state:** `appMode: "standard" | "realtime"` — persisted to localStorage key `aias:v1:app_mode`
   - Initialize from localStorage with fallback to `"standard"`
   - Persist on change: `safeSet("aias:v1:app_mode", newMode)`

2. **Mode tab bar:**
   - Rendered below the `Header`, above the `StepIndicator` / realtime content
   - Two tabs: `Standard` and `Realtime`
   - Use shadcn `Tabs` component (or simple button group matching the existing tab styling from `FileUpload`/`AudioRecorder` toggle)
   - Active tab uses accent color (`--primary`)

3. **Conditional rendering:**
   - When `appMode === "standard"`: render existing `StepIndicator` + step content (unchanged)
   - When `appMode === "realtime"`: render `<RealtimeMode />` with all required props

4. **Props for RealtimeMode:**
   - Pass through: `config`, `selectedProvider`, `selectedModel`, `azureConfig`, `selectedPrompt`, `selectedLanguage`, `informalGerman`, `meetingDate`, `authorSpeaker`
   - Pass `getKey` and `hasKey` from `useApiKeys()` hook
   - Pass `onOpenSettings` callback to open the settings sheet

5. **Mode switch guard:**
   - If switching from `realtime` to `standard` while a session is active, show a confirmation dialog (or toast warning) before switching
   - Switching modes does NOT reset the settings (provider, model, keys)

---

## Acceptance Criteria

- [ ] Mode tab bar is visible below the header
- [ ] Clicking "Standard" shows the existing 3-step workflow
- [ ] Clicking "Realtime" shows the RealtimeMode component
- [ ] Selected mode persists across page refreshes (localStorage)
- [ ] Settings sheet works identically in both modes
- [ ] Switching mode while a realtime session is active shows a warning
- [ ] All existing Standard mode functionality is unaffected
- [ ] Frontend builds without errors

## Verification

- Load app → verify mode tab bar appears
- Click Realtime → verify realtime UI renders
- Click Standard → verify existing workflow renders
- Refresh page → verify selected mode persists
- Test full Standard workflow (upload → transcript → summary) still works
- Test mode switch during active realtime session → verify warning
