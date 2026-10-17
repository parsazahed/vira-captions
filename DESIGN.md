---
version: alpha
name: Vira
description: A Persian-first subtitle editing desk for Premiere Pro.
colors:
  primary: "#c5b6fa"
  background: "#17191e"
  panel: "#1d2027"
  raised: "#252932"
  input: "#171a20"
  border: "#343943"
  text: "#f0f0f5"
  muted: "#a7abb8"
  faint: "#9097a8"
  primaryInk: "#252039"
  primaryDim: "#302d40"
  success: "#a1c9b7"
  warning: "#e5c08c"
  danger: "#f2acb1"
typography:
  sans:
    fontFamily: "Manrope Variable, Vazirmatn Variable, sans-serif"
  mono:
    fontFamily: "SFMono-Regular, Consolas, monospace"
rounded:
  DEFAULT: "8px"
  sm: "5px"
  md: "8px"
  lg: "12px"
spacing:
  section-gap: "18px"
  page-max: "1760px"
components:
  button: {}
  input: {}
  select: {}
  panel: {}
  dialog: {}
---

# Vira Design System

## Overview

### Creative North Star

An editor's quiet, precise grading desk. Lilac marks decisions, charcoal surfaces recede, and Persian typography takes center stage over an original vector mountain study. The signature is a large, editable Persian caption preview next to detailed typesetting controls.

### Product context and register

Product/tool for video editors, especially Persian speakers, on desktop macOS inside a resizable Premiere panel. English and Persian interface locales switch with full document direction. Subtitle content is multilingual independently of UI locale. No Japan-market business requirements are inferred from Japanese transcription support. All examples are visibly marked as sample data. Persian copy needs independent native review before public release.

The source is the user's brief and verified provider/Adobe contracts linked in README. This is a new repository without sibling UI. Workspace, Connections, and Guide share the same shell, fields, feedback, and typography. Avoid marketing hero patterns, neon-on-black contrast, or nested decorative cards.

Token ownership: this file documents the normative system; `src/styles.css :root` is its runtime implementation. primary → --accent, background → --canvas, border → --line, primaryInk → --accent-ink, primaryDim → --accent-dim; other color names map directly. Typography and radii map to --font, --mono, --radius and documented component rules. No generated theme adapters.

## Colors

Charcoal tonal layers distinguish canvas, panels, and inputs. Text uses the text/muted/faint hierarchy. Lavender is selection, focus, and primary action. Success means completed work; warning identifies estimated timing; danger identifies an error. Text accompanies every semantic color. Only dark mode is provided, with forced-color fallbacks.

## Typography

Manrope for English controls, Vazirmatn for Persian and preview captions, system mono for time. Font files are bundled, with no network requests. UI labels are intentionally compact for Premiere panels. Persian line height is generous. Subtitle text remains in logical Unicode order; never reverse its characters. Technical identifiers stay Latin.

## Layout

A 64px rail, 73px topbar, and three work columns: 247px setup / flexible editor / 242px appearance. At 1030px appearance becomes a horizontal settings area; at 740px it becomes a vertical desk with preview first. At 440px controls form a single column. Only the transcript has a bounded content scroller; settings follow natural document scrolling. All controls remain reachable at a 340px panel width.

## Elevation & Depth

Borders and tonal steps create hierarchy. Shadow is reserved for floating notifications and the replacement dialog. The preview has its own scenic tonal depth, explicitly labeled as a sample backdrop rather than live footage.

## Shapes

8px panels, 5px fields, 6px buttons, 12px dialog. The small waveform mark uses an 11px radius. Fine hairlines encode editable regions and workflow boundaries.

## Components

### Foundational visual states

Hover brightens controls; pressed state moves 1px. Focus-visible uses a 2px lavender outline. Selected source controls have an outline and dot. Busy actions retain geometry, communicate phase, and block duplicates. Disabled controls use opacity and native disabled semantics. Notifications persist until dismissed.

### Buttons and actions

Lavender primary means generate/add; neutral outline means save/export/open. Delete stays a quiet per-caption action with Undo. Before replacing unsaved non-sample captions, a dialog explains the loss and defaults to Cancel.

### Navigation and data display

The rail uses named buttons with current-page semantics. Sources use pressed button semantics. Caption indices select the preview; text fields edit content without moving keyboard focus. Timing is expressed in editable seconds. No searchable table or all-results selection exists.

### Forms and overlays

`Controls.tsx` owns Select, Slider, Toggle, Color, and Field. Select/Listbox is intentionally native: OS popup geometry, navigation, and accessibility are accepted in the CEP Chromium/browser context. App-owned dialog uses native dialog for trapping focus and restores the trigger. Textareas cannot resize; caption rows grow with hard line breaks and scroll for longer prose. Search includes a clear action. File inputs are reachable via labeled buttons. API key is masked, optionally revealed, and memory-only.

### Iconography

Lucide outline, 1.5–2px strokes, mostly 14–18px. Actions use text labels except familiar transport/rail utilities, which have accessible names and title hints.

### Motion

Only loading rotation and switch movement; reduced-motion rules eliminate animation. Playback is user-initiated. No ambient decoration.

### Content and data visualization

Plain, editing-specific labels. Counts localize to the interface. Provider names and model IDs preserve original spelling. Estimated timing is always labeled. The preview uses an original SVG backdrop with no implication of live timeline monitoring.

## Do's and Don'ts

- Do preserve Persian ZWNJ and mixed-script order.
- Do share controls and tokens across all three screens.
- Don't claim verified keys before a real transcription succeeds.
- Don't suggest that SRT retains visual styling.
