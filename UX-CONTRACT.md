# Vira interaction contract

## Sources and business context

| Concern             | Source                                                         | UI consequence                                                         |
| ------------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Product scope       | User brief                                                     | Premiere subtitles, providers, Farsi, readable open-source code        |
| API capabilities    | Provider docs linked in README                                 | GPT word timing is estimated; no unsupported timestamp parameters      |
| Credentials/privacy | Project decision: session memory only                          | Never serialize keys; one explicit Generate action uploads audio       |
| Billing             | Provider API contract                                          | Notice beside Generate; no automatic retries or hidden alignment calls |
| Import lifecycle    | Adobe Sequence and Track docs                                  | Verify sequence ID; native caption or styled raster overlay            |
| Data replacement    | Project decision: editable local projects                      | Warn on replacing dirty work; export before discarding                 |
| Deletion            | Local reversible operation                                     | Remove one cue, offer Undo; never delete disk assets on import         |
| Legal               | MIT for original source; dependency licenses remain applicable | Include notices with releases                                          |

## Canonical UI Map

| Capability      | Canonical owner                           | Source of truth           | Allowed variants               | Verification                                           |
| --------------- | ----------------------------------------- | ------------------------- | ------------------------------ | ------------------------------------------------------ |
| Select/Listbox  | Controls.Select and native export selects | DESIGN.md                 | native OS popup                | Browser keyboard and popup inspection                  |
| Form            | Controls and captions.validateCues        | provider/format contracts | configuration / inline cue     | unit + E2E invalid timing                              |
| Scrollbar       | styles.css global baseline                | DESIGN.md                 | transcript internal scroller   | narrow viewport E2E                                    |
| Toast           | App notification state                    | this contract             | success / error, persistent    | E2E failures + dismissal                               |
| Dialog          | App replacement dialog                    | this contract             | loss of unsaved captions       | Escape, focus, replacement E2E                         |
| Locale          | i18n.translate + document locale          | DESIGN.md                 | English / Persian              | RTL E2E                                                |
| Timeline import | premiere.ts / host/index.jsx              | Adobe docs                | caption track / raster overlay | mocked host tests; manual Premiere acceptance required |

## Workflow ledger

Generate → validate key/source → extract if needed → send one provider request → replace cues on success only. Preserve prior cues on error/cancel. Disable duplicate generation; Cancel aborts HTTP/FFmpeg. Premiere's synchronous export itself cannot be interrupted.

Edit → update local text/time immediately → mark dirty → preview follows selection → validate before export/reflow. Remove → retain previous cue array → Undo. Reflow → estimate words inside current cue boundaries → apply paragraph settings → label estimated.

Import SRT/project → parse and validate → if dirty non-sample captions exist, ask before replacing → restore focus on cancel. Project files never contain audio, API keys, endpoints, or prompts. They may preserve source sequence identity for safe reimport.

Export → validate all cue times and overlaps → native save dialog in Premiere / browser download otherwise. Native SRT import uses Premiere's own styling. Styled overlays are transparent image clips with text editable in Vira; they require an empty, visible, unlocked video track above existing footage and square pixels. Keep PNG/SRT assets on disk because Premiere references them. Roll back inserted overlay clips on failure; imported assets may remain in the project bin.

## Accessibility and recovery

Native buttons, selects, ranges, checkboxes, dialog, and inputs retain keyboard semantics. All icon actions have names. Search clear is immediate and local. Full interface locale/direction follows English/Persian selection; content direction is independent. Technical provider errors may retain English details until translated. Inputs and key survive navigation between screens within this session. No key persists across reloads.

Browser preview is explicit. It supports files, providers subject to CORS, editing, project import/export, and file export. Timeline actions require CEP and remain disabled outside Premiere. Sample cues and backdrop are labeled; adding sample cues directly to the timeline is disabled.

## Release acceptance

Automated unit/provider/host contract tests plus browser workflow checks run in CI. Premiere 24/25/26 macOS support is a target, not a certified matrix. Manual acceptance must verify export presets, real model calls, selected clip offsets, font shaping, and caption/overlay insertion on each supported host version. No paid API calls or Adobe runtime are part of the automated suite.
