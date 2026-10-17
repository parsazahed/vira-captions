import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { transcribe } from "../src/lib/providers";
import type { MediaSource, TranscriptionSettings } from "../src/lib/types";
const source: MediaSource = {
  name: "test.wav",
  blob: new Blob(["audio"], { type: "audio/wav" }),
  duration: 10,
  offset: 0,
};
const settings: TranscriptionSettings = {
  provider: "openai",
  model: "gpt-4o-transcribe",
  key: "test-secret",
  language: "fa",
  prompt: "ویرا",
  temperature: 0,
  endpoint: "",
};
beforeEach(() => vi.stubGlobal("window", {}));
afterEach(() => vi.unstubAllGlobals());
const respond = (data: unknown, status = 200) => {
  const mock = vi.fn(
    async () => new Response(JSON.stringify(data), { status }),
  );
  vi.stubGlobal("fetch", mock);
  return mock;
};
describe("provider contracts", () => {
  it("uses supported GPT parameters and explicitly estimated timing", async () => {
    const mock = respond({ text: "سلام به دنیای ویرا" });
    const result = await transcribe(
      source,
      settings,
      new AbortController().signal,
    );
    const body = mock.mock.calls[0] as unknown as [string, RequestInit];
    const form = body[1].body as FormData;
    expect(form.get("response_format")).toBe("json");
    expect(form.has("timestamp_granularities[]")).toBe(false);
    expect(form.get("language")).toBe("fa");
    expect(result.timing).toBe("estimated");
    expect(result.words[result.words.length - 1]?.end).toBeCloseTo(10);
  });
  it("requests word timing only from Whisper", async () => {
    const mock = respond({ words: [{ word: "سلام", start: 1, end: 2 }] });
    const result = await transcribe(
      source,
      { ...settings, model: "whisper-1" },
      new AbortController().signal,
    );
    const body = mock.mock.calls[0] as unknown as [string, RequestInit];
    expect((body[1].body as FormData).get("response_format")).toBe(
      "verbose_json",
    );
    expect(result.timing).toBe("native");
  });
  it("omits unsupported prompts and temperature for diarization", async () => {
    const mock = respond({ segments: [{ text: "سلام", start: 2, end: 4 }] });
    const result = await transcribe(
      source,
      { ...settings, model: "gpt-4o-transcribe-diarize" },
      new AbortController().signal,
    );
    const body = mock.mock.calls[0] as unknown as [string, RequestInit];
    const form = body[1].body as FormData;
    expect(form.get("response_format")).toBe("diarized_json");
    expect(form.has("prompt")).toBe(false);
    expect(form.has("temperature")).toBe(false);
    expect(result.words[0].start).toBe(2);
    expect(result.timing).toBe("estimated");
  });
  it("normalizes Deepgram words and sends language", async () => {
    const mock = respond({
      results: {
        channels: [
          {
            alternatives: [
              {
                words: [
                  { word: "سلام", punctuated_word: "سلام!", start: 0, end: 1 },
                ],
              },
            ],
          },
        ],
      },
    });
    const result = await transcribe(
      source,
      { ...settings, provider: "deepgram", model: "nova-3" },
      new AbortController().signal,
    );
    const args = mock.mock.calls[0] as unknown as [string, RequestInit];
    expect(args[0]).toContain("language=fa");
    expect(result.words[0].text).toBe("سلام!");
  });
  it("rejects missing credentials before any upload", async () => {
    const mock = respond({});
    await expect(
      transcribe(
        source,
        { ...settings, key: "" },
        new AbortController().signal,
      ),
    ).rejects.toThrow("API key");
    expect(mock).not.toHaveBeenCalled();
  });
  it("rejects insecure custom endpoints before sending a key", async () => {
    const mock = respond({});
    await expect(
      transcribe(
        source,
        {
          ...settings,
          provider: "custom",
          endpoint: "http://localhost/transcribe",
        },
        new AbortController().signal,
      ),
    ).rejects.toThrow("HTTPS");
    expect(mock).not.toHaveBeenCalled();
  });
  it("does not echo potentially secret provider response bodies", async () => {
    respond({ error: "test-secret" }, 401);
    await expect(
      transcribe(source, settings, new AbortController().signal),
    ).rejects.toThrow("API key rejected");
  });
  it("rejects empty transcripts", async () => {
    respond({ text: "" });
    await expect(
      transcribe(source, settings, new AbortController().signal),
    ).rejects.toThrow("No speech");
  });
  it("rejects corrupt timestamps", async () => {
    respond({ words: [{ word: "سلام", start: "bad", end: 1 }] });
    await expect(
      transcribe(
        source,
        { ...settings, model: "whisper-1" },
        new AbortController().signal,
      ),
    ).rejects.toThrow("timestamps");
  });
});

describe("gpt-transcribe multilingual contract", () => {
  it("uses plural languages and keyword hints without legacy language or temperature fields", async () => {
    const mock = respond({ text: "سلام به Vira" });
    await transcribe(
      source,
      {
        ...settings,
        model: "gpt-transcribe",
        extraLanguages: "en, ar",
        keywords: "ویرا\nPremiere Pro",
      },
      new AbortController().signal,
    );
    const args = mock.mock.calls[0] as unknown as [string, RequestInit];
    const form = args[1].body as FormData;
    expect(form.getAll("languages[]")).toEqual(["fa", "en", "ar"]);
    expect(form.getAll("keywords[]")).toEqual(["ویرا", "Premiere Pro"]);
    expect(form.has("language")).toBe(false);
    expect(form.has("temperature")).toBe(false);
  });
});
