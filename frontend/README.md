# AI Audio Summary Platform

A modern, responsive web application for audio file summarization, built with Next.js, Tailwind CSS, and a strict custom design system.

## Features

- Step-based workflow (no login required)
- Step 1: Upload audio file and define system prompt
- Modern, enterprise-grade UI (see `cursor/design.json`)
- Fully responsive and accessible
- No navigation bar or sidebar; stepper at the top
- Clean, maintainable code with TypeScript

## Design System

All colors, gradients, typography, spacing, and component states strictly follow the design tokens in `cursor/design.json`.

## Development

- Next.js (App Router, TypeScript)
- Tailwind CSS (customized to match design system)
- Reusable, accessible components
- Mock API and state management for frontend development

## Getting Started

```bash
cd frontend
npm run dev
```

## Folder Structure

- `src/app/` – Main app pages
- `src/components/` – Reusable UI components (Stepper, FileUpload, PromptInput, Buttons, Modals, etc.)
- `src/hooks/` – Custom React hooks
- `src/services/` – API and mock data services
- `src/styles/` – Tailwind and custom styles

## TODO

- Implement backend integration
- Add steps 2 and 3 UI/logic
