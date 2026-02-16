---
name: implement-feature
description: Routes feature implementation to the appropriate backend or frontend skill. Triggered manually with "Implement Feature:".
---

# Feature Implementation Router

You are implementing a feature for the AIAudioSummary project. Your job is to analyze the request and delegate to the correct specialized skill(s).

## Step 1: Analyze the request

Read the feature request: `$ARGUMENTS`

Determine which parts of the codebase are affected:

- **Backend-only**: Changes to API endpoints, services, models, config, or prompt templates in `backend/`.
- **Frontend-only**: Changes to UI components, pages, or frontend logic in `frontend/`.
- **Full-stack**: Changes span both backend and frontend.

## Step 2: Delegate to the appropriate skill(s)

Based on your analysis, invoke the specialized skill(s) using the Skill tool:

- **Backend work** → invoke `backend-dev` with the backend-specific portion of the request.
- **Frontend work** → invoke `frontend-dev` with the frontend-specific portion of the request.
- **Full-stack** → invoke `backend-dev` first (APIs must exist before the UI can consume them), then invoke `frontend-dev` second.

Always pass clear, specific instructions to each skill describing exactly what it needs to implement.

## Step 3: Verify integration

- If both skills were invoked (full-stack feature), verify that the frontend correctly integrates with the new/modified backend endpoints. Confirm request/response models match and the end-to-end flow works.
- Always update the [architecture.md](../../../docs/architecture.md) file if you make any structural changes to the codebase.
