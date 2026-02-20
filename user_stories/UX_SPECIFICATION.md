# UX Specification — AI Audio Summary Frontend

This document defines all visual design decisions for the Next.js + shadcn/ui frontend. It serves as the single source of truth for theming, layout, and interaction patterns.

---

## 1. Visual Identity

| Property | Value |
|----------|-------|
| **Tone** | Modern & Vibrant — polished but with personality |
| **Theme** | Dark mode only (no light mode, no toggle) |
| **Font** | Inter (loaded via `next/font/google`) |
| **Icons** | Lucide React (`lucide-react`, ships with shadcn/ui) |
| **Border radius** | `8px` (medium rounded, shadcn `--radius: 0.5rem`) |

---

## 2. Color Palette

### Primary / Accent

| Token | Hex | Usage |
|-------|-----|-------|
| `--primary` | `#FC520B` | Buttons, active step indicator, links, focus rings |
| `--primary-hover` | `#E04A0A` | Button hover state (slightly darker) |
| `--primary-active` | `#C84209` | Button active/pressed state |
| `--primary-muted` | `rgba(252, 82, 11, 0.15)` | Subtle accent backgrounds (badges, highlights) |
| `--primary-foreground` | `#FFFFFF` | Text on primary-colored backgrounds |

### Backgrounds

| Token | Hex | Usage |
|-------|-----|-------|
| `--background` | `#0A0A0A` | Page background |
| `--card` | `#141414` | Cards, containers, panels |
| `--card-elevated` | `#1A1A1A` | Nested elements inside cards (e.g., inputs, code blocks) |
| `--popover` | `#1A1A1A` | Dropdowns, tooltips, popovers |
| `--sheet` | `#141414` | Settings slide-out panel background |

### Borders

| Token | Hex | Usage |
|-------|-----|-------|
| `--border` | `#262626` | Default borders (cards, inputs, dividers) |
| `--border-hover` | `#3A3A3A` | Border on hover (inputs, interactive cards) |
| `--border-accent` | `#FC520B` | Focused input border, active drag zone |
| `--ring` | `rgba(252, 82, 11, 0.4)` | Focus ring (box-shadow) |

### Text

| Token | Hex | Usage |
|-------|-----|-------|
| `--foreground` | `#FAFAFA` | Primary text |
| `--foreground-secondary` | `#A1A1AA` | Secondary text, labels, placeholders |
| `--foreground-muted` | `#71717A` | Disabled text, hints, timestamps |
| `--foreground-accent` | `#FC520B` | Accent-colored text (links, active labels) |

### Semantic Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `--success` | `#22C55E` | Success toasts, saved confirmations, completed steps |
| `--success-muted` | `rgba(34, 197, 94, 0.15)` | Success badge backgrounds |
| `--error` | `#EF4444` | Error toasts, validation errors, failed states |
| `--error-muted` | `rgba(239, 68, 68, 0.15)` | Error badge backgrounds |
| `--warning` | `#F59E0B` | Warning badges (missing API key), caution states |
| `--warning-muted` | `rgba(245, 158, 11, 0.15)` | Warning badge backgrounds |
| `--info` | `#3B82F6` | Informational notes, tips |
| `--info-muted` | `rgba(59, 130, 246, 0.15)` | Info badge backgrounds |

---

## 3. Typography

| Element | Font | Size | Weight | Color |
|---------|------|------|--------|-------|
| **Page title (Header)** | Inter | `24px` (`text-2xl`) | 700 (bold) | `--foreground` |
| **Section headings** | Inter | `18px` (`text-lg`) | 600 (semibold) | `--foreground` |
| **Body text** | Inter | `14px` (`text-sm`) | 400 (normal) | `--foreground` |
| **Labels** | Inter | `14px` (`text-sm`) | 500 (medium) | `--foreground-secondary` |
| **Muted / hints** | Inter | `13px` (`text-xs`) | 400 (normal) | `--foreground-muted` |
| **Buttons** | Inter | `14px` (`text-sm`) | 500 (medium) | Varies by variant |
| **Monospace (transcript)** | `JetBrains Mono` or system mono | `14px` | 400 | `--foreground` |
| **Step indicator labels** | Inter | `13px` (`text-xs`) | 500 (medium) | Varies by state |

