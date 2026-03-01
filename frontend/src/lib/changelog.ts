export interface ChangelogEntry {
  version: string;
  date: string;
  title?: string;
  changes: {
    type: "added" | "changed" | "fixed" | "removed";
    description: string;
  }[];
}

export const changelog: ChangelogEntry[] = [
  {
    version: "1.8.0",
    date: "2026-03-01",
    title:
      "Chatbot copy format settings, smarter synced mode switching & improved copy button accessibility",
    changes: [
      {
        type: "added",
        description:
          "The chatbot can now change Default Copy Format, Default Save Format, and Default Chatbot Copy Format on behalf of the user. A new configurable Chatbot Copy Format setting controls how chatbot messages are copied to the clipboard (Formatted Text, Plain Text, or Markdown), defaulting to Formatted Text.",
      },
      {
        type: "changed",
        description:
          "Switching to Standard mode after a synced recording started from Realtime now shows the Record Audio tab instead of the previously saved step position",
      },
      {
        type: "changed",
        description:
          "Chatbot copy button now appears at both the top and bottom of long assistant messages that overflow the visible area, so you no longer need to scroll back up to copy",
      },
    ],
  },
  {
    version: "1.7.0",
    date: "2026-02-28",
    title:
      "Added more ways to copy output, added download functionality, added token usage tracking, step persistence in standard mode & fixed iOS microphone permission prompts",
    changes: [
      {
        type: "added",
        description:
          'Unified "Copy as" and "Save as" split buttons across all output sections — copy in 4 formats (Formatted, Plain Text, Markdown, JSON) and download in 6 formats (.txt, .md, .docx, .pdf, .html, .json) with configurable defaults in Settings',
      },
      {
        type: "added",
        description:
          "Added token usage tracking for AI requests in the chatbot, summary & added an AI usage section in the profile page to view total tokens used over the past week/month/year",
      },
      {
        type: "changed",
        description:
          "Standard mode now remembers your last viewed step (Upload, Transcript, or Summary) across page reloads and devices",
      },
      {
        type: "fixed",
        description:
          'Skipped the early microphone permission prompt on iOS to avoid repeated prompts on every page load — iOS Safari has no "Always Allow" option, so permission is now only requested when starting a recording or realtime session',
      },
    ],
  },
  {
    version: "1.6.0",
    date: "2026-02-27",
    title: "Smart date detection, chatbot quick-apply actions & draft persistence",
    changes: [
      {
        type: "added",
        description:
          "Meeting date is now auto-detected from the uploaded audio filename (e.g. 2024_01_15_standup.mp3) — supports yyyy-MM-dd, dd-MM-yyyy, and yyyyMMdd patterns",
      },
      {
        type: "added",
        description:
          'Chatbot quick-apply: start your message with "!" to skip the action confirmation step and apply it immediately (e.g. "!Switch to light mode")',
      },
      {
        type: "added",
        description: "The chatbot can now perform more actions on behalf of the user",
      },
      {
        type: "changed",
        description:
          "Sync mode now shows confirmation dialogs when the other mode has existing data (ended realtime session or completed recording) instead of silently skipping — also fixed display audio not being captured in Standard when auto-started from Realtime",
      },
      {
        type: "changed",
        description:
          "Chatbot input text now persists when closing and reopening the chat window — draft is only cleared when sent or when clearing the conversation",
      },
      {
        type: "fixed",
        description:
          "Export/Import Settings dialog is now scrollable on mobile devices, fixing the QR code being cut off on smaller screens",
      },
      {
        type: "removed",
        description:
          "Temporarily disabled OpenAI models (GPT-5.2, GPT-5.2 Pro) for the Langdock provider due to a proxy bug on Langdock's side — use Claude instead",
      },
    ],
  },
  {
    version: "1.5.2",
    date: "2026-02-26",
    title: "Improved chatbot capabilities, simplified transcript context and suspend/reattach",
    changes: [
      {
        type: "added",
        description:
          'The chatbot now knows the user\'s current time and last visit timestamp, allowing it to answer questions like "What time is it?" and "What has changed since my last visit?" by correlating visit history with the changelog',
      },
      {
        type: "changed",
        description:
          'Detaching the transcript in the chatbot now suspends it instead of removing it entirely — the badge stays visible in a dimmed "Transcript paused" state with a reattach button to resume using it',
      },
      {
        type: "changed",
        description:
          "Clicking Start or Continue Session in Realtime mode now shows a confirmation dialog when existing transcript or summary data is present — choose to continue with existing data, clear only transcript and summary, or clear all session data including questions, form output, and template selection",
      },
      {
        type: "removed",
        description:
          'Simplified the chatbot Transcript Context setting by removing the "Current mode" / "Latest transcript" selector — the chatbot now always uses the transcript from the active mode',
      },
    ],
  },
  {
    version: "1.5.1",
    date: "2026-02-26",
    title: "Stability improvement",
    changes: [
      {
        type: "fixed",
        description:
          "Fixed an issue where transcription and AI requests could occasionally fail when multiple actions were performed at the same time due to synchronous code execution blocking the main thread",
      },
    ],
  },
  {
    version: "1.5.0",
    date: "2026-02-26",
    title:
      "Added session persistence, maximizable chatbot, sync standard/realtime mode, and QR code generation for API keys",
    changes: [
      {
        type: "added",
        description:
          "Added session persistence feature that allows the user to refresh the page or close and reopen the application without losing their current transcript, summary, chatbot conversation, etc.",
      },
      {
        type: "added",
        description:
          "The chatbot now has a maximize button that allows the user to expand the chatbot window to take up more space on the screen for easier interaction and better visibility of the conversation history (desktop only)",
      },
      {
        type: "added",
        description:
          "Sync Standard + Realtime mode: enable in Settings to run both recording modes in parallel with a shared microphone. Starting one mode auto-starts the other, pause/resume stay in sync, and a confirmation dialog coordinates stopping",
      },
      {
        type: "added",
        description:
          "QR code generation for API keys: quickly transfer your API keys to another device by scanning a QR code instead of typing them manually",
      },
      {
        type: "changed",
        description: "The microphone device is now shared between the normal/realtime mode and the chatbot",
      },
      {
        type: "fixed",
        description:
          "Previously the connection circle indicator in the realtime mode did not accurately reflect wheter the realtime API was ready to transcribe or not. This has been fixed.",
      },
    ],
  },
  {
    version: "1.4.0",
    date: "2026-02-25",
    title:
      "Added form output and export/import settings + api keys [optional] as well as session persistence for transcript and summary",
    changes: [
      {
        type: "added",
        description:
          "Form output feature lets users create form templates with custom fields that can be filled out with the extracted data from the transcript. Works in normal and realtime mode",
      },
      {
        type: "added",
        description:
          "Export and import settings feature that allows users to export their current settings and optionally API keys as a encoded string, and import them back into the application when needed",
      },
      {
        type: "added",
        description:
          "The latest transcript & summary will now be saved automatically and persist across sessions",
      },
    ],
  },
  {
    version: "1.3.0",
    date: "2026-02-24",
    title: "Added automatic speaker labels",
    changes: [
      {
        type: "added",
        description:
          "Automatic speaker labels feature that let's the AI try to label the speakers based on the given transcript. Can be toggled in the settings panel. Enabled by default",
      },
    ],
  },
  {
    version: "1.2.1",
    date: "2026-02-24",
    title: "Chatbot feature improvements",
    changes: [
      {
        type: "changed",
        description:
          "Changed the behaviour of the live transcript feature to establish the websocket connection immediately when the chatbot is opened, allowing for faster response times and a more seamless user experience",
      },
      {
        type: "fixed",
        description:
          "Sometimes after a pause the text got cleared from the input field during dictation mode. This has been fixed and the text will now remain in the input field even after a pause in dictation",
      },
    ],
  },
  {
    version: "1.2.0",
    date: "2026-02-24",
    title: "Added chatbot feature",
    changes: [
      {
        type: "added",
        description:
          "Chatbot feature with conversation history, context awareness & the ability to perform actions on behalf of the user",
      },
      {
        type: "added",
        description: "Paste button in API key manager for easy input of API keys from clipboard",
      },
      {
        type: "changed",
        description: "Added simple plausability check for API keys to ensure they are in the correct format",
      },
    ],
  },
  {
    version: "1.1.0",
    date: "2026-02-23",
    title: "Added release notes and changelog",
    changes: [{ type: "added", description: "Release page with changelog and version history" }],
  },
  {
    version: "1.0.0",
    date: "2026-02-22",
    title: "Initial Release",
    changes: [{ type: "added", description: "Initial release of the application" }],
  },
];
