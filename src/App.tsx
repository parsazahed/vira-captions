import { TranscriptPanel } from "./components/TranscriptPanel";
import { Guide } from "./components/Guide";
import { AppearancePanel } from "./components/AppearancePanel";
import { useEffect, useRef, useState } from "react";
import {
  AudioLines,
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  CircleHelp,
  FileAudio,
  Film,
  FolderOpen,
  Globe2,
  KeyRound,
  Layers3,
  LoaderCircle,
  Maximize2,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Settings2,
  ShieldCheck,
  Sparkles,
  Subtitles,
  Upload,
  X,
  Eye,
  EyeOff,
  Save,
} from "lucide-react";
import { Field, Select, Slider, Toggle } from "./components/Controls";
import {
  ass,
  estimatedWords,
  makeCues,
  parseSrt,
  srt,
  timecode,
  validateCues,
  vtt,
} from "./lib/captions";
import { languages, translate } from "./lib/i18n";
import {
  addToTimeline,
  addStyledOverlays,
  choosePreset,
  download,
  extractAudio,
  getSequence,
  inPremiere,
} from "./lib/premiere";
import type { SequenceInfo } from "./lib/premiere";
import { providers, transcribe } from "./lib/providers";
import { readProject } from "./lib/project";
import { defaultParagraph, defaultStyle } from "./lib/types";
import type {
  CaptionStyle,
  Cue,
  Locale,
  MediaSource,
  ParagraphSettings,
  Provider,
  TranscriptionSettings,
} from "./lib/types";

