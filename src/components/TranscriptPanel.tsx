import { useState } from "react";
import {
  Upload,
  RefreshCw,
  Search,
  X,
  Subtitles,
  Play,
  Trash2,
  Undo2,
} from "lucide-react";
import type { Cue, Locale } from "../lib/types";
interface Props {
  t: (key: string) => string;
  locale: Locale;
  cues: Cue[];
  active: number;
  busy: boolean;
  isSample: boolean;
  timing: "native" | "estimated" | "imported";
  canUndo: boolean;
  onImport: () => void;
  onReflow: () => void;
  onSelect: (index: number) => void;
  onLoadSample: () => void;
  onUndo: () => void;
  onRemove: (id: string) => void;
  onEdit: (id: string, update: Partial<Cue>) => void;
}
export function TranscriptPanel({
  t,
  locale,
  cues,
  active,
  busy,
  isSample,
  timing,
  canUndo,
  onImport,
  onReflow,
  onSelect,
  onLoadSample,
  onUndo,
  onRemove,
  onEdit,
}: Props) {
  const [query, setQuery] = useState("");
  const countLabel = new Intl.NumberFormat(locale).format(cues.length);
  const filtered = cues
    .map((cue, index) => ({ cue, index }))
    .filter(({ cue }) =>
      cue.text.toLocaleLowerCase().includes(query.toLocaleLowerCase()),
    );
  return (
    <section className="transcript-panel panel">
      <div className="panel-heading">
        <h2>
          {t("Transcript")}
          <span className="count-pill">{countLabel}</span>
        </h2>
        <div className="transcript-actions">
          <button
            className="small-button"
            onClick={() => onImport()}
            disabled={busy}
          >
            <Upload size={13} />
            <span>{t("Import SRT")}</span>
          </button>
          <button
            className="small-button"
            disabled={!cues.length || busy}
            onClick={onReflow}
          >
            <RefreshCw size={13} />
            <span>{t("Reflow")}</span>
          </button>
        </div>
      </div>
      <div className="transcript-toolbar">
        <div className="search">
          <Search size={14} />
          <input
            aria-label={t("Search captions")}
            placeholder={t("Search captions")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button
              className="icon-button"
              aria-label={t("Clear search")}
              onClick={() => setQuery("")}
            >
              <X size={13} />
            </button>
          )}
        </div>
        <span className={`timing-label ${isSample ? "sample" : timing}`}>
          <span className="status-dot" />
          {t(
            isSample
              ? "Sample transcript"
              : timing === "estimated"
                ? "Estimated timing · review before exporting"
                : timing === "native"
                  ? "Provider timestamps"
                  : "Imported timing",
          )}
        </span>
      </div>
      <div className="caption-list">
        {!cues.length ? (
          <div className="empty">
            <Subtitles size={32} />
            <h3>{t("Start with your audio.")}</h3>
            <p>{t("Generate subtitles or import an SRT to begin editing.")}</p>
            <button className="button secondary" onClick={onLoadSample}>
              {t("Load sample")}
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty">
            <Search size={24} />
            <p>{t("No captions match your search.")}</p>
          </div>
        ) : (
          filtered.map(({ cue, index }) => (
            <div
              key={cue.id}
              className={`caption-row ${active === index ? "active" : ""}`}
            >
              <button
                className="cue-index"
                aria-label={`${t("Caption preview")} ${index + 1}`}
                onClick={() => onSelect(index)}
              >
                {active === index ? (
                  <Play size={11} fill="currentColor" />
                ) : (
                  String(index + 1).padStart(2, "0")
                )}
              </button>
              <div className="cue-body">
                <div className="cue-times" dir="ltr">
                  <input
                    aria-label={`${t("Start")} ${index + 1}`}
                    title={t("Timing in seconds")}
                    type="number"
                    min={0}
                    step={0.01}
                    value={Number.isFinite(cue.start) ? cue.start : ""}
                    aria-invalid={
                      !Number.isFinite(cue.start) ||
                      cue.start < 0 ||
                      (index > 0 && cue.start < cues[index - 1].end)
                    }
                    aria-describedby={`cue-error-${index}`}
                    disabled={busy}
                    onChange={(e) =>
                      onEdit(cue.id, {
                        start: e.target.value === "" ? NaN : +e.target.value,
                      })
                    }
                  />
                  <span>→</span>
                  <input
                    aria-label={`${t("End")} ${index + 1}`}
                    title={t("Timing in seconds")}
                    type="number"
                    min={0}
                    step={0.01}
                    value={Number.isFinite(cue.end) ? cue.end : ""}
                    aria-invalid={
                      !Number.isFinite(cue.end) || cue.end <= cue.start
                    }
                    aria-describedby={`cue-error-${index}`}
                    disabled={busy}
                    onChange={(e) =>
                      onEdit(cue.id, {
                        end: e.target.value === "" ? NaN : +e.target.value,
                      })
                    }
                  />
                  <span className="cue-duration">
                    {Number.isFinite(cue.end - cue.start)
                      ? `${(cue.end - cue.start).toFixed(1)}s`
                      : "—"}
                  </span>
                </div>
                <textarea
                  className="resize-none"
                  rows={Math.max(2, cue.text.split("\n").length)}
                  aria-label={`${t("Caption text")} ${index + 1}`}
                  dir="auto"
                  value={cue.text}
                  aria-invalid={!cue.text.trim()}
                  aria-describedby={`cue-error-${index}`}
                  disabled={busy}
                  onFocus={() => onSelect(index)}
                  onChange={(e) => onEdit(cue.id, { text: e.target.value })}
                />
                <span className="cue-error" id={`cue-error-${index}`}>
                  {!cue.text.trim() ||
                  !Number.isFinite(cue.start) ||
                  !Number.isFinite(cue.end) ||
                  cue.start < 0 ||
                  cue.end <= cue.start ||
                  (index > 0 && cue.start < cues[index - 1].end)
                    ? t("Check caption text and timing.")
                    : ""}
                </span>
              </div>
              <button
                disabled={busy}
                className="icon-button delete-cue"
                title={t("Remove caption")}
                aria-label={`${t("Remove caption")} ${index + 1}`}
                onClick={() => onRemove(cue.id)}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))
        )}
      </div>
      <div className="transcript-bottom">
        <span>
          <span className="key-cap">↵</span>
          {t(
            isSample
              ? "Sample only · generate or import your own captions"
              : "Timing in seconds",
          )}
        </span>
        {canUndo && (
          <button disabled={busy} className="small-button" onClick={onUndo}>
            <Undo2 size={12} />
            {t("Undo")}
          </button>
        )}
      </div>
    </section>
  );
}
