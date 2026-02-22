# UX Specification — AI Audio Summary Frontend

This document defines all visual design decisions for the Next.js + shadcn/ui frontend. It serves as the single source of truth for theming, layout, and interaction patterns.

---

## 1. Visual Identity

| Property | Value |
|----------|-------|
| **Tone** | Modern & Vibrant — polished but with personality |
| **Theme** | Light / Dark / System (three-way toggle). Defaults to System (follows OS preference). Persisted to `aias:v1:theme` in localStorage via `next-themes`. |
| **Font** | Inter (loaded via `next/font/google`) |
| **Icons** | Lucide React (`lucide-react`, ships with shadcn/ui) |
| **Border radius** | `8px` (medium rounded, shadcn `--radius: 0.5rem`) |

---

## 2. Color Palette

CSS variables are defined in `globals.css`. `:root` holds light mode values; `.dark` overrides them for dark mode. `next-themes` applies the `.dark` class to `<html>` when in dark mode.

### Primary / Accent (same in both themes)

| Token | Value | Usage |
|-------|-------|-------|
| `--primary` | `#FC520B` | Buttons, active step indicator, links, focus rings |
| `--primary-hover` | `#E04A0A` | Button hover state |
| `--primary-active` | `#C84209` | Button active/pressed state |
| `--primary-foreground` | `#FFFFFF` | Text on primary-colored backgrounds |

### Backgrounds

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--background` | `#FAFAFA` | `#0A0A0A` | Page background |
| `--card` | `#FFFFFF` | `#141414` | Cards, containers, panels |
| `--card-elevated` | `#F5F5F5` | `#1A1A1A` | Nested elements inside cards (inputs, code blocks) |
| `--popover` | `#FFFFFF` | `#1A1A1A` | Dropdowns, tooltips, popovers |

### Borders

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--border` | `#E5E5E5` | `#262626` | Default borders (cards, inputs, dividers) |
| `--border-hover` | `#D4D4D4` | `#3A3A3A` | Border on hover (inputs, interactive cards) |
| `--border-accent` | `#FC520B` | `#FC520B` | Focused input border, active drag zone |
| `--ring` | `rgba(252,82,11,0.3)` | `rgba(252,82,11,0.4)` | Focus ring (box-shadow) |

### Text

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--foreground` | `#0A0A0A` | `#FAFAFA` | Primary text |
| `--foreground-secondary` | `#3F3F46` | `#B4B4BB` | Secondary text, labels, placeholders |
| `--foreground-muted` | `#71717A` | `#8A8A93` | Disabled text, hints, timestamps |
| `--foreground-accent` | `#FC520B` | `#FC520B` | Accent-colored text (links, active labels) |

### Semantic Colors

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--color-success` | `#16A34A` | `#22C55E` | Success toasts, saved confirmations, completed steps |
| `--color-success-muted` | `rgba(22,163,74,0.10)` | `rgba(34,197,94,0.15)` | Success badge backgrounds |
| `--color-error` | `#DC2626` | `#EF4444` | Error toasts, validation errors, failed states |
| `--color-error-muted` | `rgba(220,38,38,0.10)` | `rgba(239,68,68,0.15)` | Error badge backgrounds |
| `--color-warning` | `#D97706` | `#F59E0B` | Warning badges (missing API key), caution states |
| `--color-warning-muted` | `rgba(217,119,6,0.10)` | `rgba(245,158,11,0.15)` | Warning badge backgrounds |
| `--color-info` | `#2563EB` | `#3B82F6` | Informational notes, tips |
| `--color-info-muted` | `rgba(37,99,235,0.10)` | `rgba(59,130,246,0.15)` | Info badge backgrounds |
| `--primary-muted` | `rgba(252,82,11,0.10)` | `rgba(252,82,11,0.15)` | Subtle accent backgrounds (badges, drag-over zones) |

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

### Vertical spacing between page sections (Standard mode)

| Gap | Value | Notes |
|-----|-------|-------|
| Mode switcher → Step Indicator | `16px` (`mb-4` on switcher) | Step Indicator has `py-6` built-in |
| Inner tabs (Upload/Record) → content card | `12px` (`space-y-3`) | Tighter than other gaps |

### Breakpoints

| Name | Width | Behavior |
|------|-------|----------|
| **Mobile** | `< 768px` | Single column, stacked layout |
| **Desktop** | `≥ 768px` | Side-by-side where applicable (Step 3) |

---

## 5. Component Specifications

### 5.1 Header

