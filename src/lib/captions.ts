import type { CaptionStyle, Cue, ParagraphSettings, Word } from "./types";

/** Keep Persian ZWNJ intact: it joins a written word without joining its glyphs. */
export function normalizePersian(
  text: string,
  digits: ParagraphSettings["digits"] = "original",
) {
  let value = text.replace(/ي/g, "ی").replace(/ك/g, "ک");
  if (digits === "persian")
    value = value.replace(
      /[0-9٠-٩]/g,
      (c) =>
        "۰۱۲۳۴۵۶۷۸۹"[
          c.charCodeAt(0) >= 1632 ? c.charCodeAt(0) - 1632 : Number(c)
        ],
    );
  if (digits === "latin")
    value = value.replace(/[۰-۹٠-٩]/g, (c) =>
      String(
        c.charCodeAt(0) >= 1776
          ? c.charCodeAt(0) - 1776
          : c.charCodeAt(0) - 1632,
      ),
    );
  return value;
}
export function estimatedWords(text: string, duration: number): Word[] {
  const tokens = text.trim().split(/\s+/).filter(Boolean);
  const total = tokens.reduce((n, word) => n + word.length, 0);
  let cursor = 0;
  return tokens.map((text) => {
    const start = cursor;
    cursor += (duration * text.length) / total;
    return { text, start, end: cursor };
  });
}
/** Rebuild words from edited/imported cues without retaining their old line breaks.
 * Single-word cues already have exact boundaries; longer cues need interpolation.
 */
export function wordsFromCues(cues: Cue[]): {
  words: Word[];
  estimated: boolean;
} {
  let estimated = false;
  const words = cues.flatMap((cue) => {
    const tokens = cue.text.trim().split(/\s+/).filter(Boolean);
    if (tokens.length === 1)
      return [{ text: tokens[0], start: cue.start, end: cue.end }];
    if (tokens.length > 1) estimated = true;
    return estimatedWords(cue.text, cue.end - cue.start).map((word) => ({
      ...word,
      start: word.start + cue.start,
      end: word.end + cue.start,
    }));
  });
  return { words, estimated };
}

