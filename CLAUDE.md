# CLAUDE.md

- This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.
- When I say something like "push to git" use git add -A by default to push everything unless explicitly specified differently.
- Make sure you always know the codebase if a user asks you a code or feature related question. In this case read [architecture.md](./docs/architecture.md) file.
- If you need to develop any frontend related code make sure you have read the [UX_SPECIFICATION.md](./user_stories/UX_SPECIFICATION.md) file
- When you are asked to use the chrome dev-browser always use the version with the extension rather than the standalone dev-browser

## Skills

You have a skill various skills available: "backend_dev", "frontend_dev" & "implement_feature". Whenever the user is asking you to implement feature starting with the phrase "Implement Feature:" Make sure to use the skill "implement_feature". This skill will under the hood use "backend_dev" and/or "frontend_dev" based on the feature to implement.

## Known Issues

- **Chrome DevTools extensions can break AudioWorklet**: The "Claude Dev Tools" Chrome extension (and potentially other DevTools extensions) causes `AudioContext.audioWorklet.addModule()` to hang indefinitely. This breaks both Realtime mode and Chatbot voice input. If a user reports WebSocket/audio issues in Chrome but everything works in Safari or Incognito mode, the first troubleshooting step should be to disable Chrome extensions.

## Project Overview

AIAudioSummary is a web app for uploading audio files (meeting recordings) and generating transcripts + AI-powered summaries. It uses AssemblyAI for speech-to-text and multi-provider LLM support (OpenAI, Anthropic, Google Gemini, Azure OpenAI) via pydantic-ai for summarization, with a Next.js frontend and FastAPI backend.