---

## 4. Layout & Spacing

### Page Structure

```
┌─────────────────────────────────────────────────────────────┐
│  Header (sticky top)                                        │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ "AI Audio Summary"                    [⚙ Settings]     ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  Step Indicator                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │    (1)─────────(2)─────────(3)                         ││
│  │  Upload     Transcript    Summary                      ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  Content Area (changes per step)                            │
│  ┌─────────────────────────────────────────────────────────┐│
│  │                                                         ││
│  │              Step-specific content                      ││
│  │                                                         ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

| Property | Value |
|----------|-------|
| **Max width** | `1152px` (`max-w-6xl`) |
| **Horizontal padding** | `16px` on mobile, `24px` on desktop (`px-4 md:px-6`) |
| **Vertical padding** | `24px` (`py-6`) between major sections |
| **Card padding** | `24px` (`p-6`) |
| **Gap between cards** | `16px` (`gap-4`) |
| **Section gap** | `24px` (`gap-6`) between major blocks |

### Breakpoints

| Name | Width | Behavior |
|------|-------|----------|
| **Mobile** | `< 768px` | Single column, stacked layout |
| **Desktop** | `≥ 768px` | Side-by-side where applicable (Step 3) |

---

## 5. Component Specifications

### 5.1 Header

- **Height**: `64px`
- **Background**: `--card` (`#141414`)
- **Bottom border**: `1px solid` `--border`
- **Position**: Sticky top (`sticky top-0 z-50`)
- **Content**: App name left-aligned, settings gear icon (`Settings` from Lucide) right-aligned
- **Settings button**: Ghost variant, icon-only, `--foreground-secondary` color, `--foreground` on hover

### 5.2 Step Indicator

- **Style**: Icon circles connected by horizontal lines
- **Icons** (Lucide):
  - Step 1: `Upload` icon
  - Step 2: `FileText` icon
  - Step 3: `Sparkles` icon
- **Circle size**: `40px` diameter
- **Line thickness**: `2px`

| State | Circle | Icon | Line (before) | Label |
|-------|--------|------|----------------|-------|
| **Completed** | `--primary` bg | White icon | `--primary` | `--foreground-secondary` |
| **Active** | `--primary` bg + glow ring | White icon | `--primary` | `--foreground` (bold) |
| **Upcoming** | `--card-elevated` bg, `--border` border | `--foreground-muted` icon | `--border` | `--foreground-muted` |

- **Glow on active**: `box-shadow: 0 0 0 4px rgba(252, 82, 11, 0.2)`

### 5.3 Step 1 Input Area

Step 1 has two modes toggled via a tab bar directly above the content zone:

- **Tab bar**: Two text buttons — "Upload File" and "Record Audio"
- **Active tab**: `--primary` bottom border (`border-b-2 border-primary`), `--foreground` text
- **Inactive tab**: No border, `--foreground-muted` text, transitions to `--foreground-secondary` on hover
- **Transition**: `150ms ease` color change

Below the tab bar is the shared **"I already have a transcript — skip upload"** link, centered, `--foreground-muted` underlined text.

#### 5.3.1 Upload File mode

- **Size**: Full width of content area, `240px` min height
- **Border**: `2px dashed` `--border`
- **Border radius**: `8px`
- **Background**: `--card`
- **Center content**: Upload Cloud icon (`UploadCloud` from Lucide, `48px`), instructional text below
- **Text**: "Drag and drop an audio file here, or click to browse" in `--foreground-secondary`
- **Supported formats hint**: ".mp3, .wav, .m4a, .flac, .ogg, .webm" in `--foreground-muted`, smaller text

| State | Border | Background | Icon |
|-------|--------|------------|------|
| **Default** | `--border` dashed | `--card` | `--foreground-muted` |
| **Hover** | `--border-hover` dashed | `--card-elevated` | `--foreground-secondary` |
| **Drag over** | `--border-accent` dashed | `--primary-muted` | `--primary` |
| **Disabled** | `--border` dashed, `opacity-50` | `--card` | `--foreground-muted` |

- **File preview** (after selection): Show file icon, name, size, and a "Remove" (X) button inside the zone, replacing the upload prompt

#### 5.3.2 Record Audio mode

