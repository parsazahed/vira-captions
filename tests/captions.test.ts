import { describe, expect, it } from "vitest";
import {
  ass,
  estimatedWords,
  makeCues,
  wordsFromCues,
  normalizePersian,
  parseSrt,
  srt,
  timecode,
  validateCues,
  vtt,
} from "../src/lib/captions";
import { defaultParagraph, defaultStyle } from "../src/lib/types";
import { readProject } from "../src/lib/project";
const cues = [
  { id: "1", start: 0.125, end: 2.75, text: "می‌روم به خانه\nVira 2026" },
];
describe("Persian caption integrity", () => {
  it("normalizes Arabic forms without destroying ZWNJ or Latin text", () =>
    expect(normalizePersian("مي‌روم كجا Vira 12")).toBe("می‌روم کجا Vira 12"));
  it("converts Latin and Arabic digits to Persian", () =>
    expect(normalizePersian("12 ٣٤", "persian")).toBe("۱۲ ۳۴"));
  it("converts Persian and Arabic digits to Latin", () =>
    expect(normalizePersian("۱۲ ٣٤", "latin")).toBe("12 34"));
  it("keeps logical Unicode order in an SRT round trip", () =>
    expect(parseSrt(srt(cues))[0]).toMatchObject({
      text: cues[0].text,
      start: 0.125,
      end: 2.75,
    }));
  it("parses BOM and Windows line endings", () =>
    expect(parseSrt("\uFEFF" + srt(cues).replace(/\n/g, "\r\n"))).toHaveLength(
      1,
    ));
});
describe("paragraphs and timing", () => {
  it("estimates words over the complete duration", () => {
    const words = estimatedWords("سلام دنیای ما", 6);
    expect(words[0].start).toBe(0);
    expect(words[words.length - 1]?.end).toBeCloseTo(6);
  });
  it("handles no speech", () => expect(estimatedWords(" ", 10)).toEqual([]));
  it("respects line limits and timeline offset", () => {
    const result = makeCues(
      estimatedWords("یک دو سه چهار پنج شش هفت", 7),
      { ...defaultParagraph, wordsPerLine: 2, maxLines: 2, maxDuration: 10 },
      12,
    );
    expect(result).toHaveLength(2);
    expect(result[0].start).toBe(12);
    expect(result.every((c) => c.text.split("\n").length <= 2)).toBe(true);
  });
  it("splits at a speech pause", () => {
    const result = makeCues(
      [
        { text: "سلام", start: 0, end: 1 },
        { text: "دنیا", start: 3, end: 4 },
      ],
      defaultParagraph,
    );
    expect(result).toHaveLength(2);
  });
  it("rejects overlap, negative times, empty text, and invalid times", () => {
    expect(validateCues([...cues, { ...cues[0], start: 2 }])).toContain(
      "overlap",
    );
    expect(validateCues([{ ...cues[0], start: -1 }])).toBeTruthy();
    expect(validateCues([{ ...cues[0], end: NaN }])).toBeTruthy();
    expect(validateCues([{ ...cues[0], text: " " }])).toBeTruthy();
  });
  it("rounds through minute/hour boundaries", () => {
    expect(timecode(59.9999)).toBe("00:01:00,000");
    expect(timecode(3599.9999)).toBe("01:00:00,000");
  });
});
describe("formats and project safety", () => {
  it("rejects malformed SRT with a useful block number", () =>
    expect(() => parseSrt("1\nwrong\nسلام")).toThrow("block 1"));
  it("escapes markup in WebVTT", () =>
    expect(vtt([{ ...cues[0], text: "<voice> & سلام" }])).toContain(
      "&lt;voice&gt; &amp; سلام",
    ));
  it("writes actual style in ASS and escapes injected overrides", () => {
    const result = ass(
      [{ ...cues[0], text: "{\\pos(0,0)}\nسلام" }],
      defaultStyle,
    );
    expect(result).toContain("Vazirmatn,56");
    expect(result).toContain("｛＼pos(0,0)｝\\Nسلام");
    expect(result).toContain("&H00FFFFFF");
  });
  it("validates projects and ignores untrusted style values", () => {
    const project = readProject(
      JSON.stringify({
        version: 1,
        cues,
        style: { size: 9999, font: "url(evil)", color: "red" },
        key: "do not load",
      }),
    );
    expect(project.style).toEqual(defaultStyle);
    expect(project).not.toHaveProperty("key");
  });
  it("rejects corrupt timing in project files", () =>
    expect(() =>
      readProject(
        JSON.stringify({ version: 1, cues: [{ ...cues[0], end: 0 }] }),
      ),
    ).toThrow());
});

describe("regrouping existing captions", () => {
  const text = "یک دو سه چهار پنج شش هفت هشت نه ده یازده دوازده";
  const words = text.split(" ").map((text, index) => ({
    text,
    start: index * 0.3,
    end: index * 0.3 + 0.2,
  }));
  it("combines single-word SRT cues into six-word lines without shifting their boundaries", () => {
    const imported = words.map((w, index) => ({ id: String(index), ...w }));
    const restored = wordsFromCues(imported);
    expect(restored.estimated).toBe(false);
    const result = parseSrt(
      srt(makeCues(restored.words, { ...defaultParagraph, maxLines: 1 })),
    );
    expect(result.map((c) => c.text.split(/\s+/).length)).toEqual([6, 6]);
    expect(result[0].start).toBe(words[0].start);
    expect(result[0].end).toBeCloseTo(words[5].end, 3);
    expect(result[1].start).toBeCloseTo(words[6].start, 3);
    expect(result[1].end).toBeCloseTo(words[11].end, 3);
  });
  it("removes embedded provider newlines before applying paragraph line breaks", () => {
    const dirty = words.map((word) => ({ ...word, text: `\n${word.text}\n` }));
    const result = makeCues(dirty, { ...defaultParagraph, maxLines: 1 });
    expect(result).toHaveLength(2);
    expect(result.every((cue) => !cue.text.includes("\n"))).toBe(true);
    expect(result[0].text.split(" ")).toHaveLength(6);
  });
  it("preserves edited text and ZWNJ while removing the old wrapping", () => {
    const result = wordsFromCues([
      { id: "1", start: 10, end: 13, text: "می‌روم\nبه خانه Vira" },
    ]);
    expect(result.estimated).toBe(true);
    expect(result.words.map((w) => w.text).join(" ")).toBe(
      "می‌روم به خانه Vira",
    );
    expect(result.words[0].start).toBe(10);
    expect(result.words[result.words.length - 1].end).toBeCloseTo(13);
  });
  it("keeps real long pauses when regrouping single-word cues", () => {
    const restored = wordsFromCues([
      { id: "1", start: 0, end: 0.2, text: "سلام" },
      { id: "2", start: 5, end: 5.2, text: "دنیا" },
    ]);
    expect(makeCues(restored.words, defaultParagraph)).toHaveLength(2);
  });
});
