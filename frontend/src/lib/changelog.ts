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
