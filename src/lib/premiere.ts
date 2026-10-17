import { renderCaption } from "./render";
import type { CaptionStyle, Cue, MediaSource } from "./types";
declare global {
  interface Window {
    __adobe_cep__?: {
      evalScript: (script: string, callback: (value: string) => void) => void;
      getSystemPath: (type: string) => string;
    };
    cep_node?: { require: (name: string) => any };
  }
}
export const inPremiere = () =>
  Boolean(window.__adobe_cep__ && window.cep_node);
export function host<T>(method: string, payload: unknown = {}): Promise<T> {
  return new Promise((resolve, reject) => {
    if (!window.__adobe_cep__)
      return reject(new Error("Open Vira in Premiere Pro to use this action."));
    window.__adobe_cep__.evalScript(
      `Vira.${method}(${JSON.stringify(payload)})`,
      (result) => {
        try {
          const data = JSON.parse(result);
          if (data.error) reject(new Error(data.error));
          else resolve(data);
        } catch {
          reject(
            new Error(
              "Premiere did not respond. Reopen the panel and try again.",
            ),
          );
        }
      },
    );
  });
}
export interface SequenceInfo {
  name: string;
  id: string;
  duration: number;
}
export const getSequence = () => host<SequenceInfo>("sequence");
function nodeTools() {
  const require = window.cep_node?.require;
  if (!require || !window.__adobe_cep__)
    throw new Error("Audio extraction requires the Premiere panel.");
  const fs = require("fs");
  const path = require("path");
  const root = decodeURI(
    window.__adobe_cep__.getSystemPath("extension").replace(/^file:\/\//, ""),
  );
  return { require, fs, path, root };
}
export async function extractAudio(
  mode: "sequence" | "range" | "clip",
  signal: AbortSignal,
): Promise<MediaSource> {
  const { require, fs, path, root } = nodeTools();
  const dir = fs.mkdtempSync(path.join(require("os").tmpdir(), "vira-"));
  const raw = path.join(dir, "timeline.wav");
  const output = path.join(dir, "speech.mp3");
  try {
    const source = await host<{
      name: string;
      duration: number;
      offset: number;
      path?: string;
      inPoint?: number;
      sequenceId: string;
    }>("audio", { mode, output: raw });
    if (signal.aborted) throw new DOMException("Canceled", "AbortError");
    const ffmpeg = path.join(
      root,
      "bin",
      require("os").platform() === "win32" ? "ffmpeg.exe" : "ffmpeg",
    );
    if (!fs.existsSync(ffmpeg))
      throw new Error(
        "FFmpeg is missing. Build and install the complete release folder.",
      );
    const args = [
      "-y",
      ...(mode === "clip" ? ["-ss", String(source.inPoint)] : []),
      "-i",
      source.path || raw,
      "-t",
      String(source.duration),
      "-vn",
      "-ac",
      "1",
      "-ar",
      "16000",
      "-b:a",
      "48k",
      output,
    ];
    await new Promise<void>((resolve, reject) => {
      const child = require("child_process").spawn(ffmpeg, args, {
        windowsHide: true,
      });
      // Never pass media paths through a shell, or expose them in diagnostics.
      child.stderr.on("data", () => {});
      const abort = () => child.kill();
      signal.addEventListener("abort", abort, { once: true });
      child.on("error", () => {
        signal.removeEventListener("abort", abort);
        reject(new Error("Could not start FFmpeg. Check the installation."));
      });
      child.on("close", (code: number) => {
        signal.removeEventListener("abort", abort);
        if (signal.aborted) reject(new DOMException("Canceled", "AbortError"));
        else if (code === 0) resolve();
        else
          reject(
            new Error(
              "Audio extraction failed. Check the clip has audio and is online.",
            ),
          );
      });
    });
    const bytes = fs.readFileSync(output);
    return {
      name: "speech.mp3",
      blob: new Blob([new Uint8Array(bytes)], { type: "audio/mpeg" }),
      duration: source.duration,
      offset: source.offset,
      sequenceId: source.sequenceId,
    };
  } finally {
    for (const file of fs.readdirSync(dir)) fs.unlinkSync(path.join(dir, file));
    fs.rmdirSync(dir);
  }
}
export async function addToTimeline(content: string, sequenceId?: string) {
  const { fs, path, require } = nodeTools();
  // Keep the imported SRT: Premiere references this source on disk.
  const folder = path.join(
    require("os").homedir(),
    "Documents",
    "Vira Captions",
  );
  fs.mkdirSync(folder, { recursive: true });
  const file = path.join(folder, `captions-${Date.now()}.srt`);
  fs.writeFileSync(file, "\uFEFF" + content, "utf8");
  return host("importCaptions", { path: file, sequenceId });
}
export const choosePreset = () => host<{ path: string }>("choosePreset");
export function download(
  content: string,
  filename: string,
  type = "text/plain",
) {
  const prefix = type === "application/json" ? "" : "\uFEFF";
  const blob = new Blob([prefix, content], { type: `${type};charset=utf-8` });
  if (inPremiere()) {
    const { fs } = nodeTools();
    return host<{ path?: string }>("saveFile", { filename }).then((result) => {
      if (result.path) fs.writeFileSync(result.path, prefix + content, "utf8");
      return Boolean(result.path);
    });
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return Promise.resolve(true);
}

/** Raster overlays carry the complete style into Premiere without a proprietary MOGRT. */
export async function addStyledOverlays(
  cues: Cue[],
  style: CaptionStyle,
  sequenceId?: string,
) {
  const target = await host<{
    sequenceId: string;
    trackIndex: number;
    width: number;
    height: number;
  }>("overlayTarget", { sequenceId });
  const { fs, path, require } = nodeTools();
  const folder = path.join(
    require("os").homedir(),
    "Documents",
    "Vira Captions",
    `overlays-${Date.now()}`,
  );
  fs.mkdirSync(folder, { recursive: true });
  const items = [];
  for (let i = 0; i < cues.length; i++) {
    const blob = await renderCaption(
      cues[i],
      style,
      target.width,
      target.height,
    );
    const file = path.join(
      folder,
      `caption-${String(i + 1).padStart(5, "0")}.png`,
    );
    fs.writeFileSync(file, new Uint8Array(await blob.arrayBuffer()));
    items.push({ path: file, start: cues[i].start, end: cues[i].end });
  }
  return host("importOverlays", { ...target, items });
}