- **Height**: `64px`
- **Background**: `--card`
- **Bottom border**: `1px solid` `--border`
- **Position**: Sticky top (`sticky top-0 z-50`)
- **Content**: App name left-aligned; right side (left→right): `UserMenu` (avatar + sign-out), `ThemeToggle`, Settings gear icon
- **ThemeToggle**: Ghost variant, icon-only button that cycles Light → Dark → System. Icons: `Sun` (light) / `Moon` (dark) / `Monitor` (system). Wrapped in a `Tooltip` showing the current mode name. `--foreground-secondary` color, `--foreground` on hover.
- **Settings button**: Ghost variant, icon-only (`Settings` from Lucide), `--foreground-secondary` color, `--foreground` on hover

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

### 5.2.5 Mode Switcher

The top-level **Standard / Realtime** switch uses a **pill-style segmented control**, not underlined tabs. This differentiates it visually from the inner Upload File / Record Audio tab bar.

- **Container**: `inline-flex rounded-lg border border-border bg-card-elevated p-1`, centered horizontally below the header
- **Each segment**: `rounded-md px-4 py-1.5 text-sm font-medium transition-colors`
- **Active segment**: `bg-primary text-primary-foreground`
- **Inactive segment**: `bg-transparent text-foreground-muted hover:text-foreground-secondary`
- Persisted to localStorage (`aias:v1:app_mode`)

---

### 5.3 Step 1 Input Area

Step 1 has two modes toggled via a **tab bar** directly above the content zone:

- **Tab bar**: Two text buttons — "Upload File" and "Record Audio"
- **Active tab**: `--primary` bottom border (`border-b-2 border-primary`), `--foreground` text
- **Inactive tab**: No border, `--foreground-muted` text, transitions to `--foreground-secondary` on hover
- **Transition**: `150ms ease` color change

The **"I already have a transcript — skip upload"** link is placed **inside the content card**, at the very bottom, separated from the card content by `border-t border-border pt-4`. It is centered, `text-sm text-foreground-muted underline`.

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

Container uses a **solid** `1px` border (not dashed — dashed is reserved for Upload File drop zones). `--card` bg, `240px` min height, `8px` border radius. The interior changes based on recorder state:

| State | Container border/bg | Interior content |
|-------|---------------------|-----------------|
| **Idle** | `1px solid --border` / `--card` | `Mic` icon (48px), instruction text, usage hint, Audio Source label + toggle, optional mic selector, start button, skip link |
| **Recording** | `1px solid --border-accent` / `--primary-muted` | Pulsing red dot + MM:SS timer (monospace, `text-lg`), live waveform canvas, "Pause" (secondary) + "Stop" (destructive) buttons |
| **Paused** | `1px solid --border` / `--card` | Gray dot + MM:SS timer + "Paused" label (`--foreground-muted`), static waveform, "Resume" (secondary) + "Stop" (destructive) buttons |
| **Done** | `1px solid --border` / `--card` | Final duration label, static waveform, AudioPlayer, "Record Again" (ghost) + "Download" (secondary) + "Use for Transcript" (primary) buttons |

**Idle state layout** (top to bottom, center-aligned):
1. `Mic` icon (48px, `--foreground-muted`)
2. Instruction text (`--foreground-secondary`) — changes per mode:
   - Mic Only: *"Click the button to start recording"*
   - Mic + Meeting Audio: *"Share your entire screen and check 'Also share system audio' in the dialog"*
3. Usage hint (`--foreground-muted`, `text-xs`) — changes per mode:
   - Mic Only: *"Best used when playing audio through speakers"*
   - Mic + Meeting Audio: *"Best used with headphones to avoid mic feedback"*
4. **"Audio Source" label** (`text-xs font-medium text-foreground-muted`, centered above toggle)
5. **Recording mode toggle** (see below)
6. Mic selector dropdown (when ≥ 2 devices) — dropdown only, no prefix icon
7. Start button — text only, no icon (label changes per mode)
8. `border-t border-border` divider + **"I already have a transcript — skip upload"** link (centered, `--foreground-muted underline`)

**Recording mode toggle** (segmented control, always visible):
- Container: `flex rounded-md border border-border text-xs`
- Two segments: "Mic Only" (left, `rounded-l-md`) and "Mic + Meeting Audio" (right, `rounded-r-md`)
- **Active segment**: `bg-card-elevated text-foreground`
- **Inactive segment**: `text-foreground-muted hover:text-foreground-secondary`
- Defaults to "Mic Only" on every page load (no persistence)
- **"Mic + Meeting Audio"** is only enabled on Chromium-based browsers (Chrome, Brave, Edge). On other browsers (Firefox, Safari) it is rendered but visually disabled (`opacity-40 cursor-not-allowed`). Hovering the disabled segment shows a Radix `Tooltip` with the message: *"Only supported on Chromium-based browsers like Google Chrome, Brave, or Edge"*. Tooltip delay: `100ms`.

