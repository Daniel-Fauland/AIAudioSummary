# Story 06: Frontend Realtime UI Components

## Summary

Build the individual UI components for the realtime mode: connection status indicator, control bar, live transcript view, and summary view.

## Why

These are the visual building blocks of the realtime mode. They are presentational components that receive state and callbacks as props, making them independently implementable and easy to compose in the orchestrator (Story 07).

## Depends On

- [Story 04: Frontend Types, API Client & AudioWorklet](./04_frontend_types_api_worklet.md) (TypeScript types must exist)

---

## Scope

### New Files

**`frontend/src/components/realtime/ConnectionStatus.tsx`**
- Props: `status: RealtimeConnectionStatus`
- Renders: 8px colored dot + text label
- Dot colors: green (connected), amber pulsing (connecting/reconnecting), gray (disconnected), red (error)
- Uses CSS classes defined in Story 09, but can use inline styles initially

**`frontend/src/components/realtime/RealtimeControls.tsx`**
- Props:
  - `connectionStatus: RealtimeConnectionStatus`
  - `isPaused: boolean`
  - `isSessionEnded: boolean`
  - `elapsedTime: number`
  - `summaryInterval: SummaryInterval`
  - `onStart: () => void`
  - `onPause: () => void`
  - `onResume: () => void`
  - `onStop: () => void`
  - `onIntervalChange: (interval: SummaryInterval) => void`
  - `onMicChange: (deviceId: string) => void`
  - `disabled?: boolean`
- Layout: Horizontal bar with:
  - Start / Pause / Resume / Stop buttons (conditionally shown based on state)
  - Microphone selector (shadcn Select, enumerate devices with `navigator.mediaDevices.enumerateDevices()`)
  - ConnectionStatus component
  - Elapsed time display in `mm:ss` format (monospace font)
  - Summary interval selector (shadcn Select: 1min, 2min, 3min, 5min, 10min)
- Button states:
  - Before start: only Start enabled
  - While recording: Pause + Stop enabled, Start hidden
  - While paused: Resume + Stop enabled
  - After stop: Start New Session button

**`frontend/src/components/realtime/RealtimeTranscriptView.tsx`**
- Props:
  - `accumulatedTranscript: string`
  - `currentPartial: string`
  - `isSessionActive: boolean`
- Renders: Scrollable card
  - Final text in normal style (`text-foreground`)
  - Partial text appended in muted italic style (`text-foreground-muted italic`)
  - Auto-scroll via `useEffect` on transcript change
  - Scroll lock toggle button (anchor icon) at bottom-right corner — when user scrolls up, auto-scroll pauses; button re-enables it
  - Empty state: "Waiting for speech..." in muted text
  - Card header: "Live Transcript"

**`frontend/src/components/realtime/RealtimeSummaryView.tsx`**
- Props:
  - `summary: string`
  - `summaryUpdatedAt: string | null`
  - `isSummaryUpdating: boolean`
  - `isSessionEnded: boolean`
- Renders: Card with:
  - Markdown rendering of summary (use `react-markdown` + `remark-gfm`, same as existing `SummaryView`)
  - CSS fade animation on summary content change
  - "Updating..." badge with `Loader2` spinner when `isSummaryUpdating` is true
  - "Last updated: Xm ago" relative timestamp below summary (updates every 30s)
  - After session ends: Copy Summary and Copy as Markdown buttons (reuse pattern from existing `SummaryView`)
  - Empty state: "Summary will appear after the first interval..." in muted text
  - Card header: "Summary"

---

## Acceptance Criteria

- [ ] `ConnectionStatus` renders correct dot color and label for each status
- [ ] `RealtimeControls` shows correct buttons for each session state (idle, recording, paused, ended)
- [ ] Microphone selector lists available audio input devices
- [ ] Elapsed time displays in `mm:ss` format
- [ ] Interval selector offers options: 1, 2, 3, 5, 10 minutes
- [ ] `RealtimeTranscriptView` displays final text and partial text with distinct styles
- [ ] Auto-scroll works and can be toggled off/on
- [ ] `RealtimeSummaryView` renders markdown content
- [ ] Summary updating state shows spinner badge
- [ ] Relative "last updated" timestamp displays and refreshes
- [ ] Copy buttons appear after session ends
- [ ] All components follow existing styling conventions (dark theme, shadcn/ui primitives)
- [ ] Frontend builds without errors

## Verification

- Render each component in isolation with mock props
- Verify visual styling matches the UX plan
- Test button state transitions in RealtimeControls
- Test auto-scroll behavior in RealtimeTranscriptView
