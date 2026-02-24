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
