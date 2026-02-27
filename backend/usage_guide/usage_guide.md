# AI Audio Summary — Usage Guide

> **Purpose:** This guide is intended for end users of the AI Audio Summary application. It covers every feature, workflow, and setting available in the app, written in plain language without any references to code or technical internals.

---

## Table of Contents

1. [Application Overview](#1-application-overview)
2. [Getting Started](#2-getting-started)
3. [Navigation & Layout](#3-navigation--layout)
4. [Features](#4-features)
   - [4.1 Standard Mode — Upload & Transcribe](#41-standard-mode--upload--transcribe)
   - [4.2 Standard Mode — Record Audio](#42-standard-mode--record-audio)
   - [4.3 Transcript View & Editing](#43-transcript-view--editing)
   - [4.4 Speaker Mapping](#44-speaker-mapping)
   - [4.5 Speaker Key Points](#45-speaker-key-points)
   - [4.6 Prompt Settings & Templates](#46-prompt-settings--templates)
   - [4.7 Prompt Assistant](#47-prompt-assistant)
   - [4.8 Summary Generation](#48-summary-generation)
   - [4.9 Realtime Mode](#49-realtime-mode)
   - [4.10 Questions & Topics (Realtime)](#410-questions--topics-realtime)
   - [4.11 Form Output](#411-form-output)
   - [4.12 Settings Panel](#412-settings-panel)
   - [4.13 Storage Mode](#413-storage-mode)
   - [4.14 Export / Import Settings](#414-export--import-settings)
   - [4.15 Theme Toggle](#415-theme-toggle)
   - [4.16 Admin Panel](#416-admin-panel)
   - [4.17 Session Data Persistence](#417-session-data-persistence)
   - [4.18 AI Assistant (Chatbot)](#418-ai-assistant-chatbot)
   - [4.19 Sync Standard + Realtime](#419-sync-standard--realtime)
5. [Common Workflows](#5-common-workflows)
   - [5.1 Transcribing and Summarising a Recording](#51-transcribing-and-summarising-a-recording)
   - [5.2 Recording Live Audio and Getting a Summary](#52-recording-live-audio-and-getting-a-summary)
   - [5.3 Running a Live Meeting with Realtime Transcription](#53-running-a-live-meeting-with-realtime-transcription)
   - [5.4 Creating a Custom Prompt Template](#54-creating-a-custom-prompt-template)
   - [5.5 Renaming Speakers in a Transcript](#55-renaming-speakers-in-a-transcript)
   - [5.6 Adding a New User (Admin)](#56-adding-a-new-user-admin)
   - [5.7 Running Both Modes in Parallel (Sync)](#57-running-both-modes-in-parallel-sync)
6. [FAQ / Troubleshooting](#6-faq--troubleshooting)

---

## 1. Application Overview

**AI Audio Summary** is a web application that turns audio recordings of meetings, interviews, lectures, or any spoken-word content into structured text transcripts and AI-generated summaries.

It works in two modes that can run independently or in parallel:

- **Standard mode** — Upload a pre-recorded audio file (or record one directly in the browser), wait for transcription, then generate a summary at your own pace.
- **Realtime mode** — Speak into your microphone (or capture a meeting's audio) and watch the transcript and a running summary update live as the conversation unfolds.
- **Sync mode** (optional) — Run both modes at the same time with a shared microphone. Get a live transcript and running summary during the meeting (Realtime) while also recording a high-quality audio file for detailed post-meeting transcription (Standard). Enable this in Settings.

**Who it's for:** Anyone who needs to extract key points, decisions, and action items from spoken audio — team leads, project managers, researchers, journalists, or anyone who attends meetings and wants an automatic written record.

**Key privacy principle — Bring Your Own Key (BYOK):** The app never stores your API keys on the server. All AI provider keys are saved exclusively in your browser and are sent directly to the respective service only when you trigger a transcription or summary. Transcripts and summaries are also never stored on the server — they are saved in your browser's localStorage so they persist across page reloads, but they never leave your device.

---

## 2. Getting Started

### 2.1 Signing In

The application requires a Google account. Access is controlled by an administrator — only pre-approved email addresses can sign in.

1. Navigate to the app URL in your browser.
2. You will be redirected to the sign-in page showing the **"AI Audio Summary"** heading and a **"Sign in with Google"** button.
3. Click **Sign in with Google** and complete the Google authentication flow.
4. If your account has not been approved, you will see: _"Access denied. Please contact an administrator to request access."_ — contact your administrator to be added.

### 2.2 Adding Your API Keys

The app requires two types of API keys to function. These are stored only in your browser and are never sent to the app's server.

**You need:**

1. An **AssemblyAI API key** — for speech-to-text transcription (required for Standard upload/record mode).
2. An **LLM provider API key** — for AI summary generation. You choose one of: OpenAI, Anthropic (Claude), Google Gemini, Azure OpenAI, or Langdock.

**To add your keys:**

1. Click the **gear icon (⚙)** in the top-right corner of the header to open the Settings panel.
2. Under the **API Keys** section, find the **AssemblyAI API Key** field and enter your key.
3. Under **LLM Providers**, enter the API key for the provider you want to use.
4. Close the Settings panel — your keys are saved automatically in your browser.

> **Note:** If you don't have an AssemblyAI API key, you can still use the app with a transcript you already have by clicking **"I already have a transcript — skip upload"** on the upload screen.

---

## 3. Navigation & Layout

### 3.1 Header

The header appears at the top of every page and contains:

| Element                                       | Location  | What it does                                 |
| --------------------------------------------- | --------- | -------------------------------------------- |
| **AI Audio Summary** logo                     | Top-left  | Click to return to the main app              |
| **User avatar** (circular, with your initial) | Top-right | Click to open the user menu                  |
| **Theme toggle** (moon/sun icon)              | Top-right | Cycles between Light, Dark, and System theme |
| **Settings gear icon (⚙)**                    | Top-right | Opens the Settings panel                     |

### 3.2 Mode Toggle

Directly below the header, a segmented control lets you switch between the two main modes:

- **Standard** — the default 3-step workflow (Upload → Transcript → Summary)
- **Realtime** — live microphone transcription with running summary

Click either button to switch modes. Your choice is remembered across sessions. Switching between modes preserves both sessions — for example, if you have a transcript in Standard mode and switch to Realtime, the Standard data stays intact. In Realtime mode, the WebSocket connection even stays alive while you switch to Standard and back.

### 3.3 Step Indicator (Standard Mode Only)

When in Standard mode, three step circles show your progress:

1. **Upload** — input an audio file or recording
2. **Transcript** — review and edit the transcript
3. **Summary** — view and copy the generated summary

The active step is highlighted in orange. Steps you've already completed are also orange; steps you haven't reached yet are grey. You can click a completed step to navigate back to it without losing your data — your transcript, summary, and form values are preserved (see [Section 4.17](#417-session-data-persistence)).

### 3.4 Footer

At the very bottom of the page:

- **Imprint** — service operator information
- **Privacy Policy** — full data processing details
- **Cookie Settings** — explains what browser storage is used
- **v1.6.0** — click to view the changelog of recent updates

### 3.5 User Menu

Click your **avatar** in the top-right to open the user menu:

- Your **name** and **email** are shown at the top.
- **Storage Mode** — switch between Local Storage and Account Storage (see [Section 4.13](#413-storage-mode)).
- **Export / Import Settings** — export or import your settings as a portable config string (see [Section 4.14](#414-export--import-settings)).
- **Admin Panel** — visible only to administrators; opens the user management page.
- **Sign out** — signs you out of the application.

---

## 4. Features

### 4.1 Standard Mode — Upload & Transcribe

The **Upload File** tab (the default in Standard mode) lets you upload a pre-recorded audio or video file for transcription.

**Supported formats:** `.mp3`, `.wav`, `.m4a`, `.flac`, `.ogg`, `.webm` (max 500 MB)

**How to upload:**

1. Either **drag and drop** your audio file onto the dashed drop zone, or click anywhere in the zone to open a file picker.
2. The app will immediately move to the **Transcript** step and begin transcribing. A loading state is shown while transcription is in progress.
3. When complete, a success notification appears and the transcript is displayed.

**Skip upload:** If you already have a transcript and just want to generate a summary, click **"I already have a transcript — skip upload"** — this takes you directly to the Transcript step with an empty, editable text area.

> **Requires:** An AssemblyAI API key saved in Settings. If you haven't added one, a warning will prompt you to open Settings.

---

### 4.2 Standard Mode — Record Audio

The **Record Audio** tab lets you record audio directly in the browser instead of uploading a file.

**Controls:**

| Control                    | Description                                                                                                                                                                     |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Audio Source** toggle    | **Mic Only** — records only from your microphone. **Mic + Meeting Audio** — captures both your microphone and audio playing through your computer (useful for recording calls). |
| **Microphone dropdown**    | Select which microphone device to use (e.g., "Default - MacBook Pro Microphone").                                                                                               |
| **Start Recording** button | Begins recording. Changes to a stop/pause control while active.                                                                                                                 |

**How to record:**

1. Select your **Audio Source** (Mic Only or Mic + Meeting Audio).
2. Choose your **microphone** from the dropdown.
3. Click **Start Recording**.
4. When finished, stop the recording — an audio player will appear so you can preview the recording.
5. Click **"Use for Transcript"** (or equivalent confirm button) to send it for transcription.

> **Tip:** "Mic + Meeting Audio" is best used when audio plays through your speakers — for example, when you are in a video call on the same device.

> **Requires:** An AssemblyAI API key. Browser microphone permission must be granted.

---

### 4.3 Transcript View & Editing

After transcription completes (or after skipping upload), you land on the **Transcript** step. The transcript appears in a large editable text area inside the **Transcript** card.

**What you see:**

- The transcript text, formatted as `Speaker A: [text]`, `Speaker B: [text]`, etc. (one line per speaker turn).
- Three icon buttons in the top-right corner of the card:
  - **Trash icon** — clears the entire transcript (with confirmation).
  - **Copy icon** — copies the full transcript to the clipboard.
  - **Expand icon** — opens the transcript in a fullscreen view.

**Editing the transcript:**

- Click directly in the text area to edit any part of the transcript.
- Corrections are reflected immediately in the speaker detection and, when you generate the summary, the edited text is what gets summarised.

---

### 4.4 Speaker Mapping

Below the Transcript card, the **Speaker Mapping** section automatically detects the speakers in the transcript (e.g., "Speaker A", "Speaker B") and lets you replace those labels with real names.

**What you see:**

- A row for each detected speaker with:
  - A **person icon button** on the left — click to mark that speaker as the author/point-of-view for the summary.
  - The current **speaker label** (e.g., "Speaker A").
  - An **arrow (→)** followed by a **name input field** where you type the real name.
- An **Apply Names** button — applies all entered names to the transcript, replacing the generic labels.
- A **Generate Key Points** button (sparkle icon) — or **Regenerate** if key points were already generated.
- **Collapse All / Expand All** links — show or hide key point summaries per speaker.

**How to rename speakers:**

1. In the name input field next to each speaker label, type the person's real name (e.g., "Sarah").
2. Repeat for all speakers you want to rename.
3. Click **Apply Names** — the transcript updates instantly, replacing "Speaker A" with "Sarah" throughout.

**Setting the author/POV:**

- Click the **person icon** next to a speaker to mark them as the meeting author or point-of-view. This tells the AI to write the summary from that person's perspective.
- The selected author is highlighted with an orange icon. Click again to deselect.
- A note below the speaker list confirms: _"[Name] is set as author/POV for the summary."_

> **Note:** The speaker detection runs automatically 500ms after the transcript is loaded or edited. If no speakers are detected, the message "No speakers detected in the transcript." appears.

---

### 4.5 Speaker Key Points

**Speaker Key Points** is an optional AI feature that automatically generates a short summary of each speaker's contributions after transcription.

**Enabling/disabling:**

- In the **Settings panel → Features → Standard → Speaker Key Points**, toggle the switch on or off.
- When enabled, key points are extracted automatically after every new transcription.

**Viewing key points:**

- In the Speaker Mapping section, once key points have been generated, a **chevron (›)** button appears next to each speaker.
- Click the chevron to expand and see that speaker's key point summary.
- Use **Expand All** / **Collapse All** links to show or hide all key points at once.

**Manually regenerating:**

- Click the **Generate Key Points** button (sparkle icon) to extract key points on demand, or **Regenerate** to refresh them.

> **Requires:** An LLM API key. Key point extraction uses the same AI provider configured in Settings (or the overridden provider for "Key Point Extraction" if set in Feature-Specific Models).

---

### 4.6 Prompt Settings & Templates

The **Prompt Settings** card (below Speaker Mapping in Step 2) lets you control exactly how the AI summary is written — what format, language, and style to use.

#### Template

A pre-written system prompt that defines the overall summary style.

- Click the **Template dropdown** to choose a template.
- **Built-in** templates come with the app (e.g., "Detailed Meeting Summary").
- **Custom** templates you've saved yourself appear in a separate group below.
- Selecting a different template immediately replaces the prompt text. If you've edited the prompt manually, a confirmation dialog will warn you before replacing.
- If you edit a built-in template, a **Reset** button appears — click it to restore the original template text.
- To delete a custom template: select it, then click the **trash icon** that appears next to the dropdown.

#### Prompt

The actual text sent to the AI as instructions for writing the summary. You can edit it freely.

- The text area is resizable — drag the bottom edge to make it taller.
- Click the **Prompt Assistant** button (sparkle icon) to use the AI to help you write or refine the prompt (see [Section 4.7](#47-prompt-assistant)).
- Click **Save as Custom Template** (+ icon) to save your current prompt as a reusable custom template.

#### Language

Select the language the summary should be written in:

- **English**, **German**, **French**, **Spanish** — or choose **Other** and type any language name.
- When **German** is selected, an additional toggle appears: **Informal German (du/ihr)** — enable this for informal address form, disable for formal (Sie).

#### Meeting Date (optional)

A date picker (showing the date in `DD.MM.YYYY` format). When set, the date and day of the week are included in the summary prompt context. Click the **× button** next to the date to clear it, or use the **Today** shortcut in the calendar.

#### Generate Summary

The large orange **Generate Summary** button at the bottom of the Prompt Settings card. Click it to proceed to Step 3 and start generating the summary.

- The button is disabled if: there is no transcript text, no LLM API key is saved, or no model is selected.
- If no LLM API key is saved, a warning link appears: _"Please add an API key in Settings to generate a summary."_ — click it to open Settings.

---

### 4.7 Prompt Assistant

The **Prompt Assistant** is an AI-powered wizard that helps you write or refine your summary prompt. It asks you targeted questions about your needs and generates a tailored system prompt for you.

**Opening it:** Click the **Prompt Assistant** button (sparkle icon) next to the Prompt label in Prompt Settings. The button is only active when an LLM API key is configured.

**The wizard has 4 steps:**

**Step 1 — Base Prompt (optional)**

- Optionally paste an existing prompt you'd like to improve. The AI will analyse it and pre-fill answers where possible.
- Click **Next** to proceed with the pasted prompt, or **Skip** to start from scratch.
- A trash icon next to the label clears the text area.

**Step 2 — Questions**

- The AI generates 3–5 questions about your summary needs (e.g., "What sections should the summary include?", "What should the tone be?").
- The **first question** is always **"Target System"** — where will this summary be used? Options: Email, Chat message, Wiki article, User story, Personal notes, or a custom value you type.
- Questions can be: dropdown selects, multi-choice checkboxes, or free-text fields.
- Answers that were inferred from your base prompt show an **"Inferred from your prompt"** badge.
- For dropdown questions: selecting "Other (custom)..." lets you type a custom answer.

**Step 3 — Review**

- A table shows all your answers for review.
- An **"Anything else?"** free-text field lets you add any additional instructions or context.
- Click **Create Prompt** to generate the final prompt.

**Step 4 — Result**

- The generated prompt appears in an editable text area. You can fine-tune it directly.
- To request changes: expand the **feedback section**, describe what you'd like changed, and click **Regenerate**.
- Click **Use this prompt** to apply the generated prompt to the Prompt Settings and close the wizard.

---

### 4.8 Summary Generation

After clicking **Generate Summary**, the app moves to **Step 3** — the Summary view.

**What you see:**

- A two-column layout (on desktop): the **Transcript** on the left (read-only) and the **Summary** on the right.
- The summary streams in word-by-word in real time, with a blinking orange cursor while generating.
- A **"Generating..."** badge in the Summary card header. Hover over it to reveal a **"Stop Generating"** option — click to cancel mid-stream.

**After generation completes, four buttons appear:**

| Button                 | What it does                                                                           |
| ---------------------- | -------------------------------------------------------------------------------------- |
| **Copy Summary**       | Copies the summary to the clipboard as formatted rich text (with headings, bold, etc.) |
| **Copy as Markdown**   | Copies the raw Markdown source                                                         |
| **Regenerate**         | Runs the summary again with the same settings                                          |
| **Back to Transcript** | Returns to Step 2 to edit the transcript or prompt settings                            |

**Fullscreen view:** Click the **expand icon** (top-right of the Summary card) to open the summary in a large fullscreen dialog. The same Copy and Regenerate buttons are available there.

**Start Over:** The **Start Over** button below the cards returns to Step 1 (Upload) but preserves your data. You can navigate back to the Transcript or Summary steps using the step indicators or the **"Show previous transcript"** / **"Show previous summary"** / **"Show previous form"** links that appear on the upload screen. Your data is only cleared when you upload a new audio file or skip upload.

> **Note:** Navigating back via the step indicator preserves your transcript, summary, and form values. See [Section 4.17](#417-session-data-persistence) for full details on how session data is retained.

---

### 4.9 Realtime Mode

Realtime mode provides live transcription of your microphone and generates a running summary that updates at regular intervals during the session.

**Switch to Realtime mode** by clicking **Realtime** in the mode toggle bar at the top.

#### Controls Bar

A horizontal controls bar appears at the top of the Realtime view:

| Control                                          | Description                                                                                                                                                                                                                                           |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Start** / **Continue Session** button (orange) | Begins the realtime session. Shows **Continue Session** when a previous session ended but data remains. If there is existing transcript or summary content, a confirmation dialog appears (see below). Changes to **Pause** and **Stop** once active. |
| **Pause** button                                 | Pauses microphone capture and the summary timer. Click **Resume** to continue.                                                                                                                                                                        |
| **Stop** button                                  | Ends the session, closes the connection, and (if enabled) generates a final full-transcript summary.                                                                                                                                                  |
| **Mic Only / Mic + Meeting Audio** toggle        | Choose whether to capture just your microphone or also audio playing through your speakers.                                                                                                                                                           |
| **Microphone dropdown**                          | Select which microphone device to use.                                                                                                                                                                                                                |
| **Status dot**                                   | Colour indicates connection state: grey = idle, amber = connecting, green = connected, red = error.                                                                                                                                                   |
| **Elapsed timer**                                | Shows how long the current session has been running (e.g., `02:34`).                                                                                                                                                                                  |
| **Summary countdown**                            | A `mm:ss` timer counting down to the next automatic summary update.                                                                                                                                                                                   |
| **Refresh Summary button (↻)**                   | Triggers an immediate summary update and resets the countdown timer.                                                                                                                                                                                  |

#### Start Session Confirmation

When you click **Start** or **Continue Session** and there is existing transcript or summary content, a dialog appears with four options:

| Option                         | What it does                                                                                                                         |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| **Continue with Existing**     | Keeps all current data (transcript, summary, questions, form output) and starts the session.                                         |
| **Clear Transcript & Summary** | Clears only the transcript and summary. Questions & Topics and Form Output are preserved. Then starts the session.                   |
| **Clear All**                  | Clears transcript, summary, Questions & Topics, form output values, and deselects any Form Output template. Then starts the session. |
| **Cancel**                     | Closes the dialog without starting.                                                                                                  |

If both the transcript and summary are already empty, clicking **Start** begins the session immediately without showing this dialog.

#### Live Transcript Panel

- Located on the left (or first tab on mobile).
- Shows the conversation as it happens, word by word.
- **Finalized text** appears in normal style; **in-progress partial text** appears in a muted italic style.
- Auto-scrolls to the bottom as new text arrives.
- A **trash icon** (to the left of the copy button) lets you clear the accumulated transcript. A confirmation dialog appears before clearing.

#### Summary Panel

- Located on the right (or second tab on mobile).
- Shows the AI-generated running summary in Markdown format (headings, bullet points).
- An **"Updating..."** badge appears while a new summary is being generated.
- A timestamp below the summary shows when it was last updated.
- A **trash icon** (to the left of the fullscreen button) lets you clear the current summary. A confirmation dialog appears before clearing. A new summary will be generated automatically at the next summary interval.

#### Summary Interval

The automatic summary update frequency can be changed in **Settings → Features → Realtime → Summary Interval**: 1 min, 2 min, 3 min, 5 min, or 10 min. The summary timer pauses when recording is paused and resumes when you resume.

#### Final Summary on Stop

When **Settings → Features → Realtime → Final Summary on Stop** is enabled, stopping a session automatically generates one final full-transcript summary. Disable this if you don't need a final summary.

#### Custom System Prompt (Realtime)

You can customise the AI instructions used for realtime summaries. In **Settings → Features → Realtime → System Prompt**, click **Edit** to open an editor. The prompt supports a `{language}` placeholder that is automatically replaced with the detected transcript language. Click **Save** to apply.

> **Requires:** Both an AssemblyAI API key (for transcription) and an LLM API key (for summarisation).

---

### 4.10 Questions & Topics (Realtime)

Below the Live Transcript and Summary panels in Realtime mode, there is a **Questions & Topics** panel.

- This lets you add specific questions or topics you want to track during the meeting.
- Click **"+ Add a question or topic..."** field and type your question, then press Enter or click the **+** button.
- The AI evaluates each question against the live transcript as the session progresses and highlights when relevant content appears.
- You can add, edit, or remove questions at any time during a session.
- A **trash icon** in the panel header lets you clear all questions and answers at once. A confirmation dialog appears before clearing. This button is only shown when at least one question exists.

---

### 4.11 Form Output

**Form Output** is an alternative to the free-text summary. Instead of producing a prose summary, the AI extracts structured data from the transcript into a form with specific fields that you define. This is useful when you need to capture consistent data points from every meeting — for example, action items, decisions, participant names, dates, or any structured information.

Form Output works in both **Standard mode** (after uploading/recording) and **Realtime mode** (during a live session).

#### Creating a Form Template

A form template defines which fields to extract. To create one:

1. In Standard mode Step 2, switch to the **Form Output** tab (next to "Summary").
2. Click the **+** button to open the template editor.
3. Enter a **Template Name** (e.g., "Weekly Standup", "Client Meeting Notes").
4. Click **Add Field** to add fields. For each field, configure:
   - **Label** — the field name (e.g., "Meeting Date", "Attendees", "Decision").
   - **Type** — choose from:

     | Type                | What it captures                     | User control             |
     | ------------------- | ------------------------------------ | ------------------------ |
     | **Text**            | A single text value                  | Free text input          |
     | **Number**          | A numeric value                      | Number input             |
     | **Date**            | A calendar date                      | Date picker (YYYY-MM-DD) |
     | **Yes / No**        | A true/false value                   | Toggle switch            |
     | **List**            | Multiple text items                  | Add/remove items         |
     | **Single Choice**   | Exactly one from predefined options  | Dropdown select          |
     | **Multiple Choice** | Zero or more from predefined options | Checkbox list            |

   - **Description** (optional) — a hint for the AI about what to extract (e.g., "Full legal name of the client").
   - **Options** (Single Choice and Multiple Choice only) — define the allowed values. Each option has its own input field. The first two options are always present (minimum for a choice field); click **+ Add Option** to add more, and use the **trash icon** to remove any option beyond the first two.

5. Use the **up/down arrows** to reorder fields.
6. Click **Create Template** to save.

Templates are stored in your browser and, if you use Account Storage, synced across devices.

#### AI-Powered Template Generation

Instead of adding fields manually, you can let the AI design a template for you:

1. Open the template editor (click the **+** button to create a new template, or the **pencil icon** to edit an existing one).
2. Click the **AI Generate** button at the top of the editor. A text input appears.
3. Describe the form you need in plain language — for example: _"Meeting notes form with date, attendees, action items, and decisions"_ or _"Patient intake form with name, date of birth, symptoms, and insurance provider"_.
4. Click **Generate** (or press **Enter**). The AI analyses your description and suggests a template name and a set of fields with appropriate types, descriptions, and options.
5. If the template name field was empty, it is filled with the AI's suggestion. The fields area is populated with the generated fields.
6. **Review and edit** the generated fields — you can rename labels, change types, add or remove options, reorder fields, or delete any field you don't need. You can also add more fields manually.
7. Click **Create Template** (or **Save Changes**) when you're satisfied.

> **Note:** AI Generate requires an LLM API key. It uses the same model configured for Form Output (or the default model if no override is set). If no API key is available, the AI Generate button will not appear.

#### Filling a Form (Standard Mode)

1. After transcription, switch to the **Form Output** tab in Step 2.
2. Select your form template from the dropdown.
3. Optionally set the **Meeting Date** using the date picker below the template selector. When set, the AI uses this date as context when filling date-related fields in the form. This works the same way as the Meeting Date in Prompt Settings for summary generation — the same date picker is shared between both modes.
4. Click **Fill Form** — the AI analyses the transcript and extracts values for each field.
5. The app moves to Step 3, showing the transcript on the left and the filled form on the right.
6. Review the extracted values. You can **edit any field** manually.
7. Click **Re-fill** to regenerate values from the transcript, or **Copy** to copy the form as plain text.

> The AI only fills a field if the information is clearly stated in the transcript. Fields without matching content are left empty. When a Meeting Date is provided, the AI may use it to fill date fields if no specific date is mentioned in the transcript.

#### Filling a Form (Realtime Mode)

1. In Realtime mode, switch to the **Form Output** tab below the transcript and summary panels.
2. Select or create a form template.
3. As speech is transcribed, the AI **automatically fills the form in real time** — no need to click a button.
4. A badge shows how many fields are filled (e.g., "3/5 filled").
5. You can manually edit any field value at any time.
6. Toggle **Mark as Complete** to lock the form and prevent further auto-updates. Manual edits are still allowed when locked. Unlock to resume auto-filling.
7. To deselect a template entirely, choose **"No template"** from the dropdown. This clears the form and stops auto-filling.

#### Editing and Deleting Templates

- To **edit** a template: select it from the dropdown, then click the **pencil icon**. The template editor opens with the current fields pre-filled.
- To **delete** a template: select it, then click the **trash icon**. A confirmation may appear.

> **Requires:** An LLM API key. Form filling uses the default AI model, or the overridden model for "Form Output" if configured in Feature-Specific Models (see [Settings Panel](#412-settings-panel)).

---

### 4.12 Settings Panel

Open the Settings panel by clicking the **gear icon (⚙)** in the header, or using the keyboard shortcut **Alt + S** (⌥S on Mac). The shortcut is displayed as a key badge (⌥ S) next to the panel title on desktop — the badges highlight as you press each key.

The panel slides in from the right side of the screen. It has three collapsible sections:

---

#### API Keys

An information banner reminds you: _"Your API keys are stored in your browser only and are never saved on the server."_

**Transcription:**

- **AssemblyAI API Key** — required for all transcription (upload, record, and realtime modes).

**LLM Providers** — enter the key for whichever provider(s) you use:

- **OpenAI API Key**
- **Anthropic API Key**
- **Google Gemini API Key**
- **Azure OpenAI API Key**
- **Langdock API Key**

Each key field has an **eye icon** to show/hide the key value, and an **× button** to delete the saved key.

---

#### AI Model

**Default AI Model** — the provider and model used for all features unless a per-feature override is set.

- **LLM Provider** dropdown — choose your AI provider (OpenAI, Anthropic, Google Gemini, Azure OpenAI, or Langdock).
- **Model** dropdown/input — select the specific model (e.g., `gpt-4o`, `claude-opus-4-5`, `gemini-2.0-flash`). You can type a custom model name if yours isn't listed.

**Azure OpenAI Configuration** (shown only when Azure OpenAI is selected):

- **Endpoint** — your Azure OpenAI resource URL.
- **API Version** — the Azure API version string.
- **Deployment Name** — the name of your Azure deployment.

**Langdock Configuration** (shown only when Langdock is selected):

- **Region** — select your Langdock region (e.g., EU).

**Feature-Specific Models** (collapsible):
Override the default model for individual features. Click the section to expand it and configure per-feature providers and models for:

- Summary Generation
- Realtime Summary
- Key Point Extraction
- Prompt Assistant
- Live Question Evaluation
- Form Output

This is useful if, for example, you want to use a cheaper model for key point extraction but a more capable model for final summaries.

---

#### Features

**Standard** sub-section:

| Setting                                    | What it does                                                                                                                |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| **Speaker Key Points** (toggle)            | When on, automatically extracts a short key-point summary per speaker immediately after transcription completes.            |
| **Speaker Count Range** (Min / Max inputs) | Tells AssemblyAI how many speakers to expect in the recording. Narrowing this range can improve speaker detection accuracy. |

**Realtime** sub-section:

| Setting                               | What it does                                                                                                                                                                            |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **System Prompt** → **Edit** button   | Opens an editor to customise the AI instructions for realtime summaries.                                                                                                                |
| **Summary Interval** dropdown         | How often a new running summary is auto-generated: 1, 2, 3, 5, or 10 minutes.                                                                                                           |
| **Final Summary on Stop** (toggle)    | When on, stopping a realtime session triggers a full final summary.                                                                                                                     |
| **Sync Standard + Realtime** (toggle) | When on, starting one recording mode automatically starts the other with a shared microphone, and pause/stop actions are coordinated. See [Section 4.19](#419-sync-standard--realtime). |

**AI Chatbot** sub-section:

| Setting                         | What it does                                                                                                                                                                                     |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Transcript Context** (toggle) | When on, the chatbot includes the transcript from your current mode (Standard or Realtime) as context for its responses. Switching modes automatically switches the transcript context to match. |

---

### 4.13 Storage Mode

Storage Mode controls where your app preferences (model selection, template choices, settings, etc.) are saved.

**Local Storage (default):** All preferences and session data are stored only in your browser's localStorage. They are device-specific and will be lost if you clear your browser data.

**Account Storage:** Preferences **and session data** (transcripts, summaries, form output, questions) are synced to your account on the server. This means your settings and the content of your last session follow you across devices and browsers. API keys are **never** included in this sync — they always stay in your browser.

**To switch modes:**

1. Click your **avatar** in the header to open the user menu.
2. Click **Storage Mode**.
3. A dialog explains the difference and lets you switch.
   - Switching from Local → Account: uploads your current local preferences and session data to the server.
   - Switching from Account → Local: downloads your server preferences and session data to the current browser.

**To delete server-side data:** Switch back to Local Storage — this immediately deletes all stored preferences and session data from the server.

---

### 4.14 Export / Import Settings

The **Export / Import Settings** feature lets you transfer all your app settings between browsers, devices, or colleagues using a single portable config string.

**Opening it:** Click your **avatar** in the header → **Export / Import Settings**. A dialog opens with two tabs: **Export** and **Import**.

#### Exporting Settings

1. Click the **Export** tab (selected by default).
2. Two optional checkboxes let you control what is included:
   - **Include API keys** — adds your API keys to the export. Unchecked by default for security.
     - **Important:** If you check this box, a warning appears: _"Be cautious when sharing this config string. It will contain your API keys in an encoded (not encrypted) format. Anyone with this string can decode and use your keys."_ Only include API keys when transferring to your own device — never share a config string that contains your keys with others.
   - **Include session data** — adds transcripts, summaries, chat history, and other session data. Checked by default. Uncheck this for a much smaller config string (useful if you only want to transfer preferences).
3. Click **Generate Config String**.
4. A text box appears containing the config string (it starts with `CFG1_`).
5. Click **Copy** to copy it to your clipboard. You can also click inside the text box to select all the text.

The config string contains your settings compressed and encoded. What it includes depends on the checkboxes above — by default it contains preferences (selected provider, model, theme, feature toggles, custom templates, etc.) and session data, but **not** API keys.

#### QR Code (API Keys)

Below the config string section there is a **QR Code (API Keys)** button. This generates a QR code containing **only your API keys** (and related connection config like Azure endpoint settings). This is the easiest way to transfer API keys to a mobile device:

1. Click **QR Code (API Keys)**.
2. A scannable QR code appears.
3. Scan the QR code with your phone's camera — it opens a link that automatically imports the API keys on the other device.

> **Tip:** If you use Account Storage, all preferences are already synced across devices — API keys are the only thing that don't sync. The QR code is designed exactly for this use case: quickly getting your API keys onto a new device without typing them manually.

If no API keys are configured yet, the button will show an error message prompting you to add keys in Settings first.

#### Importing Settings

1. Click the **Import** tab.
2. Paste a config string (starting with `CFG1_`) into the text area.
3. The app validates the string immediately:
   - If valid, a preview shows how many settings will be imported and warns if the config contains API keys.
   - If invalid, an error message explains what's wrong.
4. Click **Import Settings** to apply. Existing settings with matching keys will be overwritten.
5. **Reload the page** after importing to apply the new settings.

#### Auto-Import via Link

When you scan a QR code or open a shared import link, the app detects the config string in the URL automatically and shows a confirmation dialog. Click **Import Settings** to apply, or **Cancel** to dismiss. The page reloads automatically after a successful import.

> **Note:** This feature works independently of Storage Mode. It directly reads from and writes to your browser's localStorage. If you use Account Storage, you may want to also trigger a sync after importing by switching storage modes or reloading.

---

### 4.15 Theme Toggle

Click the **moon/sun icon** in the header to cycle through three theme options:

- **Light** — white background, dark text.
- **Dark** — near-black background (the default appearance).
- **System** — follows your operating system's light/dark preference.

Your theme choice is saved and persists across sessions.

---

### 4.16 Admin Panel

The Admin Panel is only visible to users with the **Admin** role. Access it via **User menu → Admin Panel**.

**What you can do:**

- **View all users** — a table showing each user's email, name, role (Admin or User badge), and join date.
- **Add a user** — click the **Add User** button (top-right of the table). Enter the user's email address and optionally their name, then confirm. The user will be able to sign in with that Google account on their next attempt.
- **Delete a user** — click the **Delete** button in the row for a non-admin user. A confirmation dialog appears before deletion. Admin accounts cannot be deleted from the panel.
- **Refresh** — click the refresh icon to reload the user list.

> **Note:** The Admin Panel manages access control. Only emails that exist in the user database are allowed to sign in — adding a user here is what grants them access to the app.

---

### 4.17 Session Data Persistence

Your session data (transcripts, summaries, form output values, questions and topics) is automatically saved in your browser's localStorage and persists across page reloads and navigation. You do not need to do anything to enable this — it happens automatically.

#### Standard Mode

- Your **transcript**, **summary**, **form values**, and **output mode** (Summary vs Form Output) are automatically saved and restored when you reload the page or navigate away and return.
- Clicking **"Start Over"** returns you to the Upload step but **preserves your data**. From the upload screen, you can navigate back to the Transcript or Summary steps using the step indicators or the **"Show previous transcript"** / **"Show previous summary"** / **"Show previous form"** links that appear.
- Your session data is only cleared when you **upload a new audio file** or **skip upload** — this starts a fresh session.

#### Realtime Mode

- The **accumulated transcript**, **summary**, **questions and topics**, and **form output values** all persist across page reloads.
- Switching between Standard and Realtime modes preserves both sessions independently. The Realtime WebSocket connection stays alive when you switch to Standard mode and back.
- When you click **Start** or **Continue Session** with existing data, a confirmation dialog lets you choose to keep the data, clear only the transcript and summary, or clear everything before starting.
- Data is cleared when you click **"Start New Session"** (the reset button), which begins a fresh realtime session.

#### Account Storage Sync

When **Account Storage** is enabled, session data is also synced to the server alongside your other preferences. This means:

- After transcription, summary generation, form fill, or output mode change completes, the data is automatically pushed to the server.
- When you open the app on a **different device** or browser (with the same account and Account Storage enabled), your last session is restored from the server.
- **Switching from Local → Account storage** uploads your current session data to the server.
- **Switching from Account → Local storage** downloads your server session data to the current browser.
- Session data can optionally be included in the **Export / Import Settings** config string (check **"Include session data"**), so you can transfer it manually at any time.

> **Note:** API keys are never synced — they always remain in your browser only. Clearing your browser data will remove local session data, but if Account Storage is enabled the server copy is preserved and will be restored on your next visit.

---

### 4.18 AI Assistant (Chatbot)

The **AI Assistant** is a floating chat panel that lets you ask questions about your transcript or get ad-hoc help from the AI without leaving the page.

#### Opening and closing

| Method                                                 | Action                                                          |
| ------------------------------------------------------ | --------------------------------------------------------------- |
| **Floating button** (speech-bubble icon, bottom-right) | Click to open the panel. Only visible when the panel is closed. |
| **Keyboard shortcut** **Alt + C** (⌥C on Mac)          | Toggles the panel open and closed from anywhere on the page.    |
| **× button** (top-right of panel)                      | Closes the panel.                                               |

> **Desktop only:** The keyboard shortcut and the ⌥ C key badges in the panel header are only shown on screens wide enough to have a keyboard (hidden on mobile). On mobile, use the floating button to open the panel.

#### Maximizing the panel (desktop only)

Click the **maximize icon** (⤢) in the panel header to expand the chatbot into a large overlay that fills most of the screen. This is useful when you want more space to read longer AI responses or scroll through a longer conversation.

| Action                                         | Result                                                                   |
| ---------------------------------------------- | ------------------------------------------------------------------------ |
| Click **⤢ maximize button**                    | Expands the panel to fill the main content area with a smooth animation. |
| Click **⊠ restore button** (same position)     | Returns the panel to its normal compact size.                            |
| Click **anywhere outside** the maximized panel | Also restores the panel to its compact size.                             |

The maximize button is hidden on mobile — the panel already takes up the full screen width on small devices.

When the panel opens — whether via the button or the keyboard shortcut — the chat input field is **automatically focused**, so you can start typing your question immediately without clicking.

#### Keyboard shortcut indicator

The panel header shows two small key badges: **⌥** and **C**. These highlight as you press each key, giving you visual confirmation of the shortcut. On non-Mac systems the Option badge reads **Alt** instead.

#### Using the chatbot

1. Type your message in the input field at the bottom of the panel and press **Enter** (or click the send button).
2. The AI streams its response in real time.
3. If transcript context is enabled (see [AI Chatbot settings](#412-settings-panel)), the assistant automatically uses your current transcript as background context. A badge above the input field shows the transcript status (e.g. **"Live Transcript"** or **"Transcript attached"**) along with the word count.
4. Use **Shift + Enter** to insert a line break in your message without sending.

#### Transcript badge

When transcript context is enabled and a transcript is available, a small badge appears above the input field:

- **Active state** — shows "Live Transcript" (with a green dot for Realtime mode) or "Transcript attached" (with a paperclip icon for Standard mode), plus the word count. Click the **× button** on the badge to suspend the transcript.
- **Suspended state** — shows "Transcript paused" in a dimmed style. The transcript is no longer sent to the AI, but remains available. Click the **link icon** on the badge to reattach it.
- **Auto-reattach** — when new transcript content arrives (e.g. you start a new transcription or the Realtime session continues), the transcript automatically reattaches.

#### Voice input

If an **AssemblyAI API key** is configured, a microphone button appears next to the input field. Click it to start voice input — the button pulses red while listening. Spoken words are appended to the input field as finalised text; you can still edit them before sending. Click the button again to stop.

A **chevron (▾)** next to the mic button lets you select which microphone to use if multiple devices are available.

#### Actions

The AI may propose actions that change app settings or create content on your behalf. These appear as action cards in the chat. Click **Confirm** to apply the action or **Cancel** to dismiss it.

**Quick-apply with `!` prefix:** Start your message with `!` to skip the confirmation step and apply the action immediately. For example, typing `!Switch to light mode` will change the theme without asking for confirmation. The action card shows "Auto-applied" instead of the usual Confirm/Abort buttons.

The following actions are available:

| Action                               | What it does                                                                                |
| ------------------------------------ | ------------------------------------------------------------------------------------------- |
| **Change theme**                     | Switch between light, dark, or system theme.                                                |
| **Switch app mode**                  | Switch between Standard and Realtime mode.                                                  |
| **Change LLM provider**              | Change the AI provider (OpenAI, Anthropic, Gemini, Azure, Langdock).                        |
| **Change model**                     | Change the selected AI model for the current provider.                                      |
| **Toggle Sync mode**                 | Enable or disable Sync Standard + Realtime (shared microphone, coordinated start/stop).     |
| **Toggle Speaker Key Points**        | Enable or disable automatic key point extraction per speaker.                               |
| **Toggle Speaker Labels**            | Enable or disable real speaker name suggestions from transcript content.                    |
| **Change speaker count**             | Update the expected min/max number of speakers for transcription.                           |
| **Update Realtime system prompt**    | Replace the system prompt used for Realtime summary generation.                             |
| **Change Realtime summary interval** | Set how often Realtime summaries are generated (1, 2, 3, 5, or 10 minutes).                 |
| **Toggle Final Summary on Stop**     | Enable or disable automatic full summary generation when a Realtime session is stopped.     |
| **Update API key**                   | Store or update an API key for any provider.                                                |
| **Open Settings**                    | Open the Settings panel.                                                                    |
| **Save prompt template**             | Create and save a custom prompt template for summary generation.                            |
| **List prompt templates**            | Show all saved custom prompt templates (no confirmation needed).                            |
| **Show prompt template details**     | Display the full content of a specific prompt template (no confirmation needed).            |
| **Update prompt template**           | Modify an existing prompt template's name or content.                                       |
| **Delete prompt template**           | Remove a custom prompt template.                                                            |
| **Save form template**               | Create and save a form template for structured data extraction.                             |
| **List form templates**              | Show all saved custom form templates (no confirmation needed).                              |
| **Show form template details**       | Display the full fields and structure of a specific form template (no confirmation needed). |
| **Update form template**             | Modify an existing form template's name or fields.                                          |
| **Delete form template**             | Remove a custom form template.                                                              |

You can also ask the chatbot to **create custom prompt templates** (e.g. "Create a prompt template for summarizing technical design meetings") or **create form templates** (e.g. "Create a form template for tracking project status with priority, assignee, due date, and status"). The AI will craft the template and propose saving it as an action. Once confirmed, the template appears in the corresponding dropdown (PromptEditor for prompt templates, FormTemplateSelector for form templates).

#### Clearing the chat

Click the **trash icon** (visible in the header when there are messages) to clear the entire conversation history.

---

### 4.19 Sync Standard + Realtime

**Sync Standard + Realtime** lets you run both Standard recording and Realtime live transcription at the same time, using the same microphone. This is useful when you want a high-quality audio file for post-meeting transcription (Standard) while also getting a live transcript and running summary during the meeting (Realtime).

#### Enabling Sync

1. Open the **Settings panel** (gear icon).
2. Under **Features → Realtime**, turn on the **Sync Standard + Realtime** toggle.
3. Close the Settings panel. The setting is saved automatically.

#### How it works

Once sync is enabled:

- **Auto-start**: When you start recording in Standard mode (Record Audio tab), the Realtime session starts automatically in the background using the same microphone. The reverse also works — starting a Realtime session auto-starts Standard recording.
- **Shared microphone**: Both modes use the same microphone device. Changing the mic in one mode's dropdown automatically updates the other.
- **Pause sync**: When you pause Standard recording, the Realtime session pauses too. Resuming Standard recording resumes both.
- **Stop confirmation**: When you stop either mode while the other is still running, a dialog appears offering three choices:
  - **Cancel** — keep both modes running (nothing changes).
  - **Stop this mode only** — stops just the mode you stopped, the other continues.
  - **Stop both** — stops both Standard recording and the Realtime session.

#### Recording Indicator

When either or both modes are active, a **recording indicator bar** appears at the top of every page (except the main app page). This bar shows:

- Which mode(s) are active: "Standard Recording", "Realtime Session", or "Standard + Realtime".
- The elapsed recording time.
- **Pause/Resume** and **Stop** buttons so you can control the recording from any page.
- A **"Back to app"** link to return to the main page.

This means you can navigate to the Admin Panel or other pages without losing your recording session — the indicator keeps you informed and in control.

#### Requirements

- **AssemblyAI API key** must be configured (for the Realtime transcription half).
- **LLM API key** must be configured (for Realtime summary generation).
- Browser microphone permission must be granted.

> **Tip:** If you only need live transcription without a recorded audio file, you can use Realtime mode on its own without enabling sync. Sync is most valuable when you want both a downloadable recording and live AI insights during the meeting.

---

## 5. Common Workflows

### 5.1 Transcribing and Summarising a Recording

**Goal:** Upload a meeting recording and produce a formatted summary.

1. Make sure you have added your **AssemblyAI API key** and **LLM API key** in Settings (gear icon).
2. On the main page in **Standard** mode, you should see the **Upload File** tab is active.
3. Drag your audio file onto the drop zone, or click to browse and select it. Supported: `.mp3`, `.wav`, `.m4a`, `.flac`, `.ogg`, `.webm` (max 500 MB).
4. The app moves to the **Transcript** step automatically and begins transcribing. Wait for the _"Transcription complete!"_ notification.
5. Review the transcript. If any text is wrong, click in the text area and edit it directly.
6. In the **Speaker Mapping** card, type real names into the input fields next to each speaker label, then click **Apply Names**.
7. Scroll down to **Prompt Settings**. Choose a **Template** from the dropdown, select the **Language**, and optionally set the **Meeting Date**.
8. Click the orange **Generate Summary** button.
9. The app moves to the **Summary** step. Watch the summary stream in.
10. When complete, click **Copy Summary** to copy it as formatted text (ready to paste into an email, doc, etc.) or **Copy as Markdown** for the raw Markdown source.

---

### 5.2 Recording Live Audio and Getting a Summary

**Goal:** Record a conversation happening now and summarise it.

1. In Standard mode, click the **Record Audio** tab.
2. Select **Audio Source**: choose **Mic + Meeting Audio** if the other participants' audio plays through your speakers (e.g., a video call); choose **Mic Only** for in-person conversations.
3. Select your microphone from the dropdown.
4. Click **Start Recording**. Record the conversation.
5. When finished, stop the recording and preview it using the audio player.
6. Click to confirm the recording and send it for transcription.
7. Follow steps 5–10 from [Workflow 5.1](#51-transcribing-and-summarising-a-recording) above.

---

### 5.3 Running a Live Meeting with Realtime Transcription

**Goal:** Capture a meeting in real time and keep a running summary visible throughout.

1. Switch to **Realtime** mode using the mode toggle at the top.
2. Make sure your **AssemblyAI** and **LLM API keys** are saved in Settings.
3. Optionally, adjust the **Summary Interval** in Settings (default: 2 minutes).
4. Choose your **Audio Source** and **microphone** in the controls bar.
5. Click **Start** (orange button). Grant microphone permission if prompted. If there is existing session data, choose whether to continue with it, clear transcript and summary, or clear all.
6. The **Live Transcript** panel begins populating in real time as speech is detected.
7. After the first summary interval, the **Summary** panel shows a first running summary. It updates automatically at each interval.
8. To force an immediate summary update at any time, click the **Refresh Summary button (↻)** in the controls bar.
9. To pause briefly (e.g., a break), click **Pause**. The transcript and summary timer both pause. Click **Resume** when ready.
10. When the meeting ends, click **Stop**. If **Final Summary on Stop** is enabled, a complete final summary is generated.

---

### 5.4 Creating a Custom Prompt Template

**Goal:** Save a customised prompt so you can reuse it across multiple summaries.

1. In Standard mode, complete transcription to reach Step 2.
2. Scroll down to **Prompt Settings**.
3. Either edit the existing prompt in the **Prompt** text area, or use the **Prompt Assistant** to generate one.
4. Once you're happy with the prompt text, click **Save as Custom Template** (the **+** icon button below the prompt).
5. In the dialog that appears, enter a name for your template (e.g., "Weekly Team Standup").
6. Click **Save**.
7. Your template now appears under the **Custom** group in the Template dropdown for future use.

To delete a custom template: select it from the dropdown, then click the **trash icon** that appears next to the dropdown.

---

### 5.5 Renaming Speakers in a Transcript

**Goal:** Replace generic "Speaker A / Speaker B" labels with real participant names.

1. After transcription, you're in Step 2 with the **Speaker Mapping** card visible.
2. In the row for each speaker, click the **Enter name** field and type the person's real name.
3. If you want the summary to be written from one person's perspective, click the **person icon** on the left of their row (it turns orange when active).
4. Click **Apply Names**. The transcript text updates immediately, and a _"Speaker names updated."_ notification confirms the change.

> **Tip:** If you rename a speaker after key points have already been generated, the key points panel updates the name automatically.

---

### 5.6 Adding a New User (Admin)

**Goal:** Grant a new person access to the application.

1. Click your **avatar** → **Admin Panel**.
2. Click the **Add User** button in the top-right.
3. Enter the person's **email address** (must match the Google account they'll use to sign in). Optionally enter their name.
4. Click to confirm.
5. The new user now appears in the table and can sign in immediately using **Sign in with Google**.

---

### 5.7 Running Both Modes in Parallel (Sync)

**Goal:** Record a meeting while also getting a live transcript and running summary — both at the same time.

1. Open **Settings** (gear icon) and enable **Features → Realtime → Sync Standard + Realtime**.
2. Make sure both your **AssemblyAI API key** and **LLM API key** are configured.
3. In **Standard** mode, click the **Record Audio** tab.
4. Select your **microphone** and **audio source** (Mic Only or Mic + Meeting Audio).
5. Click **Start Recording**. Because sync is enabled, the Realtime session starts automatically in the background.
6. Switch to **Realtime** mode using the mode toggle — you'll see the live transcript and running summary updating as the conversation continues. Your Standard recording continues in the background.
7. Switch back to **Standard** mode if needed — both modes keep running.
8. When the meeting ends, stop either mode. A dialog will ask whether to stop both or just one.
9. In **Standard** mode, your recorded audio is ready for high-quality batch transcription and summary generation.
10. In **Realtime** mode, your live transcript and running summary are already available.

> **Tip:** The recording indicator bar at the top of the page shows "Standard + Realtime" when both modes are active, so you always know your recording status.

---

## 6. FAQ / Troubleshooting

**Q: I clicked "Sign in with Google" but got "Access denied. Please contact an administrator to request access."**
A: Your Google account email hasn't been added to the user database. Contact your administrator and ask them to add your email address via the Admin Panel.

---

**Q: The transcription failed or shows an error.**
A: Check the following:

- Your **AssemblyAI API key** is saved correctly in Settings (gear icon → API Keys). Make sure there are no extra spaces.
- The audio file is in a supported format: `.mp3`, `.wav`, `.m4a`, `.flac`, `.ogg`, `.webm` and is under 500 MB.
- Try reloading the page and attempting again. If the error persists, your AssemblyAI key may be invalid or out of credits.

---

**Q: The "Generate Summary" button is greyed out / disabled.**
A: The button requires all three of these to be present: (1) a transcript with text, (2) an LLM API key saved in Settings, and (3) a model selected in Settings. Check each one. A warning link "_Please add an API key in Settings to generate a summary._" will appear if the key is missing.

---

**Q: The Prompt Assistant button is greyed out.**
A: The Prompt Assistant requires an LLM API key saved in Settings. Open the Settings panel, add your key under LLM Providers, and try again.

---

**Q: I want to summarise a transcript I already have — I don't have an audio file.**
A: On the upload screen, click the link **"I already have a transcript — skip upload"**. You'll go directly to Step 2 where you can paste your transcript text into the text area. You only need an LLM API key to generate the summary — no AssemblyAI key needed for this path.

---

**Q: The summary is generating but I want to stop it mid-way.**
A: In Step 3, hover over the orange **"Generating..."** badge at the top of the Summary card. It will change to **"Stop Generating"** — click it to cancel. The partial summary text that was already generated remains visible.

---

**Q: In Realtime mode, the status dot stays amber (connecting) for a long time.**
A: This usually means your AssemblyAI API key is missing or invalid. Check **Settings → API Keys → AssemblyAI API Key**. Also ensure your browser has microphone permission granted. If the problem persists, click Stop, wait a few seconds, and try Start again.

---

**Q: I switched devices and my settings are gone.**
A: By default, settings are saved in your browser's **Local Storage**, which is device-specific. You have two options to transfer settings: (1) Switch to **Account Storage** (avatar → Storage Mode) so your preferences sync across devices automatically, or (2) Use **Export / Import Settings** (avatar → Export / Import Settings) to generate a config string on the old device and import it on the new one. API keys are never synced via Account Storage, but you can transfer them using the **QR Code (API Keys)** button in the Export tab or by checking **"Include API keys"** in the config string export.

---

**Q: How do I transfer my settings to another browser or device?**
A: Click your **avatar** → **Export / Import Settings**. On the Export tab, click **Generate Config String** and copy the result. On the other browser/device, open the same dialog, switch to the **Import** tab, paste the string, and click **Import Settings**. Then reload the page. If you also want to transfer API keys, check **"Include API keys"** before exporting — but be careful not to share that string with others, as the keys are encoded but not encrypted. For API keys specifically, you can also use the **QR Code (API Keys)** button to generate a scannable QR code — just scan it with your phone's camera to import the keys instantly.

---

**Q: My API keys disappeared after clearing browser data.**
A: API keys are stored in browser localStorage for security reasons — they are never saved on the server. If you clear browser data (cookies, site data, localStorage), you will need to re-enter your keys in Settings. This is by design to protect your credentials.

---

**Q: I accidentally cleared the transcript — can I get it back?**
A: If you cleared the transcript using the trash icon (which requires confirmation), the data is removed and you will need to re-upload the audio file and transcribe again. However, if you simply navigated away or reloaded the page, your transcript is automatically preserved — just navigate back to the Transcript step using the step indicators or the "Show previous transcript" link on the upload screen. Session data persists in your browser's localStorage until you start a new session by uploading a new file or skipping upload.

---

**Q: The Speaker Mapping card shows "No speakers detected in the transcript."**
A: This happens when the transcript text doesn't follow the `Speaker X: text` pattern — for example, if you pasted plain text without speaker labels. Speaker detection is based on the transcript format returned by AssemblyAI. If you typed or pasted a transcript manually, you can still generate a summary — the Prompt Settings and Generate Summary button work regardless of whether speakers were detected.

---

**Q: How do I adjust how many speakers AssemblyAI tries to detect?**
A: Open **Settings → Features → Standard → Speaker Count Range**. Set the **Min** and **Max** values to match the expected number of participants. For example, if you know there were exactly 3 speakers, set both to 3. Narrower ranges tend to improve accuracy.

---

**Q: Can I use more than one LLM provider?**
A: Yes — you can save API keys for multiple providers and switch between them in **Settings → AI Model → LLM Provider**. You can also configure different providers for different features using **Feature-Specific Models** in the AI Model section. For example, use Claude for summaries and GPT-4o Mini for key point extraction.

---

**Q: Where is my data stored? Is my audio or transcript saved on the server?**
A: No. Audio files are processed by AssemblyAI and deleted from the app's server immediately after transcription. Transcripts and summaries are stored in your browser's localStorage so they persist across page reloads and navigation, but they are never sent to or saved on the app's server. API keys are also stored only in your browser's localStorage. If you have Account Storage enabled, only your app preferences (model settings, templates, theme) are stored server-side — never audio, transcripts, summaries, or API keys. See the full **Privacy Policy** in the footer for details.

---

**Q: I enabled "Sync Standard + Realtime" but only one mode starts.**
A: Both modes require an **AssemblyAI API key** to be configured. If the key is missing, the Realtime half cannot auto-start. Make sure your AssemblyAI key is saved in **Settings → API Keys**. Also confirm your browser has granted microphone permission — without it, neither mode can access the mic.

---

**Q: I stopped Standard recording and a dialog appeared — what should I do?**
A: When sync is enabled and both modes are running, stopping one mode shows a confirmation dialog asking whether to stop just that mode or both. Choose **"Stop both"** if the meeting is over. Choose **"Stop this mode only"** if you want the other mode to keep running (for example, stop Standard recording but keep the Realtime live transcript going). Choose **"Cancel"** to keep both modes running.

---

**Q: What is the recording indicator bar at the top of the page?**
A: When you have an active recording (Standard, Realtime, or both), a coloured bar appears at the top of every page except the main app page. It shows which mode(s) are active, the elapsed time, and provides Pause/Resume and Stop buttons. This lets you control your recording without navigating back to the main page. Click **"Back to app"** to return to the main page.
