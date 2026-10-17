import { defaultParagraph, defaultStyle } from "./types";
import type { CaptionStyle, Cue, ParagraphSettings } from "./types";
import { validateCues } from "./captions";
export function readProject(text: string): {
  cues: Cue[];
  style: CaptionStyle;
  paragraph: ParagraphSettings;
  sequenceId?: string;
} {
  const data = JSON.parse(text.replace(/^\uFEFF/, ""));
  if (
    data.version !== 1 ||
    !Array.isArray(data.cues) ||
    data.cues.length > 10000
  )
    throw new Error("Unsupported project. Choose a Vira version 1 project.");
  const cues = data.cues.map((c: Cue, i: number) => {
    if (
      typeof c.text !== "string" ||
      typeof c.start !== "number" ||
      typeof c.end !== "number"
    )
      throw new Error("Invalid caption data.");
    return { id: `project-${i}`, start: c.start, end: c.end, text: c.text };
  });
  const error = validateCues(cues);
  if (error) throw new Error(error);
  const style = { ...defaultStyle };
  const paragraph = { ...defaultParagraph };
  const finite = (v: unknown, min: number, max: number) =>
    typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;
  for (const key of ["color", "stroke", "background"] as const)
    if (/^#[0-9a-f]{6}$/i.test(data.style?.[key])) style[key] = data.style[key];
  for (const [key, min, max] of [
    ["size", 20, 120],
    ["weight", 400, 900],
    ["strokeWidth", 0, 8],
    ["shadow", 0, 16],
    ["lineHeight", 1, 2],
  ] as const)
    if (finite(data.style?.[key], min, max)) style[key] = data.style[key];
  for (const key of ["position", "align", "direction"] as const) {
    const valid = {
      position: ["top", "center", "bottom"],
      align: ["left", "center", "right"],
      direction: ["rtl", "ltr", "auto"],
    };
    if (valid[key].includes(data.style?.[key]))
      Object.assign(style, { [key]: data.style[key] });
  }
  if (
    [
      "Vazirmatn Variable",
      "Manrope Variable",
      "Arial",
      "Tahoma",
      "Georgia",
    ].includes(data.style?.font)
  )
    style.font = data.style.font;
  if (typeof data.style?.box === "boolean") style.box = data.style.box;
  for (const [key, min, max] of [
    ["wordsPerLine", 1, 12],
    ["maxLines", 1, 3],
    ["maxDuration", 1, 10],
    ["gap", 0.2, 2],
  ] as const)
    if (finite(data.paragraph?.[key], min, max))
      paragraph[key] = ["wordsPerLine", "maxLines"].includes(key)
        ? Math.round(data.paragraph[key])
        : data.paragraph[key];
  if (typeof data.paragraph?.normalize === "boolean")
    paragraph.normalize = data.paragraph.normalize;
  if (["original", "persian", "latin"].includes(data.paragraph?.digits))
    paragraph.digits = data.paragraph.digits;
  return {
    cues,
    style,
    paragraph,
    ...(typeof data.sequenceId === "string"
      ? { sequenceId: data.sequenceId }
      : {}),
  };
}