Same container style as Upload (`2px dashed --border`, `--card` bg, `240px` min height, `8px` border radius). The interior changes based on recorder state:

| State | Container border/bg | Interior content |
|-------|---------------------|-----------------|
| **Idle** | `--border` dashed / `--card` | `Mic` icon (48px, `--foreground-muted`), instruction text, usage hint, mode toggle (Chromium only), optional mic selector, start button |
| **Recording** | `--border-accent` dashed / `--primary-muted` | Pulsing red dot + MM:SS timer (monospace, `text-lg`), live waveform canvas, "Pause" (secondary) + "Stop" (destructive) buttons |
| **Paused** | `--border` dashed / `--card` | Gray dot + MM:SS timer + "Paused" label (`--foreground-muted`), static waveform, "Resume" (secondary) + "Stop" (destructive) buttons |
| **Done** | `--border` dashed / `--card` | Final duration label, static waveform, AudioPlayer, "Record Again" (ghost) + "Download" (secondary) + "Use for Transcript" (primary) buttons |

**Idle state layout** (top to bottom, center-aligned):
1. `Mic` icon (48px, `--foreground-muted`)
2. Instruction text (`--foreground-secondary`) — changes per mode:
   - Mic Only: *"Click the button to start recording"*
   - Mic + Meeting Audio: *"Share your entire screen and check 'Also share system audio' in the dialog"*
3. Usage hint (`--foreground-muted`, `text-xs`) — changes per mode:
   - Mic Only: *"Best used when playing audio through speakers"*
   - Mic + Meeting Audio: *"Best used with headphones to avoid mic feedback"*
4. **Recording mode toggle** (see below)
5. Mic selector dropdown (when ≥ 2 devices)
6. Start button (label changes per mode)

**Recording mode toggle** (segmented control, always visible):
- Container: `flex rounded-md border border-border text-xs`
- Two segments: "Mic Only" (left, `rounded-l-md`) and "Mic + Meeting Audio" (right, `rounded-r-md`)
- **Active segment**: `bg-card-elevated text-foreground`
- **Inactive segment**: `text-foreground-muted hover:text-foreground-secondary`
- Defaults to "Mic Only" on every page load (no persistence)
- **"Mic + Meeting Audio"** is only enabled on Chromium-based browsers (Chrome, Brave, Edge). On other browsers (Firefox, Safari) it is rendered but visually disabled (`opacity-40 cursor-not-allowed`). Hovering the disabled segment shows a Radix `Tooltip` with the message: *"Only supported on Chromium-based browsers like Google Chrome, Brave, or Edge"*. Tooltip delay: `100ms`.

**Start button label**:
- Mic Only: "Start Recording"
- Mic + Meeting Audio: "Share Screen & Record"

**Meeting audio recording flow**:
- Clicking "Share Screen & Record" opens the browser's native screen-share picker
- If the user cancels the picker, nothing happens (no error toast)
- If no audio track is included in the share, shows error toast: *"No audio was shared. Make sure to check 'Share audio' in the share dialog."*
- Mic permission is requested after screen share is confirmed; if denied, the display stream is cleaned up and the standard mic-denied toast is shown
- The mic and system audio are merged via `AudioContext` into a single `MediaRecorder` stream

**Waveform visualization** (canvas element, `320×60px`, full width up to max):
- 40 vertical bars, `2px` gap between bars
- **Active (recording)**: bars driven by `AnalyserNode` frequency data, `--primary` fill (`#FC520B`)
- **Inactive (paused / done)**: static decorative bars, `--foreground-muted` fill (`#71717A`)
- Animated via `requestAnimationFrame` during recording; cancelled on pause/stop
- In meeting mode, both mic and system audio feed the same `AnalyserNode`

**Microphone selector** (shown in idle state only when ≥ 2 audio input devices are detected):
- Layout: small `Mic` icon + shadcn `Select` dropdown, `max-w-xs`, sits between the mode toggle and the start button
- Dropdown lists real device labels after mic permission is granted; falls back to "Microphone 1", "Microphone 2", etc. before permission
- Updates automatically on `devicechange` events (plug/unplug)
- Shown in both Mic Only and Mic + Meeting Audio modes

#### 5.3.3 Audio Player

