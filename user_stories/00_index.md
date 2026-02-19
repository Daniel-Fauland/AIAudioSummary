# Realtime Transcription + Incremental Summary — User Stories Index

This document tracks all user stories for the Realtime Transcription feature and defines their implementation order.

## Overview

The feature adds a **Realtime mode** to the app where audio is transcribed live via AssemblyAI's streaming API and summaries are generated incrementally at configurable intervals. It requires WebSocket infrastructure, PCM audio capture, and a new frontend mode with live transcript + evolving summary display.

**Key constraint:** Speaker diarization is NOT available in AssemblyAI's streaming API.

---

## Implementation Order

Stories are ordered by dependency — each story builds on the ones before it.

| #  | Story                                           | Layer    | Depends On | Estimated Scope |
|----|------------------------------------------------|----------|------------|-----------------|
| 01 | [Backend Models & Session Manager](./01_backend_models_and_session.md) | Backend  | —          | Small           |
| 02 | [Backend WebSocket Relay](./02_backend_websocket_relay.md) | Backend  | 01         | Large           |
| 03 | [Backend Incremental Summary Endpoint](./03_backend_incremental_summary.md) | Backend  | 01         | Medium          |
| 04 | [Frontend Types, API Client & AudioWorklet](./04_frontend_types_api_worklet.md) | Frontend | 03         | Medium          |
| 05 | [Frontend Realtime Session Hook](./05_frontend_realtime_hook.md) | Frontend | 02, 04     | Large           |
| 06 | [Frontend Realtime UI Components](./06_frontend_realtime_ui_components.md) | Frontend | 04         | Medium          |
| 07 | [Frontend RealtimeMode Orchestrator](./07_frontend_realtime_mode.md) | Frontend | 05, 06     | Medium          |
| 08 | [Page Integration & Mode Switching](./08_page_integration.md) | Frontend | 07         | Medium          |
| 09 | [CSS, Polish & End-to-End Testing](./09_css_polish_testing.md) | Full Stack | 08       | Medium          |

### Dependency Graph

```
01 ──┬──► 02 ──────────┐
     │                  │
     └──► 03 ──► 04 ──┤──► 05 ──┐
                  │    │         │
                  └────┼──► 06  │
                       │    │   │
                       │    ▼   ▼
                       │   07 ◄─┘
                       │    │
                       │    ▼
                       │   08
                       │    │
                       │    ▼
                       └── 09
```

**Parallelization opportunities:**
- Stories 02 and 03 can be implemented in parallel (both depend only on 01)
- Story 06 (UI components) can be built in parallel with Story 05 (hook), since both depend on 04

---

## Definition of Done (per story)

Each story is complete when:
1. All listed files are created/modified
2. Code follows existing project conventions (see `docs/architecture.md`)
3. Backend starts without errors (`cd backend && uv run main.py`)
4. Frontend builds without errors (`cd frontend && npm run build`)
5. Story-specific acceptance criteria are met
