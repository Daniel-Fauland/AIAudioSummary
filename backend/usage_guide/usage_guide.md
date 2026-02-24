# AI Audio Summary — Usage Guide

> **Version:** v1.2.0
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
   - [4.11 Settings Panel](#411-settings-panel)
   - [4.12 Storage Mode](#412-storage-mode)
   - [4.13 Theme Toggle](#413-theme-toggle)
   - [4.14 Admin Panel](#414-admin-panel)
5. [Common Workflows](#5-common-workflows)
   - [5.1 Transcribing and Summarising a Recording](#51-transcribing-and-summarising-a-recording)
   - [5.2 Recording Live Audio and Getting a Summary](#52-recording-live-audio-and-getting-a-summary)
   - [5.3 Running a Live Meeting with Realtime Transcription](#53-running-a-live-meeting-with-realtime-transcription)
   - [5.4 Creating a Custom Prompt Template](#54-creating-a-custom-prompt-template)
   - [5.5 Renaming Speakers in a Transcript](#55-renaming-speakers-in-a-transcript)
   - [5.6 Adding a New User (Admin)](#56-adding-a-new-user-admin)
6. [FAQ / Troubleshooting](#6-faq--troubleshooting)

---

## 1. Application Overview

**AI Audio Summary** is a web application that turns audio recordings of meetings, interviews, lectures, or any spoken-word content into structured text transcripts and AI-generated summaries.

It works in two modes:

- **Standard mode** — Upload a pre-recorded audio file (or record one directly in the browser), wait for transcription, then generate a summary at your own pace.
- **Realtime mode** — Speak into your microphone (or capture a meeting's audio) and watch the transcript and a running summary update live as the conversation unfolds.

**Who it's for:** Anyone who needs to extract key points, decisions, and action items from spoken audio — team leads, project managers, researchers, journalists, or anyone who attends meetings and wants an automatic written record.

**Key privacy principle — Bring Your Own Key (BYOK):** The app never stores your API keys on the server. All AI provider keys are saved exclusively in your browser and are sent directly to the respective service only when you trigger a transcription or summary. Transcripts and summaries are also never stored on the server — they exist only in your current browser session.

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

Click either button to switch modes. Your choice is remembered across sessions.

### 3.3 Step Indicator (Standard Mode Only)

When in Standard mode, three step circles show your progress:

1. **Upload** — input an audio file or recording
2. **Transcript** — review and edit the transcript
3. **Summary** — view and copy the generated summary

The active step is highlighted in orange. Steps you've already completed are also orange; steps you haven't reached yet are grey. You can click a completed step to navigate back to it (a confirmation dialog will warn you if returning would discard progress).

### 3.4 Footer

At the very bottom of the page:

- **Imprint** — service operator information
- **Privacy Policy** — full data processing details
- **Cookie Settings** — explains what browser storage is used
- **v1.2.0** — click to view the changelog of recent updates

### 3.5 User Menu

Click your **avatar** in the top-right to open the user menu:

- Your **name** and **email** are shown at the top.
- **Storage Mode** — switch between Local Storage and Account Storage (see [Section 4.12](#412-storage-mode)).
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

**Start Over:** The **Start Over** button below the cards resets everything and returns to Step 1.

> **Note:** Navigating back via the step indicator or Start Over will discard the current summary. A confirmation dialog will warn you.

---

### 4.9 Realtime Mode

Realtime mode provides live transcription of your microphone and generates a running summary that updates at regular intervals during the session.

**Switch to Realtime mode** by clicking **Realtime** in the mode toggle bar at the top.

#### Controls Bar

A horizontal controls bar appears at the top of the Realtime view:

| Control                                   | Description                                                                                          |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| **Start** button (orange)                 | Begins the realtime session. Changes to **Pause** and **Stop** once active.                          |
| **Pause** button                          | Pauses microphone capture and the summary timer. Click **Resume** to continue.                       |
| **Stop** button                           | Ends the session, closes the connection, and (if enabled) generates a final full-transcript summary. |
| **Mic Only / Mic + Meeting Audio** toggle | Choose whether to capture just your microphone or also audio playing through your speakers.          |
| **Microphone dropdown**                   | Select which microphone device to use.                                                               |
| **Status dot**                            | Colour indicates connection state: grey = idle, amber = connecting, green = connected, red = error.  |
| **Elapsed timer**                         | Shows how long the current session has been running (e.g., `02:34`).                                 |
| **Summary countdown**                     | A `mm:ss` timer counting down to the next automatic summary update.                                  |
| **Refresh Summary button (↻)**            | Triggers an immediate summary update and resets the countdown timer.                                 |

#### Live Transcript Panel

- Located on the left (or first tab on mobile).
- Shows the conversation as it happens, word by word.
- **Finalized text** appears in normal style; **in-progress partial text** appears in a muted italic style.
- Auto-scrolls to the bottom as new text arrives.

#### Summary Panel

- Located on the right (or second tab on mobile).
- Shows the AI-generated running summary in Markdown format (headings, bullet points).
- An **"Updating..."** badge appears while a new summary is being generated.
- A timestamp below the summary shows when it was last updated.

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

---

### 4.11 Settings Panel

Open the Settings panel by clicking the **gear icon (⚙)** in the header, or using the keyboard shortcut **Alt + S** (⌥S on Mac).

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

This is useful if, for example, you want to use a cheaper model for key point extraction but a more capable model for final summaries.

---

#### Features

**Standard** sub-section:

| Setting                                    | What it does                                                                                                                |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| **Speaker Key Points** (toggle)            | When on, automatically extracts a short key-point summary per speaker immediately after transcription completes.            |
| **Speaker Count Range** (Min / Max inputs) | Tells AssemblyAI how many speakers to expect in the recording. Narrowing this range can improve speaker detection accuracy. |

**Realtime** sub-section:

| Setting                             | What it does                                                                  |
| ----------------------------------- | ----------------------------------------------------------------------------- |
| **System Prompt** → **Edit** button | Opens an editor to customise the AI instructions for realtime summaries.      |
| **Summary Interval** dropdown       | How often a new running summary is auto-generated: 1, 2, 3, 5, or 10 minutes. |
| **Final Summary on Stop** (toggle)  | When on, stopping a realtime session triggers a full final summary.           |

---

### 4.12 Storage Mode

Storage Mode controls where your app preferences (model selection, template choices, settings, etc.) are saved.

**Local Storage (default):** All preferences are stored only in your browser's localStorage. They are device-specific and will be lost if you clear your browser data.

**Account Storage:** Preferences are synced to your account on the server. This means your settings follow you across devices and browsers. API keys are **never** included in this sync — they always stay in your browser.

**To switch modes:**

1. Click your **avatar** in the header to open the user menu.
2. Click **Storage Mode**.
3. A dialog explains the difference and lets you switch.
   - Switching from Local → Account: uploads your current local preferences to the server.
   - Switching from Account → Local: downloads your server preferences to the current browser.

**To delete server-side preferences:** Switch back to Local Storage — this immediately deletes all stored preferences from the server.

---

### 4.13 Theme Toggle

Click the **moon/sun icon** in the header to cycle through three theme options:

- **Light** — white background, dark text.
- **Dark** — near-black background (the default appearance).
- **System** — follows your operating system's light/dark preference.

Your theme choice is saved and persists across sessions.

---

### 4.14 Admin Panel

The Admin Panel is only visible to users with the **Admin** role. Access it via **User menu → Admin Panel**.

**What you can do:**

- **View all users** — a table showing each user's email, name, role (Admin or User badge), and join date.
- **Add a user** — click the **Add User** button (top-right of the table). Enter the user's email address and optionally their name, then confirm. The user will be able to sign in with that Google account on their next attempt.
- **Delete a user** — click the **Delete** button in the row for a non-admin user. A confirmation dialog appears before deletion. Admin accounts cannot be deleted from the panel.
- **Refresh** — click the refresh icon to reload the user list.

> **Note:** The Admin Panel manages access control. Only emails that exist in the user database are allowed to sign in — adding a user here is what grants them access to the app.

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
5. Click **Start** (orange button). Grant microphone permission if prompted.
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
A: By default, settings are saved in your browser's **Local Storage**, which is device-specific. To sync settings across devices, switch to **Account Storage**: click your avatar → **Storage Mode** → switch to Account Storage. Going forward, your preferences will follow you across devices. (API keys are never synced and must be re-entered on each device.)

---

**Q: My API keys disappeared after clearing browser data.**
A: API keys are stored in browser localStorage for security reasons — they are never saved on the server. If you clear browser data (cookies, site data, localStorage), you will need to re-enter your keys in Settings. This is by design to protect your credentials.

---

**Q: I accidentally cleared the transcript — can I get it back?**
A: No. Transcripts exist only in your current browser session and are not stored on the server. If you cleared it accidentally, you will need to re-upload the audio file and transcribe it again.

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
A: No. Audio files are processed by AssemblyAI and deleted from the app's server immediately after transcription. Transcripts and summaries exist only in your browser session. API keys are stored only in your browser's localStorage. If you have Account Storage enabled, only your app preferences (model settings, templates, theme) are stored server-side — never audio, transcripts, or API keys. See the full **Privacy Policy** in the footer for details.
