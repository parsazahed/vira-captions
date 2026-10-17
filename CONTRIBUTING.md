# Contributing to Vira

Use Node 22.12+ and `npm ci`. Run the browser with `npm run dev`. Keep provider logic in `src/lib/providers.ts`, format logic in `captions.ts`, and Premiere calls in the host adapter. Host ExtendScript uses ES3 syntax intentionally; do not replace its `var` declarations or add modern JavaScript APIs.

Make focused changes with plain names and short functions. Prefer a pure function over a framework abstraction. Add tests for timing, format, provider-contract, or data-loss changes. Update English and Persian copy together. Preserve Unicode logical order and Persian ZWNJ; do not reverse RTL strings.

Before submitting: format, typecheck, unit tests, browser tests, build, and dependency audit. For host changes, include your Premiere/macOS/CPU version and results from `docs/ACCEPTANCE.md`. Do not present mocked host tests as real Adobe integration evidence.

Never commit credentials, recordings, generated transcript projects, personal paths, or extension binaries. GitHub Actions uses mocked provider calls; no API keys are needed.

The project has no backend. New features that add analytics, persistent credentials, upload destinations, automatic paid requests, or external services require a documented design decision and explicit user-facing controls.
