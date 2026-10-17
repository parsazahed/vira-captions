# Third-party notices

The MIT license applies to original Vira source only.

- React / React DOM — MIT, Meta and contributors.
- Lucide — ISC, Lucide contributors.
- Manrope — SIL Open Font License 1.1, Mikhail Sharanda and contributors.
- Vazirmatn — SIL Open Font License 1.1, Saber Rastikerdar and contributors.
- Vite / TypeScript / test tooling — their respective licenses in installed packages; these are development dependencies.
- ffmpeg-static — GPL-3.0-or-later. This build uses its unmodified platform FFmpeg executable as a separate process. The executable has its own FFmpeg/dependency license, build flags, and corresponding-source requirements. `npm run build` includes `ffmpeg.LICENSE`, `ffmpeg.README`, and the wrapper license in the local package. Its locked upstream binary release is `b6.1.1`: https://github.com/eugeneware/ffmpeg-static/releases/tag/b6.1.1 . Source/build repository: https://github.com/eugeneware/ffmpeg-static ; FFmpeg source: https://ffmpeg.org/download.html . A link is not a substitute for all redistribution obligations; public binary distribution needs the matching corresponding source and build/dependency materials required by that binary's license. This repository distributes original source and dependency manifests; no FFmpeg executable is committed.

Licenses copied into local packages come from the installed locked dependencies. Inspect the binary's `-version`/`-buildconf` and upstream release before redistributing a compiled package. Vira has no affiliation with or endorsement by Adobe, OpenAI, Groq, or Deepgram.