**Start button**: Text only, no icon.
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
- **Active (recording)**: bars driven by `AnalyserNode` frequency data, `--primary` fill (reads CSS variable at draw time — adapts to theme)
- **Inactive (paused / done)**: static decorative bars, `--foreground-muted` fill (reads CSS variable at draw time — adapts to theme)
- Animated via `requestAnimationFrame` during recording; cancelled on pause/stop
- In meeting mode, both mic and system audio feed the same `AnalyserNode`

**Microphone selector** (shown in idle state only when ≥ 2 audio input devices are detected):
- Layout: shadcn `Select` dropdown, `w-52`, sits between the mode toggle and the start button — no prefix icon
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

#### Card header

- **Title**: "Speaker Mapping" (`text-lg`)
- **"Generate Key Points" button** (right-aligned, `variant="outline" size="sm"`):
  - Hidden when the Key Points feature is disabled in Settings (`keyPointsEnabled=false`) or no speakers detected yet
  - States:
    - Idle (no key points yet): `Sparkles` icon + "Generate Key Points" text
    - Loading: `Loader2` spinner (animate-spin) + "Generating..." text, button disabled
    - After key points loaded: `RefreshCw` icon + "Regenerate" text
  - On mobile (< 768px): icon only (no text label)
- **"Expand All / Collapse All" link** (below the title, `variant="link" size="sm" text-xs text-foreground-muted`):
  - Only visible after key points have been generated
  - Toggles between "Expand All" and "Collapse All" based on current state
  - "Expand All" expands all rows that have key points
  - "Collapse All" collapses all rows

#### Speaker rows (expandable)

Each speaker row is an accordion item. Layout:

```
[👤 author-toggle]  Speaker A  →  [Enter name input]  [▸ chevron]
┌──────────────────────────────────────────────────────────────────┐
│  Key points text (when expanded)                                 │
└──────────────────────────────────────────────────────────────────┘
```

- **Author toggle** (`h-8 w-8` rounded-md): `User` Lucide icon; active state = `--primary` bg; inactive = `--card-elevated` bg, `--foreground-muted` icon
- **Speaker label**: `min-w-[100px] text-sm font-medium text-foreground-secondary`
- **Arrow**: `ArrowRight` in `--foreground-muted`
- **Name input**: `flex-1`, `--card-elevated` background, placeholder "Enter name"
- **Chevron** (`Button variant="ghost" size="icon" h-8 w-8`):
  - Hidden when no key points exist and not loading (`showChevrons = false`)
  - Disabled when key points are loading and this speaker has no points yet
  - `ChevronRight` when collapsed, `ChevronDown` when expanded
  - Color: `--foreground-muted`, transitions to `--foreground` on hover

**Collapsible key points panel** (below the row, `transition-all duration-200` via CSS grid height animation):
- Container: `rounded-md bg-card-elevated p-3 mx-2 mt-2 mb-1`
- Text: `text-sm leading-relaxed text-foreground-secondary`
- Text wraps naturally; no truncation or scroll

#### Row state behavior

| Situation | Chevrons | Rows | Content |
|-----------|----------|------|---------|
| No key points yet | Hidden | Collapsed | — |
| Loading key points | Visible, disabled | Collapsed | — |
| Key points received | Visible, enabled | **Auto-expand all** rows that have key points | Key points text |
| User collapses a row | — | Collapsed | — |
| User clicks "Regenerate" | Visible, disabled | All collapse | Loading then auto-expand again |

- **"Apply Names" button**: Primary variant (`--primary` background), full width on mobile

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
- **Overlay**: Semi-transparent black — `rgba(0, 0, 0, 0.6)` in dark mode, `rgba(0, 0, 0, 0.4)` in light mode (handled by shadcn sheet component)
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
| **Mode switcher** | Centered segmented control (Standard / Realtime) | Same |
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

**Dark mode contrast:**
- `#FC520B` on `#0A0A0A` = ~5.2:1 (passes AA)
- `#FAFAFA` on `#0A0A0A` = ~19.5:1 (passes AAA)

**Light mode contrast:**
- `#FC520B` on `#FAFAFA` = ~4.6:1 (passes AA)
- `#0A0A0A` on `#FAFAFA` = ~19.5:1 (passes AAA)
- `#52525B` on `#FAFAFA` = ~7.4:1 (passes AAA — secondary text)
- `#A1A1AA` on `#FAFAFA` = ~3.0:1 (passes AA for large text / UI components; used for muted/hint text only)
