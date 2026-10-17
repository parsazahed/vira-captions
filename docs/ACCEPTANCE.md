# Premiere acceptance checklist

Status: **not executed in Premiere**. Record Premiere build, macOS version, CPU architecture, CEP runtime, preset format, and results per supported version. Target: recent 24.x, 25.x, and 26.x CEP-capable hosts. This checklist is intentionally separate from mocked/browser evidence.

- Install a matching-architecture package; load Window → Extensions → Vira Captions.
- Open a real sequence. Verify refresh, name, and duration; test without an active sequence.
- Verify Vira finds Premiere’s installed WAV settings automatically, without a file picker; check timeline and marked-section audio duration against playback. Test missing settings and confirm the recovery message offers Selected video/audio file.
- Extract a trimmed clip at a nonzero timeline position; check media In/Out and cue offset. Test linked A/V, nested, offline, reversed, and speed-adjusted clips.
- Verify sequence audio reflects effects/mutes, while Selected clip uses original source audio.
- Make one real transcription call per enabled provider using a non-private short test recording. Check Persian and mixed English names, cancellation, quota failure, and unsupported language errors.
- Verify GPT estimated timing labels and timestamp-native model behavior; review long silences manually.
- Edit timing and text; import a native SRT caption track and check sequence-relative timestamps.
- Change active sequence after transcription; ensure import is rejected until returning to the original sequence.
- Add an empty top video track. Import styled PNG overlays. Compare stroke, shadow, box, position, alignment, Farsi joining, ZWNJ, punctuation, mixed English, and digits against Vira.
- Test square-pixel 1920×1080 and portrait 1080×1920 sequences. Reject non-square pixels. Verify no existing clips are overwritten; locked/hidden/occupied tracks must be rejected.
- Induce an overlay insertion failure; confirm all newly inserted clips are rolled back from the initially empty track and existing footage is untouched.
- Save/reopen Premiere after import; ensure SRT/PNG assets remain online from Documents/Vira Captions.
- Save a Vira project, close panel, reopen project, and verify API key was not persisted.
- Check English and Persian interface at 340px, 740px, and 1180px panel widths. Open dropdowns with keyboard, inspect focus and 200% zoom.
- Export SRT/VTT, render ASS in a compatible external renderer with Vazirmatn installed, and inspect mixed-script order.

Limitations: no forced alignment for GPT, auto-chunking, translation, live video preview, editable MOGRT text, or signed extension installer. Speaker diarization output is flattened into subtitle text; no per-speaker styling UI yet.

## Beginner installer (not executed)

- Open the unsigned preview .pkg with normal macOS Installer. Verify the Welcome screen explains unsigned Adobe extension mode before Continue.
- Install under a normal signed-in account; verify the extension belongs to that user, existing Vira is backed up, and transcript assets are untouched.
- Verify installation enables CSXS 11/12 preview support only for that user and does not alter Gatekeeper.
- Relaunch Premiere and follow the three-step guide without Terminal or preset configuration.
- Verify Apple Silicon architecture restriction and graceful failure when no normal desktop user is logged in.
- Signed/notarized public distribution remains a separate release requirement.
