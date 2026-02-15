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

### 5.3 File Upload Drop Zone (Step 1)

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
- **Sections**: "API Keys" and "Provider & Model" separated by `Separator`
- **Info note**: Small info banner at top with `--info-muted` background and `Info` Lucide icon
- **API key inputs**: Password type with `Eye`/`EyeOff` toggle icon
- **Key status badge**: Small dot — green (`--success`) if key saved, gray (`--foreground-muted`) if empty
- **Warning badge**: `--warning` colored badge when selected provider has no key

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

- **Position**: Bottom-right
- **Background**: `--card`
- **Border**: `1px solid --border`
- **Duration**: 4 seconds (errors: 6 seconds)

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
| **File upload** | Centered in content area | Full width |
| **Transcript + Speakers** | Transcript full width, speakers below | Same, stacked |
| **Prompt Editor** | Template + language selectors inline | Stacked, full width |
| **Step 3 layout** | Two columns (transcript / summary) | Stacked, tab toggle between views |
| **Settings sheet** | `380px` slide-out | Full-width slide-out |
| **Action buttons** | Inline row | Stacked, full width |

---

## 12. Accessibility Notes

- All interactive elements must have visible focus rings (`--ring`)
- Color is never the sole indicator — always pair with icons or text
- Inputs must have associated labels
- Toast messages should use `aria-live` (handled by sonner)
- Minimum contrast ratio: 4.5:1 for text, 3:1 for large text and UI components
- `#FC520B` on `#0A0A0A` = ~5.2:1 contrast ratio (passes AA)
- `#FAFAFA` on `#0A0A0A` = ~19.5:1 contrast ratio (passes AAA)
