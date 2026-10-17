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
            "Click Connect your speech service and paste your API key. OpenAI and GPT transcribe are already selected for you.",
          ],
          [
            "2. Transcribe",
            "Choose Whole timeline for your entire edit, Selected video for one clip, or Marked section for the part between your In and Out marks. Vira prepares the audio automatically.",
          ],
          [
            "3. Refine",
            "Choose the spoken language and click Generate subtitles. Read through the result, correct any words, and check when each caption appears.",
          ],
          [
            "4. Export",
            "Click Add to timeline to put the subtitles in your edit. You can also choose a look in Appearance or save a subtitle file with Export file.",
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
