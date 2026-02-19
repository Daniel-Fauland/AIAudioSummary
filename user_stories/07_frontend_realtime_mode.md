# Story 07: Frontend RealtimeMode Orchestrator

## Summary

Create the `RealtimeMode` component that wires the `useRealtimeSession` hook to the realtime UI components and handles prerequisite validation, LLM config passing, and responsive layout.

## Why

This orchestrator bridges the hook (state + logic) with the UI components (presentation), validates that required API keys are configured before starting, and manages the responsive layout (side-by-side on desktop, tabbed on mobile).

## Depends On

- [Story 05: Frontend Realtime Session Hook](./05_frontend_realtime_hook.md)
- [Story 06: Frontend Realtime UI Components](./06_frontend_realtime_ui_components.md)

---

## Scope

### New Files

**`frontend/src/components/realtime/RealtimeMode.tsx`**

**Props (received from `page.tsx`):**
- `config: ConfigResponse | null`
- `selectedProvider: LLMProvider`
- `selectedModel: string`
- `azureConfig: AzureConfig | null`
- `selectedPrompt: PromptTemplate | null`
- `selectedLanguage: string`
- `informalGerman: boolean`
- `meetingDate: string`
- `authorSpeaker: string`
- `getKey: (provider: string) => string`
- `hasKey: (provider: string) => boolean`
- `onOpenSettings: () => void`

**Behavior:**
1. Instantiate `useRealtimeSession` hook
2. On start:
   - Validate AssemblyAI key exists (`hasKey("assemblyai")`) — if not, show toast and open settings
   - Validate LLM provider key exists (`hasKey(selectedProvider)`) — if not, show toast and open settings
   - Call `startSession()` with AssemblyAI key
3. Pass LLM config to hook via `setLlmConfig()` whenever settings change (useEffect)
4. Wire control callbacks: `onStart`, `onPause`, `onResume`, `onStop`, `onIntervalChange`
5. On session end: show action buttons (Copy Transcript, Copy Summary, Start New Session)

**Layout:**
- Desktop (≥768px): `RealtimeControls` on top, then a two-column grid with `RealtimeTranscriptView` (left) and `RealtimeSummaryView` (right)
- Mobile (<768px): `RealtimeControls` stacked, then a tab toggle (`[ Transcript | Summary ]`) to switch between panels
- Use `md:` Tailwind breakpoint for responsive behavior

**Session end state:**
- After stop + final summary completes: show both transcript and summary in read-only mode
- Action buttons below: Copy Transcript, Copy Summary, Start New Session
- "Start New Session" calls `resetSession()` from the hook

---

## Acceptance Criteria

- [ ] Component validates API keys before starting a session
- [ ] Missing key shows toast notification and opens settings sheet
- [ ] Hook is properly wired to all UI components
- [ ] LLM config updates are forwarded to the hook when settings change
- [ ] Desktop layout: controls bar + two-column grid (transcript | summary)
- [ ] Mobile layout: controls + tab toggle between transcript and summary
- [ ] Session end shows final transcript + summary with Copy and Start New Session buttons
- [ ] Start New Session resets all state for a fresh session
- [ ] Frontend builds without errors

## Verification

- Open the app, navigate to Realtime mode
- Without API keys: click Start → verify toast appears and settings open
- With API keys: click Start → verify session begins (controls update, transcript area activates)
- On desktop: verify two-column layout
- On mobile viewport: verify tabbed layout
- Stop session → verify final state with action buttons