Custom dark-themed playback widget used in the AudioRecorder "done" state. Implemented in `components/ui/audio-player.tsx`.

**Layout**: Horizontal flex row — `[Play/Pause] [time] [seek bar ────────] [mute] [volume ──]`

**Container**: `rounded-lg border border-border bg-card-elevated px-3 py-2`, `max-w-[320px]`, full width

| Element | Style |
|---------|-------|
| **Play/Pause button** | Ghost variant, `h-8 w-8`, `Play`/`Pause` Lucide icons, `--foreground-secondary` → `--foreground` on hover |
| **Time display** | `mm:ss / mm:ss`, monospace, `text-xs`, `--foreground-muted`, tabular nums |
| **Seek bar** | shadcn `Slider`, `flex-1`, filled range in `--primary` |
| **Mute button** | Ghost variant, `h-8 w-8`, `Volume2`/`VolumeX` Lucide icons |
| **Volume slider** | shadcn `Slider`, `w-14` fixed width |

**Slider thumb** (both seek and volume):
- Size: `12px` (`size-3`) — smaller than the default `16px`
- Fill: solid `--primary` (`#FC520B`), no border, no shadow
- **Default**: `opacity-0`, `scale-75` (hidden)
- **On hover / keyboard focus**: `opacity-100`, `scale-100`, `150ms` ease transition
- This gives a clean Spotify/YouTube-style resting state

### 5.4 Transcript View (Step 2)

- **Container**: Card with `--border` border
- **Textarea**: Full width, monospace font, `--card-elevated` background, min height `300px`, max height `500px` with scroll
- **Loading state**: Pulsing skeleton lines + "Transcribing your audio..." text with spinner

### 5.5 Speaker Mapper (Step 2)

- **Layout**: Inline with the transcript, below it on both mobile and desktop
- **Container**: Card with `--border` border
- **"Detect Speakers" button**: Secondary variant (outline)
- **Mapping rows**: Each row shows `Speaker Label → [Input Field]` inline
- **Arrow**: `→` character or `ArrowRight` Lucide icon in `--foreground-muted`
- **"Apply Names" button**: Primary variant (`--primary` background)

### 5.6 Prompt Editor (Step 2, below transcript/speakers)

- **Container**: Card with `--border` border
- **Template selector**: shadcn Select dropdown, full width on mobile, `300px` on desktop
- **Prompt textarea**: Full width, `--card-elevated` background, min height `200px`
- **"Reset" button**: Ghost variant, small, next to the template selector
- **Language selector**: shadcn Select, inline with informal German toggle
- **Informal German toggle**: shadcn Switch component, appears only when German selected
- **Date picker**: Simple date input, optional
- **"Generate Summary" button**: Primary variant, large (`h-11`), full width on mobile, prominent placement
  - Loading state: "Generating..." + `Loader2` spinner icon (animate-spin)
  - Disabled state: `opacity-50`, `cursor-not-allowed`

### 5.7 Summary View (Step 3)

- **Layout**: Two-column grid on desktop (`grid-cols-2 gap-4`), stacked on mobile
  - Left: Transcript (read-only)
  - Right: Summary (Markdown rendered)
- **Summary card**: `--border` border, `--card` background, scrollable, max height `600px`
- **Markdown styling**: Headings, lists, bold inherit Inter font. Code blocks use monospace on `--card-elevated` background
- **Streaming cursor**: Blinking `▊` character appended during generation, `--primary` colored
- **Action buttons** (below summary, after completion):
  - "Copy Summary": Secondary variant, `Copy` Lucide icon
  - "Regenerate": Secondary variant, `RefreshCw` Lucide icon
  - "Back to Transcript": Ghost variant, `ArrowLeft` Lucide icon

### 5.8 Settings Sheet