const sample: Cue[] = [
  {
    id: "sample-0",
    start: 0,
    end: 3.8,
    text: "هر داستان، با یک صدا\nآغاز می‌شود.",
  },
  {
    id: "sample-1",
    start: 4,
    end: 7.2,
    text: "صدایی که از مرز واژه‌ها\nعبور می‌کند.",
  },
  {
    id: "sample-2",
    start: 7.4,
    end: 11.5,
    text: "و ما را به دنیای\nیکدیگر نزدیک‌تر می‌کند.",
  },
  {
    id: "sample-3",
    start: 11.7,
    end: 15.5,
    text: "داستان خودت را\nبه زبان خودت بگو.",
  },
];
export default function App() {
  const [locale, setLocale] = useState<Locale>("en");
  const t = (s: string) => translate(locale, s);
  const [page, setPage] = useState("workspace");
  const [cues, setCues] = useState<Cue[]>(sample);
  const [isSample, setIsSample] = useState(true);
  const [style, setStyle] = useState(defaultStyle);
  const [paragraph, setParagraph] = useState(defaultParagraph);
  const [settings, setSettings] = useState<TranscriptionSettings>({
    provider: "openai",
    model: "gpt-transcribe",
    key: "",
    endpoint: "",
    language: "fa",
    prompt: "",
    temperature: 0,
  });
  const keyMemory = useRef<Partial<Record<Provider, string>>>({});
  const [sourceMode, setSourceMode] = useState<
    "sequence" | "range" | "clip" | "file"
  >(inPremiere() ? "sequence" : "file");
  const [source, setSource] = useState<MediaSource>();
  const [sequence, setSequence] = useState<SequenceInfo>();
  const [sequenceId, setSequenceId] = useState<string>();
  const [preset, setPreset] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [timing, setTiming] = useState<"native" | "estimated" | "imported">(
    "imported",
  );
  const [active, setActive] = useState(0);
  const [format, setFormat] = useState("srt");
  const [timelineMode, setTimelineMode] = useState("captions");
  const [notice, setNotice] = useState<{ text: string; error?: boolean }>();
  const [phase, setPhase] = useState("");
  const busy = Boolean(phase);
  const controller = useRef<AbortController | null>(null);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [safeArea, setSafeArea] = useState(false);
  const [undo, setUndo] = useState<Cue[] | null>(null);
  const [dirty, setDirty] = useState(false);
  const [replacement, setReplacement] = useState<(() => void) | null>(null);
  const audioInput = useRef<HTMLInputElement>(null);
  const srtInput = useRef<HTMLInputElement>(null);
  const projectInput = useRef<HTMLInputElement>(null);
  const player = useRef<HTMLAudioElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const restoreFocus = useRef<HTMLElement | null>(null);
  const studio = useRef<HTMLDivElement>(null);
  const [previewWidth, setPreviewWidth] = useState(640);
  useEffect(() => {
    const frame = studio.current?.querySelector(".preview-frame");
    if (!frame) return;
    const observer = new ResizeObserver((entries) =>
      setPreviewWidth(entries[0].contentRect.width),
    );
    observer.observe(frame);
    return () => observer.disconnect();
  }, [page]);
  const hostAvailable = inPremiere();
  const updateStyle = <K extends keyof CaptionStyle>(
    key: K,
    value: CaptionStyle[K],
  ) => {
    setStyle((s) => ({ ...s, [key]: value }));
    setDirty(true);
  };
  const updateParagraph = <K extends keyof ParagraphSettings>(
    key: K,
    value: ParagraphSettings[K],
  ) => {
    setParagraph((s) => ({ ...s, [key]: value }));
    setDirty(true);
  };
  const updateSettings = <K extends keyof TranscriptionSettings>(
    key: K,
    value: TranscriptionSettings[K],
  ) => setSettings((s) => ({ ...s, [key]: value }));
  const notify = (text: string, error = false) => setNotice({ text, error });
  const errorText = (e: unknown) =>
    e instanceof Error ? e.message : "An unexpected error occurred. Try again.";
  const refresh = async () => {
    try {
      setSequence(await getSequence());
    } catch (e) {
      notify(errorText(e), true);
    }
  };
  useEffect(() => {
    if (hostAvailable) void refresh();
  }, []);
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === "fa" ? "rtl" : "ltr";
    document.title = `Vira — ${t("Subtitle studio")}`;
  }, [locale]);
  useEffect(() => {
    const beforeUnload = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [dirty]);
  useEffect(
    () => () => {
      if (source?.previewUrl) URL.revokeObjectURL(source.previewUrl);
    },
    [source],
  );
  useEffect(() => {
    if (replacement) {
      restoreFocus.current = document.activeElement as HTMLElement;
      dialog.current?.showModal();
    } else if (dialog.current?.open) {
      dialog.current.close();
      restoreFocus.current?.focus();
    }
  }, [replacement]);
  const duration = Math.max(
    source?.duration ? source.duration + source.offset : 0,
    cues[cues.length - 1]?.end || 0,
    1,
  );
  useEffect(() => {
    if (!playing) return;
    if (player.current && sourceMode === "file" && source?.previewUrl) {
      void player.current.play().catch(() => setPlaying(false));
      return () => {
        player.current?.pause();
      };
    }
    let last = performance.now();
    const timer = setInterval(() => {
      const now = performance.now();
      const delta = (now - last) / 1000;
      last = now;
      setPosition((p) => {
        if (p + delta >= duration) {
          setPlaying(false);
          return 0;
        }
        return p + delta;
      });
    }, 50);
    return () => clearInterval(timer);
  }, [playing, duration, sourceMode, source]);
  const visibleCue = cues.find((c) => position >= c.start && position < c.end);
  function selectCue(index: number) {
    setActive(index);
    setPosition(cues[index]?.start || 0);
    if (player.current)
      player.current.currentTime = Math.max(
        0,
        (cues[index]?.start || 0) - (source?.offset || 0),
      );
  }
  function switchProvider(provider: Provider) {
    keyMemory.current[settings.provider] = settings.key;
    setSettings((s) => ({
      ...s,
      provider,
      model: providers[provider].models[0],
      key: keyMemory.current[provider] || "",
      endpoint: providers[provider].endpoint,
    }));
  }
  function replace(action: () => void) {
    if (dirty) setReplacement(() => action);
    else action();
  }
  async function loadAudio(file?: File) {
    if (!file) return;
    if (file.size > 24 * 1024 * 1024)
      return notify("Audio exceeds 24 MB. Choose a smaller file.", true);
    if (!/\.(mp3|wav|m4a|flac|ogg|webm|mp4)$/i.test(file.name))
      return notify(
        "Choose an MP3, WAV, M4A, FLAC, OGG, or WebM audio file.",
        true,
      );
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    audio.preload = "metadata";
    const timeout = setTimeout(() => {
      audio.removeAttribute("src");
      URL.revokeObjectURL(url);
      notify("Audio metadata timed out. Try MP3 or WAV.", true);
    }, 15000);
    audio.onloadedmetadata = () => {
      clearTimeout(timeout);
      if (!Number.isFinite(audio.duration) || audio.duration <= 0) {
        URL.revokeObjectURL(url);
        return notify("Cannot read audio duration. Try MP3 or WAV.", true);
      }
      setSource({
        name: file.name,
        duration: audio.duration,
        offset: 0,
        blob: file,
        previewUrl: url,
      });
      setSourceMode("file");
      setPlaying(false);
      notify("Audio loaded.");
      audio.removeAttribute("src");
    };
    audio.onerror = () => {
      clearTimeout(timeout);
      URL.revokeObjectURL(url);
      notify("Cannot decode this audio. Try MP3 or WAV.", true);
    };
    audio.src = url;
  }
  async function generate() {
    if (busy) return;
    if (!settings.key.trim()) {
      setPage("connections");
      notify("Enter your provider API key in Connections.", true);
      return;
    }
    if (sourceMode === "file" && !source)
      return notify("Choose an audio file first.", true);
    controller.current = new AbortController();
    const signal = controller.current.signal;
    setPlaying(false);
    try {
      let media = source;
      if (sourceMode !== "file") {
        setPhase("Extracting audio…");
        media = await extractAudio(sourceMode, signal);
      }
      if (!media) throw new Error("Choose an audio file first.");
      setPhase("Transcribing…");
      const result = await transcribe(media, settings, signal);
      if (signal.aborted) return;
      const next = makeCues(result.words, paragraph, media.offset);
      const validation = validateCues(next);
      if (validation) throw new Error(validation);
      if (!next.length)
        throw new Error("No speech was returned. Check the audio.");
      setUndo(cues);
      setCues(next);
      setSequenceId(media.sequenceId);
      setActive(0);
      setPosition(next[0].start);
      setIsSample(false);
      setTiming(result.timing);
      setDirty(true);
      notify("Subtitles generated.");
    } catch (e) {
      notify(
        signal.aborted
          ? "Canceled. Your previous captions are preserved."
          : errorText(e),
        !signal.aborted,
      );
    } finally {
      setPhase("");
      controller.current = null;
    }
  }
  async function importFile(file: File | undefined, type: "srt" | "project") {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024)
      return notify("Project or SRT must be smaller than 5 MB.", true);
    try {
      const text = await file.text();
      const project = type === "project" ? readProject(text) : null;
      const next = project ? project.cues : parseSrt(text);
      replace(() => {
        setUndo(cues);
        setCues(next);
        if (project) {
          setStyle(project.style);
          setParagraph(project.paragraph);
        }
        setSequenceId(project?.sequenceId);
        setIsSample(false);
        setTiming("imported");
        setActive(0);
        setPlaying(false);
        setPosition(next[0]?.start || 0);
        setDirty(type !== "project");
        notify(type === "project" ? "Project opened." : "SRT imported.");
      });
    } catch (e) {
      notify(errorText(e), true);
    }
  }
  function editCue(id: string, update: Partial<Cue>) {
    setCues((current) =>
      current.map((c) => (c.id === id ? { ...c, ...update } : c)),
    );
    setDirty(true);
  }
  async function exportFile(timeline = false) {
    const error = validateCues(cues);
    if (error) return notify(error, true);
    if (!cues.length) return;
    try {
      if (timeline) {
        setPhase("Working…");
        if (timelineMode === "overlays")
          await addStyledOverlays(cues, style, sequenceId);
        else await addToTimeline(srt(cues), sequenceId);
        notify(
          timelineMode === "overlays"
            ? "Styled overlays added to Premiere."
            : "Caption track added to Premiere.",
        );
      } else if (
        await download(
          format === "ass"
            ? ass(cues, style)
            : format === "vtt"
              ? vtt(cues)
              : srt(cues),
          `vira-captions.${format}`,
        )
      )
        notify("File exported.");
    } catch (e) {
      notify(errorText(e), true);
    } finally {
      setPhase("");
    }
  }
  async function saveProject() {
    const error = validateCues(cues);
    if (error) return notify(error, true);
    try {
      if (
        await download(
          JSON.stringify(
            { version: 1, cues, style, paragraph, sequenceId },
            null,
            2,
          ),
          "vira-project.json",
          "application/json",
        )
      ) {
        setDirty(false);
        notify("Project saved.");
      }
    } catch (e) {
      notify(errorText(e), true);
    }
  }
  function reflow() {
    const error = validateCues(cues);
    if (error) return notify(error, true);
    setUndo(cues);
    setCues(
      makeCues(
        cues.flatMap((c) =>
          estimatedWords(c.text, c.end - c.start).map((w) => ({
            ...w,
            start: w.start + c.start,
            end: w.end + c.start,
          })),
        ),
        paragraph,
      ),
    );
    setActive(0);
    setTiming("estimated");
    setDirty(true);
    notify("Captions reflowed. Timing needs review.");
  }
  return (
    <div className="app-shell">
      <aside className="rail" aria-label="Vira">
        <button
          className="brand"
          aria-label="Vira"
          onClick={() => setPage("workspace")}
        >
          <AudioLines size={25} />
        </button>
        <div className="rail-nav">
          {[
            ["workspace", Subtitles, "Workspace"],
            ["connections", KeyRound, "Connections"],
          ].map(([id, Icon, label]) => {
            const I = Icon as typeof Subtitles;
            return (
              <button
                key={id as string}
                className={page === id ? "rail-button selected" : "rail-button"}
                title={t(label as string)}
                aria-label={t(label as string)}
                aria-current={page === id ? "page" : undefined}
                onClick={() => setPage(id as string)}
              >
                <I size={21} />
              </button>
            );
          })}
        </div>
        <button
          className={`rail-button guide-button ${page === "guide" ? "selected" : ""}`}
          title={t("Guide")}
          aria-label={t("Guide")}
          onClick={() => setPage("guide")}
        >
          <CircleHelp size={21} />
        </button>
        <span className="version">0.1</span>
      </aside>
      <div className="app-body">
        <header className="topbar">
          <div className="wordmark">
            vira<span className="wordmark-dot">.</span>
            <span className="product-name">{t("Subtitle studio")}</span>
          </div>
          <div className="header-actions">
            <span className="host-state">
              <span
                className={
                  hostAvailable ? "status-dot connected" : "status-dot"
                }
              />
              {t(hostAvailable ? "Premiere connected" : "Browser preview")}
            </span>
            <button
              className="locale-button"
              onClick={() => setLocale(locale === "en" ? "fa" : "en")}
              aria-label={t("Interface language")}
            >
              <Globe2 size={15} />
              <span>{locale === "en" ? "فارسی" : "English"}</span>
            </button>
          </div>
        </header>
        {page === "workspace" ? (
          <>
            <div className="workspace-heading">
              <div>
                <div className="eyebrow">
                  <span className="tiny-line" />
                  {t("Your voice. Every language.")}
                </div>
                <h1>{t("Make every word matter.")}</h1>
                <p>
                  {t(
                    "Transcribe, refine, and bring your subtitles into the edit.",
                  )}
                </p>
              </div>
              <div className="project-actions">
                <button
                  className="icon-button"
                  title={t("Open project")}
                  aria-label={t("Open project")}
                  disabled={busy}
                  onClick={() => projectInput.current?.click()}
                >
                  <FolderOpen size={17} />
                </button>
                <button className="button secondary" onClick={saveProject}>
                  <Save size={15} />
                  <span>
                    {t("Save project")}
                    {dirty ? " •" : ""}
                  </span>
                </button>
              </div>
            </div>
            <div className="workspace-grid">
              <aside className="setup-panel panel">
                <section>
                  <h2>
                    <span className="section-icon">
                      <AudioLines size={16} />
                    </span>
                    {t("Audio source")}
                  </h2>
                  <div className="source-options">
                    {[
                      ["sequence", Layers3, "Active sequence"],
                      ["range", Maximize2, "In / Out range"],
                      ["clip", Film, "Selected clip"],
                      ["file", FileAudio, "Audio file"],
                    ].map(([id, Icon, label]) => {
                      const I = Icon as typeof Film;
                      return (
                        <button
                          key={id as string}
                          aria-pressed={sourceMode === id}
                          className={`source-option ${sourceMode === id ? "active" : ""}`}
                          disabled={busy || (!hostAvailable && id !== "file")}
                          onClick={() => {
                            setSourceMode(id as typeof sourceMode);
                            setPlaying(false);
                          }}
                          title={
                            !hostAvailable && id !== "file"
                              ? t("Open in Premiere for timeline access.")
                              : undefined
                          }
                        >
                          <I size={16} />
                          <span>{t(label as string)}</span>
                          {sourceMode === id && (
                            <span className="selected-mark" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                  {sourceMode === "file" ? (
                    <button
                      className={`audio-upload ${source ? "has-file" : ""}`}
                      onClick={() => audioInput.current?.click()}
                      disabled={busy}
                    >
                      <Upload size={19} />
                      <span>{source?.name || t("Choose audio")}</span>
                      <small>
                        {source
                          ? `${timecode(source.duration, ".").slice(3, 8)} · ${(source.blob.size / 1048576).toFixed(1)} MB`
                          : t("MP3, WAV, M4A, FLAC, OGG · up to 24 MB")}
                      </small>
                    </button>
                  ) : (
                    <div className="sequence-card">
                      <Film size={17} />
                      <span>
                        {sequence?.name || t("Open a sequence in Premiere")}
                      </span>
                      <button
                        className="icon-button"
                        aria-label={t("Refresh sequence")}
                        onClick={refresh}
                      >
                        <RefreshCw size={14} />
                      </button>
                    </div>
                  )}
                </section>
                <section>
                  <h2>
                    <span className="section-icon">
                      <Sparkles size={16} />
                    </span>
                    {t("Speech engine")}
                    <button
                      className="section-action"
                      aria-label={t("Connections")}
                      onClick={() => setPage("connections")}
                    >
                      <Settings2 size={15} />
                    </button>
                  </h2>
                  <Select
                    label={t("Provider")}
                    value={settings.provider}
                    onChange={(v) => switchProvider(v as Provider)}
                    options={Object.entries(providers).map(([id, p]) => [
                      id,
                      p.name,
                    ])}
                    disabled={busy}
                  />
                  {settings.provider === "custom" ? (
                    <Field label={t("Custom model ID")}>
                      <input
                        aria-label={t("Custom model ID")}
                        value={settings.model}
                        onChange={(e) =>
                          updateSettings("model", e.target.value)
                        }
                      />
                    </Field>
                  ) : (
                    <Select
                      label={t("Model")}
                      value={settings.model}
                      onChange={(v) => updateSettings("model", v)}
                      options={providers[settings.provider].models.map((v) => [
                        v,
                        v,
                      ])}
                      disabled={busy}
                    />
                  )}
                  <div className="engine-note">
                    <span className="mini-badge">
                      {settings.model.includes("whisper") ||
                      settings.provider === "deepgram"
                        ? "TIMED"
                        : settings.model.includes("diarize")
                          ? "SEGMENTS"
                          : "GPT"}
                    </span>
                    <span>
                      {t(
                        settings.model.includes("whisper") ||
                          settings.provider === "deepgram"
                          ? "Provider timestamps"
                          : "Estimated timing · review before exporting",
                      )}
                    </span>
                  </div>
                </section>
                <section>
                  <h2>
                    <span className="section-icon">
                      <Globe2 size={16} />
                    </span>
                    {t("Language & paragraphs")}
                  </h2>
                  <Select
                    label={t("Spoken language")}
                    value={settings.language}
                    onChange={(v) => updateSettings("language", v)}
                    options={languages.map(([v, l]) => [v, t(l)])}
                    disabled={busy}
                  />
                  <div className="two-fields">
                    <Select
                      label={t("Words per line")}
                      value={paragraph.wordsPerLine}
                      onChange={(v) => updateParagraph("wordsPerLine", +v)}
                      options={Array.from({ length: 12 }, (_, i) => [
                        String(i + 1),
                        String(i + 1),
                      ])}
                    />
                    <Select
                      label={t("Maximum lines")}
                      value={paragraph.maxLines}
                      onChange={(v) => updateParagraph("maxLines", +v)}
                      options={["1", "2", "3"].map((v) => [v, v])}
                    />
                  </div>
                  <details>
                    <summary>
                      {t("Advanced settings")}
                      <ChevronDown size={14} />
                    </summary>
                    <Slider
                      label={t("Maximum duration")}
                      value={paragraph.maxDuration}
                      min={1}
                      max={10}
                      step={0.5}
                      unit="s"
                      onChange={(v) => updateParagraph("maxDuration", v)}
                    />
                    <Slider
                      label={t("Pause threshold")}
                      value={paragraph.gap}
                      min={0.2}
                      max={2}
                      step={0.1}
                      unit="s"
                      onChange={(v) => updateParagraph("gap", v)}
                    />
                    <Toggle
                      label={t("Normalize Persian ی / ک")}
                      value={paragraph.normalize}
                      onChange={(v) => updateParagraph("normalize", v)}
                    />
                    <Select
                      label={t("Digits")}
                      value={paragraph.digits}
                      onChange={(v) =>
                        updateParagraph(
                          "digits",
                          v as ParagraphSettings["digits"],
                        )
                      }
                      options={["original", "persian", "latin"].map((v, i) => [
                        v,
                        t(["Keep original", "Persian ۰۱۲", "Latin 012"][i]),
                      ])}
                    />
                    {settings.provider !== "deepgram" && (
                      <Field label={t("Vocabulary & context")}>
                        <textarea
                          className="resize-none"
                          rows={3}
                          aria-label={t("Vocabulary & context")}
                          placeholder={t(
                            "Names, terminology, and spelling hints…",
                          )}
                          value={settings.prompt}
                          onChange={(e) =>
                            updateSettings("prompt", e.target.value)
                          }
                          disabled={settings.model.includes("diarize")}
                        />
                      </Field>
                    )}
                    {settings.model === "gpt-transcribe" && (
                      <>
                        <Field
                          label={t("Keywords")}
                          hint={t(
                            "One term per line. Hints improve names and specialized vocabulary.",
                          )}
                        >
                          <textarea
                            className="resize-none"
                            rows={3}
                            aria-label={t("Keywords")}
                            value={settings.keywords || ""}
                            onChange={(e) =>
                              updateSettings("keywords", e.target.value)
                            }
                            placeholder="ویرا\nPremiere Pro"
                          />
                        </Field>
                        <Field
                          label={t("Additional spoken languages")}
                          hint={t(
                            "Comma-separated codes for multilingual audio, for example en, ar.",
                          )}
                        >
                          <input
                            aria-label={t("Additional spoken languages")}
                            value={settings.extraLanguages || ""}
                            onChange={(e) =>
                              updateSettings("extraLanguages", e.target.value)
                            }
                            placeholder="en, ar"
                            dir="ltr"
                          />
                        </Field>
                      </>
                    )}
                    {settings.provider !== "deepgram" &&
                      settings.model !== "gpt-transcribe" &&
                      !settings.model.includes("diarize") && (
                        <Slider
                          label={t("Temperature")}
                          value={settings.temperature}
                          min={0}
                          max={1}
                          step={0.1}
                          onChange={(v) => updateSettings("temperature", v)}
                        />
                      )}
                  </details>
                </section>
                <div className="generate-area">
                  <button
                    className="button primary generate"
                    disabled={busy}
                    onClick={() => replace(() => void generate())}
                  >
                    {busy ? (
                      <LoaderCircle size={17} className="spin" />
                    ) : (
                      <Sparkles size={17} />
                    )}
                    <span>{t(phase || "Generate subtitles")}</span>
                    {!busy && <ArrowRight size={16} />}
                  </button>
                  {busy && controller.current && (
                    <button
                      className="button text-button"
                      onClick={() => controller.current?.abort()}
                    >
                      {t("Cancel")}
                    </button>
                  )}
                  <p>
                    <ShieldCheck size={12} />
                    {t(
                      "Audio is sent to your selected provider. API usage may be billed.",
                    )}
                  </p>
                </div>
              </aside>
              <main className="editor-column">
                <section className="preview-panel panel" ref={studio}>
                  <div className="panel-heading">
                    <h2>{t("Preview")}</h2>
                    <span className="preview-label" dir="ltr">
                      1920 × 1080<span>16:9</span>
                    </span>
                  </div>
                  <div className="preview-frame">
                    <svg
                      className="landscape"
                      viewBox="0 0 960 540"
                      preserveAspectRatio="xMidYMid slice"
                      role="img"
                      aria-label={t("Sample backdrop")}
                    >
                      <defs>
                        <linearGradient id="sky" x2="0" y2="1">
                          <stop stopColor="#444859" />
                          <stop offset=".65" stopColor="#9b8794" />
                          <stop offset="1" stopColor="#cfac9d" />
                        </linearGradient>
                        <linearGradient id="mountain" x2=".4" y2="1">
                          <stop stopColor="#434653" />
                          <stop offset="1" stopColor="#202a32" />
                        </linearGradient>
                        <filter id="haze">
                          <feGaussianBlur stdDeviation="12" />
                        </filter>
                      </defs>
                      <rect width="960" height="540" fill="url(#sky)" />
                      <circle
                        cx="670"
                        cy="150"
                        r="43"
                        fill="#e4c6b0"
                        opacity=".78"
                      />
                      <path
                        d="M0 310L120 246 219 286 360 175 483 267 570 216 749 317 850 240 960 290V540H0Z"
                        fill="#716c7a"
                      />
                      <path
                        d="M0 380L169 305 280 334 417 236 508 305 570 282 729 378 900 294 960 322V540H0Z"
                        fill="#555b68"
                      />
                      <path
                        d="M0 420Q250 340 480 396T960 400"
                        stroke="#b4a4b2"
                        strokeWidth="38"
                        opacity=".2"
                        fill="none"
                        filter="url(#haze)"
                      />
                      <path
                        d="M0 378L125 420 251 361 325 393 457 306 550 390 663 354 759 403 900 355 960 376V540H0Z"
                        fill="url(#mountain)"
                      />
                      <path
                        d="M0 480L189 435 360 487 538 420 740 484 960 420V540H0Z"
                        fill="#17222b"
                      />
                    </svg>
                    <span className="backdrop-tag">{t("Sample backdrop")}</span>
                    {safeArea && <div className="safe-area" />}
                    <div
                      className={`caption-overlay position-${style.position}`}
                      style={{ textAlign: style.align }}
                    >
                      <span
                        dir={style.direction}
                        style={{
                          fontFamily: style.font,
                          fontSize: `${(style.size * previewWidth) / 1920}px`,
                          fontWeight: style.weight,
                          color: style.color,
                          lineHeight: style.lineHeight,
                          WebkitTextStroke: `${style.strokeWidth / 3}px ${style.stroke}`,
                          paintOrder: "stroke fill",
                          textShadow: style.shadow
                            ? `0 ${style.shadow / 3}px ${style.shadow}px #000`
                            : "none",
                          background: style.box ? style.background : undefined,
                          padding: style.box ? "2px 12px" : undefined,
                          boxDecorationBreak: "clone",
                        }}
                      >
                        {visibleCue?.text ||
                          (!cues.length
                            ? locale === "fa"
                              ? "هر داستان، با یک صدا آغاز می‌شود."
                              : "Every story begins with a voice."
                            : "")}
                      </span>
                    </div>
                  </div>
                  <div className="transport">
                    <div className="playback-buttons">
                      <button
                        className="icon-button"
                        aria-label={t("Previous caption")}
                        disabled={!cues.length || active === 0}
                        onClick={() => selectCue(Math.max(0, active - 1))}
                      >
                        <ArrowLeft size={15} />
                      </button>
                      <button
                        className="play-button"
                        aria-label={t(
                          playing ? "Pause preview" : "Play preview",
                        )}
                        onClick={() => setPlaying(!playing)}
                      >
                        {playing ? (
                          <Pause size={14} fill="currentColor" />
                        ) : (
                          <Play size={14} fill="currentColor" />
                        )}
                      </button>
                      <button
                        className="icon-button"
                        aria-label={t("Next caption")}
                        disabled={active >= cues.length - 1}
                        onClick={() =>
                          selectCue(Math.min(cues.length - 1, active + 1))
                        }
                      >
                        <ArrowRight size={15} />
                      </button>
                    </div>
                    <span className="time-display" dir="ltr">
                      {timecode(position, ".").slice(0, 8)}
                      <span> / {timecode(duration, ".").slice(0, 8)}</span>
                    </span>
                    <div className="transport-end">
                      <button
                        className={`icon-button ${safeArea ? "toggled" : ""}`}
                        aria-label={t("Safe area")}
                        title={t("Safe area")}
                        aria-pressed={safeArea}
                        onClick={() => setSafeArea(!safeArea)}
                      >
                        <Maximize2 size={15} />
                      </button>
                      <span className="quality-badge">HD</span>
                    </div>
                  </div>
                  <div className="scrubber">
                    <input
                      aria-label={t("Preview")}
                      type="range"
                      min={0}
                      max={duration}
                      step={0.01}
                      value={position}
                      onChange={(e) => {
                        const p = +e.target.value;
                        setPosition(p);
                        const index = cues.findIndex(
                          (c) => p >= c.start && p < c.end,
                        );
                        if (index >= 0) setActive(index);
                        if (player.current) player.current.currentTime = p;
                      }}
                    />
                  </div>
                  {source?.previewUrl && (
                    <audio
                      ref={player}
                      src={source.previewUrl}
                      onTimeUpdate={(e) =>
                        setPosition(e.currentTarget.currentTime)
                      }
                      onEnded={() => setPlaying(false)}
                    />
                  )}
                </section>
                <TranscriptPanel
                  t={t}
                  locale={locale}
                  cues={cues}
                  active={active}
                  busy={busy}
                  isSample={isSample}
                  timing={timing}
                  canUndo={Boolean(undo)}
                  onImport={() => srtInput.current?.click()}
                  onReflow={reflow}
                  onSelect={selectCue}
                  onEdit={editCue}
                  onLoadSample={() => {
                    setCues(sample);
                    setIsSample(true);
                  }}
                  onRemove={(id) => {
                    setUndo(cues);
                    setCues(cues.filter((c) => c.id !== id));
                    setActive(Math.max(0, Math.min(active, cues.length - 2)));
                    setDirty(true);
                    notify("Caption removed.");
                  }}
                  onUndo={() => {
                    if (undo) setCues(undo);
                    setUndo(null);
                    setActive(0);
                    setDirty(true);
                  }}
                />
              </main>
              <AppearancePanel
                t={t}
                style={style}
                updateStyle={updateStyle}
                onPreset={(preset) => {
                  setStyle((current) => ({ ...current, ...preset }));
                  setDirty(true);
                }}
                onReset={() => {
                  setStyle(defaultStyle);
                  setDirty(true);
                }}
              />
            </div>
            <footer className="export-bar">
              <div className="export-info">
                <div className="export-icon">
                  <Subtitles size={20} />
                </div>
                <div>
                  <strong>{t("Export subtitles")}</strong>
                  <p>
                    {t(
                      "SRT / VTT carry text and timing. ASS includes styling.",
                    )}
                  </p>
                </div>
              </div>
              <div className="export-actions">
                <select
                  aria-label={t("Format")}
                  value={format}
                  onChange={(e) => setFormat(e.target.value)}
                >
                  <option value="srt">SubRip · .srt</option>
                  <option value="vtt">WebVTT · .vtt</option>
                  <option value="ass">Styled · .ass</option>
                </select>
                <button
                  className="button secondary"
                  disabled={!cues.length || busy}
                  onClick={() => exportFile()}
                >
                  <ArrowDownToLine size={16} />
                  {t("Export file")}
                </button>
                <select
                  className="timeline-mode"
                  aria-label={t("Timeline output")}
                  value={timelineMode}
                  onChange={(e) => setTimelineMode(e.target.value)}
                >
                  <option value="captions">{t("Native captions")}</option>
                  <option value="overlays">{t("Styled overlays")}</option>
                </select>
                <button
                  className="button primary"
                  disabled={!hostAvailable || !cues.length || busy || isSample}
                  title={
                    !hostAvailable
                      ? t("Open in Premiere for timeline access.")
                      : t(
                          timelineMode === "overlays"
                            ? "Styled PNG clips on an empty video track. Text stays editable in Vira."
                            : "Native Premiere captions use Premiere’s track style.",
                        )
                  }
                  onClick={() => exportFile(true)}
                >
                  <Plus size={16} />
                  {t("Add to timeline")}
                </button>
              </div>
            </footer>
            <div className="bottom-status">
              <span>
                <span className="status-dot connected" />
                {t(phase || "Ready to create")}
              </span>
              <span>
                VIRA / OPEN SOURCE<span className="status-separator">·</span>
                v0.1.0
              </span>
            </div>
          </>
        ) : page === "connections" ? (
          <main className="settings-page">
            <div className="eyebrow">VIRA / {t("Connections")}</div>
            <h1>{t("Connect your speech engine.")}</h1>
            <p className="page-intro">
              {t(
                "Your keys stay in memory for this session. They are never saved with a project.",
              )}
            </p>
            <div className="settings-grid">
              <section className="panel settings-card">
                <h2>
                  <KeyRound size={18} />
                  {t("Speech engine")}
                </h2>
                <Select
                  label={t("Provider")}
                  value={settings.provider}
                  onChange={(v) => switchProvider(v as Provider)}
                  options={Object.entries(providers).map(([id, p]) => [
                    id,
                    p.name,
                  ])}
                  disabled={busy}
                />
                <Field label={t("API key")}>
                  <div className="secret-input">
                    <input
                      aria-label={t("API key")}
                      type={showKey ? "text" : "password"}
                      value={settings.key}
                      placeholder="sk-…"
                      autoComplete="off"
                      spellCheck={false}
                      onChange={(e) => updateSettings("key", e.target.value)}
                    />
                    <button
                      className="icon-button"
                      aria-label={t(showKey ? "Hide API key" : "Show API key")}
                      aria-pressed={showKey}
                      onClick={() => setShowKey(!showKey)}
                    >
                      {showKey ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </Field>
                <p className="connection-status">
                  <span className="status-dot" />
                  {t(
                    settings.key
                      ? "Key entered · not yet verified"
                      : "No key entered",
                  )}
                </p>
                {settings.key && (
                  <button
                    className="small-button"
                    onClick={() => {
                      updateSettings("key", "");
                      delete keyMemory.current[settings.provider];
                    }}
                  >
                    {t("Forget key")}
                  </button>
                )}
                {settings.provider === "custom" && (
                  <>
                    <Field
                      label={t("Endpoint URL")}
                      hint={t(
                        "HTTPS endpoint · your key and audio will be sent here.",
                      )}
                    >
                      <input
                        aria-label={t("Endpoint URL")}
                        type="url"
                        value={settings.endpoint}
                        onChange={(e) =>
                          updateSettings("endpoint", e.target.value)
                        }
                        placeholder="https://api.example.com/v1/audio/transcriptions"
                      />
                    </Field>
                    <Field label={t("Custom model ID")}>
                      <input
                        aria-label={t("Custom model ID")}
                        value={settings.model}
                        onChange={(e) =>
                          updateSettings("model", e.target.value)
                        }
                      />
                    </Field>
                  </>
                )}
                <button
                  className="button primary"
                  onClick={() => setPage("workspace")}
                >
                  {t("Workspace")}
                  <ArrowRight size={16} />
                </button>
              </section>
              <div>
                <section className="panel settings-card">
                  <h2>
                    <Layers3 size={18} />
                    {t("Timeline audio export")}
                  </h2>
                  <p>
                    {t(
                      "Create an audio-only WAV export preset in Premiere, then select its .epr file here. Selected clips use FFmpeg directly.",
                    )}
                  </p>
                  <button
                    className="button secondary"
                    disabled={!hostAvailable}
                    onClick={async () => {
                      try {
                        const result = await choosePreset();
                        setPreset(result.path);
                      } catch (e) {
                        notify(errorText(e), true);
                      }
                    }}
                  >
                    <FolderOpen size={16} />
                    {t("Choose WAV preset")}
                  </button>
                  <p className="preset-path">
                    {preset || t("No preset selected")}
                  </p>
                </section>
                <div className="privacy-note">
                  <ShieldCheck size={21} />
                  <div>
                    <strong>{t("No automatic uploads")}</strong>
                    <p>
                      {t(
                        "Only Generate subtitles sends audio to your selected provider.",
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </main>
        ) : (
          <Guide t={t} />
        )}
        {notice && (
          <div
            className={`notification ${notice.error ? "error" : ""}`}
            role={notice.error ? "alert" : "status"}
          >
            {notice.error ? <CircleHelp size={17} /> : <Check size={17} />}
            <span>{t(notice.text)}</span>
            <button
              className="icon-button"
              aria-label={t("Dismiss")}
              onClick={() => setNotice(undefined)}
            >
              <X size={15} />
            </button>
          </div>
        )}
      </div>
      <input
        hidden
        type="file"
        accept=".mp3,.wav,.m4a,.flac,.ogg,.webm"
        ref={audioInput}
        onChange={(e) => {
          void loadAudio(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <input
        hidden
        type="file"
        accept=".srt"
        ref={srtInput}
        onChange={(e) => {
          void importFile(e.target.files?.[0], "srt");
          e.target.value = "";
        }}
      />
      <input
        hidden
        type="file"
        accept=".json"
        ref={projectInput}
        onChange={(e) => {
          void importFile(e.target.files?.[0], "project");
          e.target.value = "";
        }}
      />
      <dialog
        ref={dialog}
        aria-labelledby="replace-title"
        onCancel={(e) => {
          e.preventDefault();
          setReplacement(null);
        }}
      >
        <h2 id="replace-title">{t("Replace existing captions")}</h2>
        <p>
          {t(
            "Generating or importing replaces the current captions. Save a project first if you want to keep this version.",
          )}
        </p>
        <div className="dialog-actions">
          <button
            className="button secondary"
            autoFocus
            onClick={() => setReplacement(null)}
          >
            {t("Cancel")}
          </button>
          <button
            className="button primary"
            onClick={() => {
              const action = replacement;
              setReplacement(null);
              action?.();
            }}
          >
            {t("Continue")}
          </button>
        </div>
      </dialog>
    </div>
  );
}
