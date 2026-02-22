# US-12 — Update Privacy Policy Page

**Epic**: Epic 6 — Legal / Privacy Updates
**Depends on**: US-09
**Blocks**: US-13

---

## Goal

Update the existing Privacy Policy dialog to accurately reflect the new optional server-side preference storage feature and the self-hosted Hetzner infrastructure.

---

## Background

The app now offers an optional server-side storage mode (US-09). This constitutes new data processing that must be disclosed in the Privacy Policy. Users must understand what data is stored, where, and how to delete it. The hosting provider has also changed from Render (US-based) to Hetzner (Nuremberg, Germany, EU), which is relevant for GDPR purposes.

---

## Acceptance Criteria

### New Section: "Optional Account Storage"

- [ ] A new section is added to the Privacy Policy content with the heading "Optional Account Storage"
- [ ] The section explains:
  - **What data is stored**: App settings, prompt templates, theme preferences, selected AI models
  - **What data is NOT stored**: API keys (AssemblyAI, OpenAI, Anthropic, Google Gemini, Azure OpenAI) — these always remain in the user's browser
  - **Opt-in only**: This storage only activates when the user explicitly enables "Account Storage" via the profile menu
  - **How to delete**: Users can switch back to "Local Storage" at any time via the profile menu, which deletes all server-side preference data immediately
  - **Where data is stored**: Self-hosted server in Nuremberg, Germany (Hetzner data center)

### Hosting Update

- [ ] Any existing mention of Render or the previous hosting provider is replaced with: *"The application is hosted on a self-hosted server in Nuremberg, Germany (Hetzner Cloud)."*
- [ ] If the document previously stated a non-EU hosting location, update accordingly

### Formatting

- [ ] The new section uses the same visual style as existing sections (heading, body paragraphs, bullet list for the data categories)
- [ ] The section is placed logically — after "Data We Collect" and before "Data Retention" (or similar, based on current structure)

---

## Files Likely Affected

- The component that renders the Privacy Policy dialog content (likely in `frontend/src/components/layout/Footer.tsx` or a dedicated `PrivacyPolicyDialog` component)

---

## Notes

- Do not alter the legal tone of existing sections unless factually incorrect.
- The exact wording of the new section should be reviewed by the project owner before shipping — this story delivers a draft that is functionally accurate.
- GDPR compliance note: Since Hetzner is an EU provider, there is no cross-border data transfer issue for EU users.
