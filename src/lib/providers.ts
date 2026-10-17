import { estimatedWords } from "./captions";
import type {
  MediaSource,
  Provider,
  Transcript,
  TranscriptionSettings,
  Word,
} from "./types";
import { request } from "./transport";
export const providers: Record<
  Provider,
  { name: string; endpoint: string; models: string[] }
> = {
  openai: {
    name: "OpenAI",
    endpoint: "https://api.openai.com/v1/audio/transcriptions",
    models: [
      "gpt-transcribe",
      "gpt-4o-transcribe",
      "gpt-4o-mini-transcribe",
      "gpt-4o-transcribe-diarize",
      "whisper-1",
    ],
  },
  groq: {
    name: "Groq",
    endpoint: "https://api.groq.com/openai/v1/audio/transcriptions",
    models: ["whisper-large-v3", "whisper-large-v3-turbo"],
  },
  deepgram: {
    name: "Deepgram",
    endpoint: "https://api.deepgram.com/v1/listen",
    models: ["nova-3", "nova-2"],
  },
  custom: { name: "OpenAI compatible", endpoint: "", models: ["whisper-1"] },
};
export async function transcribe(
  source: MediaSource,
  settings: TranscriptionSettings,
  signal: AbortSignal,
): Promise<Transcript> {
  if (!settings.key.trim())
    throw new Error("Enter your provider API key in Connections.");
  if (source.blob.size > 24 * 1024 * 1024)
    throw new Error(
      "Audio exceeds the 24 MB upload limit. Select a shorter range or a smaller audio file.",
    );
  if (!source.duration || source.duration <= 0)
    throw new Error("Audio duration is unavailable. Load the source again.");
  const config = providers[settings.provider];
  const endpoint =
    settings.provider === "custom" ? settings.endpoint : config.endpoint;
  const url = new URL(endpoint);
  if (url.protocol !== "https:")
    throw new Error("Use an HTTPS endpoint to protect your API key and audio.");
  let response: Response;
  if (settings.provider === "deepgram") {
    url.search = new URLSearchParams({
      model: settings.model,
      smart_format: "true",
      punctuate: "true",
      ...(settings.language === "auto"
        ? { detect_language: "true" }
        : { language: settings.language }),
    }).toString();
    response = await request(url.toString(), {
      method: "POST",
      headers: {
        Authorization: `Token ${settings.key.trim()}`,
        "Content-Type": source.blob.type || "audio/wav",
      },
      body: source.blob,
      signal,
    });
  } else {
    const body = new FormData();
    const whisper =
      settings.provider === "groq" || settings.model.includes("whisper");
    const diarize = settings.model.includes("diarize");
    body.append(
      "file",
      source.blob,
      source.blob.type.includes("mpeg") ? "audio.mp3" : source.name,
    );
    body.append("model", settings.model);
    body.append(
      "response_format",
      whisper ? "verbose_json" : diarize ? "diarized_json" : "json",
    );
    if (whisper) body.append("timestamp_granularities[]", "word");
    if (diarize) body.append("chunking_strategy", "auto");
    if (settings.model === "gpt-transcribe") {
      const languages = [
        ...new Set([
          ...(settings.language === "auto" ? [] : [settings.language]),
          ...(settings.extraLanguages || "")
            .split(",")
            .map((v) => v.trim())
            .filter(Boolean),
        ]),
      ];
      languages.forEach((language) => body.append("languages[]", language));
      const keywords = (settings.keywords || "")
        .split("\n")
        .map((v) => v.trim())
        .filter(Boolean);
      if (keywords.some((v) => /[<>\r\n]/.test(v)))
        throw new Error(
          "Keywords cannot include < or >. Put each keyword on a separate line.",
        );
      keywords.forEach((keyword) => body.append("keywords[]", keyword));
    } else if (settings.language !== "auto")
      body.append("language", settings.language);
    if (!diarize) {
      if (settings.model !== "gpt-transcribe")
        body.append("temperature", String(settings.temperature));
      if (settings.prompt.trim()) body.append("prompt", settings.prompt);
    }
    response = await request(url.toString(), {
      method: "POST",
      headers: { Authorization: `Bearer ${settings.key.trim()}` },
      body,
      signal,
    });
  }
  if (!response.ok) {
    // Do not echo provider response bodies: custom servers could echo credentials.
    const hints: Record<number, string> = {
      401: "API key rejected. Check the key and provider.",
      403: "This key cannot use that model.",
      429: "Provider limit reached. Check your quota and retry later.",
      413: "Audio file is too large.",
      400: "Provider rejected the settings. Check model and language support.",
    };
    throw new Error(
      hints[response.status] ||
        `Transcription failed (HTTP ${response.status}). Retry or change provider.`,
    );
  }
  let data;
  try { data = await response.json(); }
  catch { throw new Error('Provider returned an invalid JSON response. Check the endpoint or choose another model.'); }
  const native =
    data.words || data.results?.channels?.[0]?.alternatives?.[0]?.words;
  if (Array.isArray(native) && native.length) {
    const words = native.map((w: Record<string, unknown>) => ({
      text: String(w.punctuated_word || w.word || ""),
      start: Number(w.start),
      end: Number(w.end),
    }));
    if (
      words.some(
        (w: Word, i: number) =>
          !w.text ||
          !Number.isFinite(w.start) ||
          !Number.isFinite(w.end) ||
          w.start < 0 ||
          w.end < w.start ||
          (i > 0 && w.start < words[i - 1].end - 0.05),
      )
    )
      throw new Error(
        "Provider returned invalid or overlapping word timestamps. Try another model.",
      );
    return { words, timing: "native" };
  }
  if (Array.isArray(data.segments) && data.segments.length) {
    // Segment boundaries are native; word positions within them are estimated.
    return {
      words: data.segments.flatMap(
        (s: { text: string; start: number; end: number }) =>
          estimatedWords(s.text, s.end - s.start).map((w) => ({
            ...w,
            start: w.start + s.start,
            end: w.end + s.start,
          })),
      ),
      timing: "estimated",
    };
  }
  if (typeof data.text !== "string" || !data.text.trim())
    throw new Error("No speech was returned. Check your audio and language.");
  return {
    words: estimatedWords(data.text, source.duration),
    timing: "estimated",
  };
}
