# Story 09: CSS, Polish & End-to-End Testing

## Summary

Add the realtime-specific CSS animations and styles, polish visual details, and perform end-to-end testing of the complete realtime flow.

## Why

This final story ensures visual consistency with the UX specification, adds the animations and micro-interactions that make the realtime experience feel polished, and validates the entire feature works end-to-end.

## Depends On

- [Story 08: Page Integration & Mode Switching](./08_page_integration.md)

---

## Scope

### Modified Files

**`frontend/src/app/globals.css`** — Add realtime-specific styles:

```css
/* Partial transcript text (in-progress words) */
.realtime-partial {
  color: var(--foreground-muted);
  font-style: italic;
}

/* Summary fade-in animation when content updates */
@keyframes summaryFadeIn {
  from { opacity: 0.3; }
  to { opacity: 1; }
}
.summary-fade-enter {
  animation: summaryFadeIn 400ms ease-out;
}

/* Connection status dot */
.connection-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}
.connection-dot.connected { background: var(--success); }
.connection-dot.connecting,
.connection-dot.reconnecting { background: var(--warning); animation: blink 1s step-end infinite; }
.connection-dot.disconnected { background: var(--foreground-muted); }
.connection-dot.error { background: var(--destructive); }
```

### Polish Items

- [ ] Verify all components use the project's dark theme colors consistently
- [ ] Verify toast notifications appear for errors (invalid key, connection failure, summary failure)
- [ ] Verify the mode tab bar styling is consistent with existing tab patterns in the app
- [ ] Verify responsive layout breakpoints work correctly (desktop two-column, mobile tabbed)
- [ ] Verify auto-scroll toggle works smoothly
- [ ] Verify elapsed time counter is accurate
- [ ] Verify the summary fade animation triggers on each update
- [ ] Verify copy buttons use the same toast feedback pattern as existing copy buttons

### Environment Variable Documentation

**`frontend/.env.local.example`** — Ensure `NEXT_PUBLIC_BACKEND_WS_URL` is present with documentation comment

---

## End-to-End Test Plan

### Prerequisites
- Backend running: `cd backend && uv run main.py`
- Frontend running: `cd frontend && npm run dev`
- Valid AssemblyAI API key
- Valid LLM provider API key (e.g., OpenAI)

### Test Cases

1. **Happy path — full realtime session:**
   - Open app → switch to Realtime mode
   - Configure API keys in settings
   - Click Start → grant microphone permission
   - Speak for 2+ minutes
   - Verify: live transcript appears with partial (italic) → final (solid) transitions
   - Verify: summary appears after first interval
   - Verify: summary updates at subsequent intervals
   - Click Stop → verify final summary is generated
   - Verify: Copy Transcript and Copy Summary buttons work
   - Click Start New Session → verify clean state

2. **Missing API keys:**
   - Remove AssemblyAI key → click Start → verify toast + settings open
   - Remove LLM key → click Start → verify toast + settings open

3. **Pause and resume:**
   - Start session → speak → pause → verify audio stops
   - Resume → speak again → verify transcript continues

4. **Mode switching:**
   - Start realtime session → switch to Standard mode → verify warning
   - Verify Standard mode workflow still works fully

5. **Interval change:**
   - Start session with 2min interval → change to 1min → verify timer resets

6. **Error handling:**
   - Use invalid AssemblyAI key → verify error message appears
   - Disconnect network → verify reconnection status indicator
   - Use invalid LLM key → verify summary error toast (session continues)

7. **Mobile responsive:**
   - Resize browser to mobile width
   - Verify controls stack vertically
   - Verify transcript/summary tab toggle works

---

## Acceptance Criteria

- [ ] All CSS animations and styles from UX plan are implemented
- [ ] Full end-to-end flow works: start → transcribe → summarize → stop → copy
- [ ] Error cases are handled gracefully with user-friendly messages
- [ ] Responsive layout works on desktop and mobile viewports
- [ ] No console errors during normal operation
- [ ] Existing Standard mode is fully unaffected
- [ ] Frontend builds without errors (`npm run build`)
- [ ] Backend starts without errors (`uv run main.py`)
