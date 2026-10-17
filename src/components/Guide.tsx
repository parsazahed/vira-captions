import { Type } from "lucide-react";
export function Guide({ t }: { t: (key: string) => string }) {
  return (
    <main className="settings-page guide-page">
      <div className="eyebrow">VIRA / {t("Guide")}</div>
      <h1>{t("A few things worth knowing.")}</h1>
      <div className="guide-grid">
        {[
          [
            "1. Connect",
            "Add a key in Connections. Choose OpenAI for GPT transcription, or a timestamp-capable Whisper model for precise caption timing.",
          ],
          [
            "2. Transcribe",
            "In Premiere, select a clip, the sequence, or an In/Out range. In the browser, choose an audio file. Each generation sends one paid API request.",
          ],
          [
            "3. Refine",
            "Edit text and timing, choose paragraph rules, then use Reflow to rebuild line breaks. Reflow estimates word positions within each current caption.",
          ],
          [
            "4. Export",
            "Import an SRT caption track into Premiere, or export SRT, VTT, and styled ASS. ASS needs a compatible renderer; Premiere does not import its styling.",
          ],
        ].map(([title, body]) => (
          <section className="panel settings-card" key={title}>
            <h2>{t(title)}</h2>
            <p>{t(body)}</p>
          </section>
        ))}
      </div>
      <section className="guide-callout">
        <Type size={26} />
        <div>
          <h2>{t("Farsi is a first-class language.")}</h2>
          <p>
            {t(
              "Unicode text stays in logical order. Persian letters, ZWNJ, punctuation, and mixed Latin words are preserved. Install Vazirmatn on your system for matching exports.",
            )}
          </p>
        </div>
      </section>
      <section className="panel settings-card">
        <h2>{t("GPT timing")}</h2>
        <p>
          {t(
            "GPT transcription models do not return word timestamps. Vira estimates timing from the audio duration. Review every cue, or use Whisper for native word timestamps. Diarize supplies segment boundaries, with estimated word positions.",
          )}
        </p>
        <p>
          {t(
            "Line spacing and text direction are preview controls; renderer behavior may vary.",
          )}
        </p>
      </section>
    </main>
  );
}
