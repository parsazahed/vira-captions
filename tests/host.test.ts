import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";
const script = readFileSync(
  new URL("../cep/host/index.jsx", import.meta.url),
  "utf8",
);
function bridge(sequence: any = null, project: any = {}) {
  const context: any = {
    app: { project: { activeSequence: sequence, ...project } },
    ProjectItemType: { BIN: 2 },
    File: function (this: any, path: string) {
      this.exists = true;
      this.fsName = path;
    },
    Time: function (this: any) {
      this.seconds = 0;
    },
  };
  runInNewContext(script, context);
  return context.Vira;
}
describe("Premiere host safety contracts (mocked DOM)", () => {
  it("gives a useful error without a sequence", () =>
    expect(JSON.parse(bridge().sequence()).error).toContain("active sequence"));
  it("serializes quotes, Unicode, and backslashes in names safely", () => {
    const result = bridge({
      name: 'سلام "test" \\ name',
      sequenceID: "123",
      end: 2540160000000,
    }).sequence();
    expect(JSON.parse(result)).toMatchObject({
      name: 'سلام "test" \\ name',
      duration: 10,
      id: "123",
    });
  });
  it("explains recovery when automatic audio setup is unavailable", () => {
    const exportFn = vi.fn();
    const result = bridge({
      sequenceID: "1",
      end: 2540160000000,
      exportAsMediaDirect: exportFn,
    }).audio({ mode: "sequence", output: "output.wav" });
    expect(JSON.parse(result).error).toContain("Try Selected video");
    expect(exportFn).not.toHaveBeenCalled();
  });
  it("validates installed WAV settings and renders a marked section without manual setup", () => {
    const exportFn = vi.fn(() => true);
    const extension = vi.fn((file: string) =>
      file === "/stock/audio.epr" ? "wav" : "mp4",
    );
    const result = JSON.parse(
      bridge({
        name: "Timeline",
        sequenceID: "1",
        end: 2540160000000,
        getExportFileExtension: extension,
        getInPointAsTime: () => ({ seconds: 2 }),
        getOutPointAsTime: () => ({ seconds: 7 }),
        exportAsMediaDirect: exportFn,
      }).audio({
        mode: "range",
        output: "/temp/audio.wav",
        presets: ["/stock/video.epr", "/stock/audio.epr"],
      }),
    );
    expect(exportFn).toHaveBeenCalledWith(
      "/temp/audio.wav",
      "/stock/audio.epr",
      1,
    );
    expect(result).toMatchObject({ duration: 5, offset: 2, sequenceId: "1" });
  });
  it("retains selected-clip source trim and timeline offset", () => {
    const clip = {
      name: "Clip",
      mediaType: "Audio",
      getSpeed: () => 1,
      isSpeedReversed: () => false,
      projectItem: { getMediaPath: () => "/media/clip.mov" },
      inPoint: { seconds: 4 },
      duration: { seconds: 6 },
      start: { seconds: 20 },
    };
    const result = JSON.parse(
      bridge({
        getSelection: () => [clip],
        sequenceID: "1",
        end: 25401600000000,
      }).audio({ mode: "clip" }),
    );
    expect(result).toMatchObject({
      inPoint: 4,
      duration: 6,
      offset: 20,
      sequenceId: "1",
    });
  });
  it("rejects retimed clips instead of exporting the wrong region", () => {
    const clip = { mediaType: "Audio", getSpeed: () => 2 };
    expect(
      JSON.parse(
        bridge({ getSelection: () => [clip], end: 1 }).audio({ mode: "clip" }),
      ).error,
    ).toContain("retimed");
  });
  it("blocks caption import when the active sequence changed", () => {
    const importFiles = vi.fn();
    expect(
      JSON.parse(
        bridge({ sequenceID: "new" }, { importFiles }).importCaptions({
          sequenceId: "old",
          path: "/captions.srt",
        }),
      ).error,
    ).toContain("sequence changed");
    expect(importFiles).not.toHaveBeenCalled();
  });
  it("never uses an occupied track for styled overlays", () => {
    const tracks: any = [{ clips: { numItems: 2 } }];
    tracks.numTracks = 1;
    expect(
      JSON.parse(
        bridge({ sequenceID: "1", videoTracks: tracks }).overlayTarget({}),
      ).error,
    ).toContain("empty");
  });
  it("rolls back inserted overlays when a later insertion fails", () => {
    const remove = vi.fn();
    const item = { nodeId: "image", getMediaPath: () => "/one.png" };
    const clips: any = { numItems: 0 };
    const track = {
      clips,
      isLocked: () => false,
      overwriteClip: vi.fn(() => {
        if (clips.numItems) throw new Error("insert failure");
        clips[0] = { projectItem: item, remove };
        clips.numItems = 1;
      }),
    };
    const bin = { children: { numItems: 1, 0: item } };
    const rootItem = { createBin: () => bin };
    const result = JSON.parse(
      bridge(
        { sequenceID: "1", videoTracks: [track] },
        { rootItem, importFiles: () => true },
      ).importOverlays({
        sequenceId: "1",
        trackIndex: 0,
        items: [
          { path: "/one.png", start: 0, end: 1 },
          { path: "/one.png", start: 2, end: 3 },
        ],
      }),
    );
    expect(result.error).toContain("insert failure");
    expect(remove).toHaveBeenCalledWith(false, false);
  });
});
