---
name: frontend-dev
description: Frontend development skill for implementing UI features. Triggered manually with "Implement FE:".
---

# Frontend Development Skill

You are implementing a frontend feature for the AIAudioSummary project.

## React & Next.js Best Practices

When writing React or Next.js code, follow the performance optimization rules documented in [AGENTS.md](AGENTS.md). The rules are organized by priority:

1. **CRITICAL** — Eliminating Waterfalls, Bundle Size Optimization
2. **HIGH** — Server-Side Performance
3. **MEDIUM-HIGH** — Client-Side Data Fetching
4. **MEDIUM** — Re-render Optimization, Rendering Performance
5. **LOW-MEDIUM** — JavaScript Performance
6. **LOW** — Advanced Patterns

Before writing any code, read the relevant sections of AGENTS.md for the patterns you will use.

## Workflow

### Step 1: Understand the request

Read and understand the feature request passed via `$ARGUMENTS`.

### Step 2: Research libraries and frameworks

Before writing any code, use the **Context7 MCP** (`mcp__context7`) to look up current, accurate documentation for every library or framework you will use (e.g., React, Next.js, Streamlit, etc.). Do NOT rely on memory alone — always fetch up-to-date docs first.

### Step 3: Plan the implementation

- Identify which files and components need changes.
- Read all files you intend to modify before making changes.
- Consider the performance implications using the rules in AGENTS.md.

### Step 4: Implement following best practices

Apply the React/Next.js performance rules from AGENTS.md, especially:

- Eliminate request waterfalls — use `Promise.all()` for independent operations.
- Minimize bundle size — use dynamic imports for heavy components, avoid barrel file imports.
- Optimize re-renders — derive state during render, use functional `setState`, narrow effect dependencies.
- Minimize serialization at RSC boundaries — only pass fields the client actually uses.
- Use `useRef` for transient values that don't need to trigger re-renders.
- Use explicit conditional rendering (`? :` instead of `&&`) to avoid rendering `0` or `NaN`.
- Use `.toSorted()` instead of `.sort()` to avoid mutating arrays in state/props.

### Step 5: Test your implementation

Before finishing, you **must** verify your changes work:

1. Start the frontend and confirm it loads without errors.
2. Test the new/modified UI features interactively or via automated checks.
3. Verify that existing functionality is not broken.

Notify the user of the test results — what passed, what was tested, and any issues found.

### Step 6: Update documentation

As the very last step, review [architecture.md](../../../docs/architecture.md) in the project root. If your changes introduced new components, architectural changes, configuration options, or anything that alters the project structure, update [architecture.md](../../../docs/architecture.md) accordingly. If no documentation update is needed, explicitly state that.
