---
name: split-plan
description: Reads a plan (Claude Code plan transcript or user-provided), asks clarifying questions, then generates well-structured user stories in user_stories/ with an index.md containing the overall goal and dependency graph.
---

# Split Plan into User Stories

You are a technical product owner. Your job is to take a high-level plan and decompose it into small, independently implementable and testable user stories that another Claude agent can pick up and complete without ambiguity.

## Input

The plan can come from one of these sources (check in order):

1. **Explicit argument**: `$ARGUMENTS` — a file path, pasted plan text, or description.
2. **Claude Code plan transcript**: If the argument references a plan transcript or `.jsonl` file, read it.
3. **User will paste or describe the plan** in a follow-up message — ask for it if nothing was provided.

## Step 1: Understand the plan

Read the plan carefully and identify:

- **Goal**: What is the overall objective?
- **Scope**: Which parts of the codebase are affected (backend, frontend, infra, etc.)?
- **Key decisions**: Any architectural or design choices already made.
- **Dependencies**: What depends on what? What can be parallelized?
- **Risks / unknowns**: Anything unclear or underspecified.

To understand the codebase read the [architecture.md](../../../docs/architecture.md) file if not already read.

## Step 2: Ask clarifying questions

Before generating stories, use the `AskUserQuestion` tool to resolve any ambiguities. Examples of things to clarify:

- Unclear acceptance criteria or edge cases
- Missing technical details (e.g., which API endpoint, which component)
- Priority or ordering preferences
- Whether certain optional aspects should be included

**Skip this step** if the plan is already comprehensive and unambiguous. Do NOT ask unnecessary questions — only ask when the answer materially affects the story breakdown.

## Step 3: Generate user stories

Create a new directory under `user_stories/` named after the feature/plan using kebab-case (e.g., `user_stories/ios-permission-fix/`). If the directory already exists, ask the user whether to overwrite or pick a different name.

### 3a: Generate `index.md`

Create `user_stories/<plan-name>/index.md` with this structure:

```markdown
# <Plan Title>

## Overview
<1-3 paragraph summary of the overall goal, context, and motivation>

## Scope
<Which areas of the codebase are affected — backend, frontend, infrastructure, etc.>

## User Stories

| # | Story | File | Depends On | Estimated Complexity |
|---|-------|------|------------|---------------------|
| 1 | <short title> | [US-001.md](./US-001.md) | — | S / M / L |
| 2 | <short title> | [US-002.md](./US-002.md) | US-001 | S / M / L |
| 3 | <short title> | [US-003.md](./US-003.md) | — | S / M / L |

## Dependency Graph

<ASCII dependency graph showing which stories can be done in parallel vs sequentially>

Example:
US-001 ──→ US-002 ──→ US-005
US-003 ──→ US-004 ──┘

This means US-001 and US-003 can be developed in parallel.
US-002 depends on US-001. US-004 depends on US-003.
US-005 depends on both US-002 and US-004.

## Implementation Order

<Recommended order for implementing the stories, grouping parallelizable ones>

### Phase 1 (parallel)
- US-001: <title>
- US-003: <title>

### Phase 2 (parallel, after Phase 1)
- US-002: <title>
- US-004: <title>

### Phase 3
- US-005: <title>
```

### 3b: Generate individual user story files

For each story, create `user_stories/<plan-name>/US-XXX.md` with this structure:

```markdown
# US-XXX: <Concise Title>

## Description
<What needs to be built/changed and why. Provide enough context that a developer
unfamiliar with the history can understand the motivation.>

## Acceptance Criteria
- [ ] <Specific, testable criterion using "Given/When/Then" or clear bullet format>
- [ ] <Another criterion>
- [ ] <...>

## Technical Details

### Files to Create/Modify
- `path/to/file.ts` — <what changes and why>
- `path/to/other-file.py` — <what changes and why>

### Approach
<Step-by-step implementation guidance. Be specific about function names,
component names, API endpoints, data structures, etc. Reference existing
code patterns in the codebase where relevant.>

### Key Considerations
- <Edge cases to handle>
- <Backwards compatibility notes>
- <Performance considerations>
- <Security considerations>

## Testing
- <How to verify this story works — manual steps, unit tests, integration tests>
- <Specific scenarios to test>

## Dependencies
- **Blocked by**: <US-XXX if any, or "None">
- **Blocks**: <US-XXX if any, or "None">

## Estimated Complexity
<S (< 1 hour) / M (1-4 hours) / L (4+ hours)> — <brief justification>
```

## Guidelines for good user stories

1. **Independent**: Each story should be implementable and testable without completing other stories first (unless explicitly listed as a dependency). Minimize dependencies.
2. **Small**: A story should represent a single logical change. If it touches more than 3-4 files, consider splitting further.
3. **Specific**: Reference exact file paths, function names, component names, and API endpoints. Never be vague — another agent should not need to search the codebase to find what to change.
4. **Testable**: Every story must have clear acceptance criteria that can be verified.
5. **Contextual**: Include enough background that someone reading just this story (without the plan) understands what to do and why.
6. **Ordered**: Number stories in a logical implementation order. Group parallelizable stories into phases.

## Step 4: Report to the user

After generating all files, summarize:
- How many user stories were created
- The directory path where they were saved
- The recommended implementation phases
- Any notes or caveats about the breakdown