export function makeCues(
  words: Word[],
  settings: ParagraphSettings,
  offset = 0,
): Cue[] {
  const groups: Word[][] = [];
  let group: Word[] = [];
  for (const input of words) {
    const word = { ...input, text: input.text.replace(/\s+/g, " ").trim() };
    if (!word.text) continue;
    const previous = group[group.length - 1];
    if (
      previous &&
      (group.length >= settings.wordsPerLine * settings.maxLines ||
        word.end - group[0].start > settings.maxDuration ||
        word.start - previous.end > settings.gap)
    ) {
      groups.push(group);
      group = [];
    }
    group.push(word);
    if (
      /[.!?؟。！]$/.test(word.text) &&
      group.length >= settings.wordsPerLine
    ) {
      groups.push(group);
      group = [];
    }
  }
  if (group.length) groups.push(group);
  return groups.map((group, index) => {
    const lines: string[] = [];
    for (let i = 0; i < group.length; i += settings.wordsPerLine)
      lines.push(
        group
          .slice(i, i + settings.wordsPerLine)
          .map((w) =>
            settings.normalize
              ? normalizePersian(w.text, settings.digits)
              : w.text,
          )
          .join(" "),
      );
    return {
      id: `cue-${index}`,
      start: group[0].start + offset,
      end: group[group.length - 1].end + offset,
      text: lines.join("\n"),
    };
  });
}
export function validateCues(cues: Cue[]): string | null {
  for (let i = 0; i < cues.length; i++) {
    const cue = cues[i];
    if (!cue.text.trim()) return `Caption ${i + 1}: enter some text.`;
    if (
      !Number.isFinite(cue.start) ||
      !Number.isFinite(cue.end) ||
      cue.start < 0 ||
      cue.end <= cue.start
    )
      return `Caption ${i + 1}: end must be after start, with non-negative times.`;
    if (i && cue.start < cues[i - 1].end - 0.001)
      return `Caption ${i + 1}: overlaps the previous caption. Adjust the times.`;
  }
  return null;
}
export function timecode(seconds: number, separator = ",") {
  const ms = Math.round(Math.max(0, seconds) * 1000);
  return `${String(Math.floor(ms / 3600000)).padStart(2, "0")}:${String(Math.floor(ms / 60000) % 60).padStart(2, "0")}:${String(Math.floor(ms / 1000) % 60).padStart(2, "0")}${separator}${String(ms % 1000).padStart(3, "0")}`;
}
export function srt(cues: Cue[]) {
  return (
    cues
      .map(
        (c, i) =>
          `${i + 1}\n${timecode(c.start)} --> ${timecode(c.end)}\n${c.text}`,
      )
      .join("\n\n") + "\n"
  );
}
export function vtt(cues: Cue[]) {
  return (
    "WEBVTT\n\n" +
    cues
      .map(
        (c) =>
          `${timecode(c.start, ".")} --> ${timecode(c.end, ".")}\n${c.text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}`,
      )
      .join("\n\n") +
    "\n"
  );
}
export function parseSrt(input: string): Cue[] {
  const blocks = input
    .replace(/^\uFEFF/, "")
    .replace(/\r/g, "")
    .trim()
    .split(/\n\s*\n/);
  const parseTime = (v: string) => {
    const [h, m, s, ms] = v.split(/[:,.]/).map(Number);
    return h * 3600 + m * 60 + s + ms / 1000;
  };
  const cues = blocks.map((block, index) => {
    const lines = block.split("\n");
    const timingIndex = lines.findIndex((l) => l.includes("-->"));
    const match = lines[timingIndex]?.match(
      /(\d{2,}:\d{2}:\d{2}[,.]\d{3})\s*-->\s*(\d{2,}:\d{2}:\d{2}[,.]\d{3})/,
    );
    if (!match) throw new Error(`Invalid SRT timing in block ${index + 1}.`);
    return {
      id: `import-${index}`,
      start: parseTime(match[1]),
      end: parseTime(match[2]),
      text: lines.slice(timingIndex + 1).join("\n"),
    };
  });
  const error = validateCues(cues);
  if (error) throw new Error(error);
  return cues;
}
const assColor = (hex: string) =>
  `&H00${hex.slice(5, 7)}${hex.slice(3, 5)}${hex.slice(1, 3)}`.toUpperCase();
const assTime = (s: number) => {
  const cs = Math.round(s * 100);
  return `${Math.floor(cs / 360000)}:${String(Math.floor(cs / 6000) % 60).padStart(2, "0")}:${String(Math.floor(cs / 100) % 60).padStart(2, "0")}.${String(cs % 100).padStart(2, "0")}`;
};
export function ass(cues: Cue[], style: CaptionStyle) {
  const alignment =
    { bottom: 1, center: 4, top: 7 }[style.position] +
    { left: 0, center: 1, right: 2 }[style.align];
  // Strip override delimiters: imported text must never become ASS commands.
  const escapeText = (s: string) =>
    s
      .replace(/\\/g, "＼")
      .replace(/{/g, "｛")
      .replace(/}/g, "｝")
      .replace(/\n/g, "\\N");
  return `[Script Info]\nTitle: Vira captions\nScriptType: v4.00+\nPlayResX: 1920\nPlayResY: 1080\nWrapStyle: 2\n\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\nStyle: Default,${style.font.replace(/ Variable$/, "").replace(/,/g, "")},${style.size},${assColor(style.color)},${assColor(style.color)},${assColor(style.box ? style.background : style.stroke)},${assColor(style.background)},${style.weight >= 600 ? -1 : 0},0,0,0,100,100,0,0,${style.box ? 3 : 1},${style.strokeWidth},${style.shadow},${alignment},96,96,80,1\n\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n${cues.map((c) => `Dialogue: 0,${assTime(c.start)},${assTime(c.end)},Default,,0,0,0,,${escapeText(c.text)}`).join("\n")}\n`;
}
