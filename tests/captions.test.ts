import { describe, expect, it } from "vitest";
import {
  ass,
  estimatedWords,
  makeCues,
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