- **Direction**: Slides from right
- **Width**: `380px`
- **Background**: `--card`
- **Border left**: `1px solid` `--border`
- **Overlay**: Semi-transparent black (`rgba(0, 0, 0, 0.6)`)
- **Layout**: `flex flex-col` — header is fixed at top, body is wrapped in `ScrollArea` (Radix) so content scrolls without native browser scrollbar
- **Sections**: "API Keys", "AI Model", and "Features" separated by `Separator`, each collapsible
- **Info note**: Small info banner at top (above scroll area) with `--info-muted` background and `Info` Lucide icon
- **API key inputs**: Password type with `Eye`/`EyeOff` toggle icon
- **Key status badge**: Small dot — green (`--success`) if key saved, gray (`--foreground-muted`) if empty
- **Warning badge**: `--warning` colored badge when selected provider has no key
- **Keyboard shortcut badges** (`⌥` + `S`): Shown next to the "Settings" title on **desktop only** (`≥ 768px`). Hidden on mobile (`hidden md:flex`) since touch devices have no keyboard.

---

## 6. Button Variants

| Variant | Background | Text | Border | Hover |
|---------|------------|------|--------|-------|
| **Primary** | `--primary` | `--primary-foreground` | None | `--primary-hover` bg |
| **Secondary** | Transparent | `--foreground` | `1px solid --border` | `--card-elevated` bg |
| **Ghost** | Transparent | `--foreground-secondary` | None | `--card-elevated` bg |
| **Destructive** | `--error` | `#FFFFFF` | None | Darker red bg |
| **Link** | Transparent | `--primary` | None | Underline |

---

## 7. Input Styling

| Property | Value |
|----------|-------|
| **Background** | `--card-elevated` (`#1A1A1A`) |
| **Border** | `1px solid --border` |
| **Border (focus)** | `1px solid --border-accent` + focus ring |
| **Text color** | `--foreground` |
| **Placeholder** | `--foreground-muted` |
| **Height** | `40px` (`h-10`) |
| **Padding** | `0 12px` (`px-3`) |

---

## 8. Toast Notifications

Using shadcn/ui `sonner` integration:

| Type | Left border | Icon |
|------|-------------|------|
| **Success** | `--success` | `CheckCircle` |
| **Error** | `--error` | `XCircle` |
| **Warning** | `--warning` | `AlertTriangle` |
| **Info** | `--info` | `Info` |

- **Position**: Top-right, `72px` from the top (clears the `64px` sticky header)
- **Background**: `--card`
- **Border**: `1px solid --border`
- **Duration**: 5 seconds, pauses on hover

---

## 9. Animations & Transitions

| Element | Animation | Duration | Easing |
|---------|-----------|----------|--------|
| **Step transitions** | Fade in + slight slide up | `300ms` | `ease-out` |
| **Settings sheet** | Slide from right | `300ms` | `ease-in-out` (shadcn default) |
| **Button hover** | Background color transition | `150ms` | `ease` |
| **Input focus** | Border color + ring | `150ms` | `ease` |
| **Drag-over zone** | Border + background color | `150ms` | `ease` |
| **Streaming cursor** | Blink (`opacity 0↔1`) | `1s` infinite | `step-end` |
| **Loading spinner** | Rotate | `1s` infinite | `linear` |
| **Recorder waveform bars** | Height driven by live frequency data via `requestAnimationFrame` | Continuous | - |
| **Audio player slider thumb** | Fade + scale in on hover/focus (`opacity 0→1`, `scale 0.75→1`) | `150ms` | `ease` |

Step transition implementation:
```css
.step-enter {
  opacity: 0;
  transform: translateY(8px);
}
.step-enter-active {
  opacity: 1;
  transform: translateY(0);
  transition: opacity 300ms ease-out, transform 300ms ease-out;
}
```

---

## 10. Loading & Empty States

### Loading States

| Context | Indicator |
|---------|-----------|
| **Config loading** | Full-page skeleton: gray pulsing rectangles for header, steps, and content area |
| **File uploading** | Spinner inside the drop zone + "Uploading..." text + progress bar (if available) |
| **Recording upload** | Muted `Mic` icon + "Uploading recording..." text, container at `opacity-50` |
| **Transcribing** | Skeleton lines pulsing in the transcript area + "Transcribing your audio..." with spinner |
| **Generating summary** | Streaming text with blinking cursor `▊` + "Generating summary..." badge |

### Empty States

| Context | Message |
|---------|---------|
| **No API keys** | Settings sheet auto-opens. Info banner: "Add your API keys to get started." |
| **No transcript yet** | Step 1 upload zone is the default view |
| **No speakers detected** | "No speakers detected in the transcript." in `--foreground-muted` |

