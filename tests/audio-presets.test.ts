import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import * as fs from "node:fs";
import * as path from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import { findAudioPresets } from "../src/lib/audio-presets";
let temp = "";
afterEach(() => {
  if (temp) rmSync(temp, { recursive: true, force: true });
  temp = "";
});
function installation() {
  temp = mkdtempSync(path.join(tmpdir(), "vira-presets-test-"));
  const contents = path.join(temp, "Adobe Premiere Pro.app", "Contents");
  const presets = path.join(contents, "MediaIO", "systempresets");
  mkdirSync(path.join(contents, "MacOS"), { recursive: true });
  mkdirSync(presets, { recursive: true });
  return {
    presets,
    executable: path.join(contents, "MacOS", "Adobe Premiere Pro"),
  };
}
describe("automatic timeline audio setup", () => {
  it("finds installed WAV settings without depending on English filenames", () => {
    const { presets, executable } = installation();
    const file = path.join(presets, "صدای استاندارد.epr");
    writeFileSync(
      file,
      "<PremiereData><ExporterFileType>1463899717</ExporterFileType></PremiereData>",
    );
    writeFileSync(
      path.join(presets, "wav-video.epr"),
      "<ExporterFileType>1211250228</ExporterFileType>",
    );
    expect(findAudioPresets(executable, fs, path)).toEqual([file]);
  });
  it("ignores ingest settings and symbolic links to unrelated folders", () => {
    const { presets, executable } = installation();
    mkdirSync(path.join(presets, "Ingest"));
    writeFileSync(
      path.join(presets, "Ingest", "audio.epr"),
      "<ExporterFileType>1463899717</ExporterFileType>",
    );
    writeFileSync(
      path.join(presets, "ingestion.epr"),
      "<ExporterFileType>1463899717</ExporterFileType><IngestPreset>true</IngestPreset>",
    );
    expect(findAudioPresets(executable, fs, path)).toEqual([]);
  });
  it("handles missing preset folders without throwing or prompting", () =>
    expect(
      findAudioPresets(
        "/missing/Premiere.app/Contents/MacOS/Premiere",
        fs,
        path,
      ),
    ).toEqual([]));
  it("supports UTF-16 Adobe settings and encoded application paths", () => {
    const { presets, executable } = installation();
    const file = path.join(presets, "audio.epr");
    writeFileSync(
      file,
      "<ExporterFileType>1463899717</ExporterFileType>",
      "utf16le",
    );
    expect(
      findAudioPresets("file://" + encodeURI(executable), fs, path),
    ).toEqual([file]);
  });
});
