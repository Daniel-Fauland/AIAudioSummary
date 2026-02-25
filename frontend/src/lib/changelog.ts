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