---

## 11. Responsive Behavior Summary

| Component | Desktop (≥768px) | Mobile (<768px) |
|-----------|------------------|-----------------|
| **Header** | Full app name + settings icon | Same (app name may truncate) |
| **Step indicator** | Icons + labels + lines | Icons + lines (labels abbreviated or hidden) |
| **Step 1 tab toggle** | "Upload File" / "Record Audio" tabs visible | Same |
| **File upload** | Centered in content area | Full width |
| **Audio recorder** | Centered in content area, mic selector visible when ≥2 mics | Full width, mic selector visible when ≥2 mics |
| **Audio player** | Horizontal row (play, time, seek, mute, volume) | Same (wraps naturally) |
| **Transcript + Speakers** | Transcript full width, speakers below | Same, stacked |
| **Prompt Editor** | Template + language selectors inline | Stacked, full width |
| **Step 3 layout** | Two columns (transcript / summary) | Stacked, tab toggle between views |
| **Settings sheet** | `380px` slide-out | Full-width slide-out |
| **Settings keyboard shortcut** | `⌥S` badges visible next to "Settings" title | Hidden |
| **Action buttons** | Inline row | Stacked, full width |

---

## 12. Scrollable Areas

All scrollable regions use the shadcn `ScrollArea` component (Radix UI `@radix-ui/react-scroll-area`) instead of native browser scrollbars. This provides a consistent, minimal custom scrollbar across all browsers and OS themes.

| Component | Scroll area | Constraint |
|-----------|-------------|------------|
| **TranscriptView** (card, read-only) | Transcript text | `max-h-[600px] min-h-[300px]` |
| **TranscriptView** (fullscreen dialog) | Transcript text | `flex-1` (fills dialog height) |
| **SummaryView** (card) | Markdown summary | `max-h-[600px]` |
| **SummaryView** (fullscreen dialog) | Markdown summary | `flex-1` |
| **RealtimeTranscriptView** (card) | Live transcript | `min-h-[300px] max-h-[600px]` |
| **RealtimeTranscriptView** (fullscreen) | Live transcript | `flex-1` |
| **RealtimeSummaryView** (card) | Markdown summary | `max-h-[600px]` |
| **RealtimeSummaryView** (fullscreen) | Markdown summary | `flex-1` |
| **SpeakerMapper** (dialog) | Speaker rows | `flex-1` (dialog body minus header/footer) |
| **SettingsSheet** | All settings content | `flex-1` (panel height minus sheet header) |

**Scrollbar style**: thin (`w-2.5`), `--border` colored thumb, appears on hover/scroll, sits inside the component boundary.

**Auto-scroll**: `SummaryView` scrolls to the bottom during streaming. `RealtimeTranscriptView` auto-scrolls as new transcript arrives and detects manual scroll-up to disable auto-scroll (re-enabled via the "Auto-scroll" button).

---

## 13. Tooltips

Tooltips use the shadcn `Tooltip` component (Radix UI `@radix-ui/react-tooltip`). A single `TooltipProvider` with `delayDuration={100}` wraps the entire app in `layout.tsx`, giving a fast `100ms` hover delay globally (vs. the ~600ms browser-native `title` delay).

Currently used for:

| Location | Trigger | Content |
|----------|---------|---------|
| **AudioRecorder — "Mic + Meeting Audio" segment** | Hover on the disabled button (non-Chromium browsers) | *"Only supported on Chromium-based browsers like Google Chrome, Brave, or Edge"* |

Tooltip placement defaults to the Radix default (above the trigger). Content uses `TooltipContent` with default shadcn styling (`--popover` background, `--border` border, `text-xs`).

---

## 14. Accessibility Notes

- All interactive elements must have visible focus rings (`--ring`)
- Color is never the sole indicator — always pair with icons or text
- Inputs must have associated labels
- Toast messages should use `aria-live` (handled by sonner)
- Minimum contrast ratio: 4.5:1 for text, 3:1 for large text and UI components
- `#FC520B` on `#0A0A0A` = ~5.2:1 contrast ratio (passes AA)
- `#FAFAFA` on `#0A0A0A` = ~19.5:1 contrast ratio (passes AAA)
