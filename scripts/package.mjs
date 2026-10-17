import {
  readFile,
  writeFile,
  cp,
  mkdir,
  chmod,
  copyFile,
  rm,
} from "node:fs/promises";
import ffmpeg from "ffmpeg-static";
const output = new URL("../release/Vira/", import.meta.url);
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(new URL("../dist/", import.meta.url), output, { recursive: true });
await cp(new URL("../cep/", import.meta.url), output, { recursive: true });
// CEP loads from file://. A classic deferred bundle avoids ESM file-origin CORS.
// The app is intentionally one bundle with no dynamic imports.
const htmlPath = new URL("index.html", output);
const html = await readFile(htmlPath, "utf8");
await writeFile(
  htmlPath,
  html
    .replace('type="module" crossorigin', "defer")
    .replace('rel="stylesheet" crossorigin', 'rel="stylesheet"'),
);

await mkdir(new URL("bin/", output));
const binary = new URL(
  `bin/${process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg"}`,
  output,
);
await copyFile(ffmpeg, binary);
await chmod(binary, 0o755);
await copyFile(
  new URL("../LICENSE", import.meta.url),
  new URL("LICENSE", output),
);
await mkdir(new URL("licenses/", output));
for (const [source, destination] of [
  ["ffmpeg-static/ffmpeg.LICENSE", "ffmpeg.LICENSE"],
  ["ffmpeg-static/ffmpeg.README", "ffmpeg.README"],
  ["ffmpeg-static/LICENSE", "ffmpeg-static.LICENSE"],
  ["@fontsource-variable/manrope/LICENSE", "Manrope.LICENSE"],
  ["@fontsource-variable/vazirmatn/LICENSE", "Vazirmatn.LICENSE"],
  ["react/LICENSE", "React.LICENSE"],
  ["react-dom/LICENSE", "React-DOM.LICENSE"],
  ["lucide-react/LICENSE", "Lucide.LICENSE"],
])
  await copyFile(
    new URL(`../node_modules/${source}`, import.meta.url),
    new URL(`licenses/${destination}`, output),
  );
await copyFile(
  new URL("../README.md", import.meta.url),
  new URL("README.md", output),
);
await copyFile(
  new URL("../THIRD_PARTY_NOTICES.md", import.meta.url),
  new URL("THIRD_PARTY_NOTICES.md", output),
);
console.log(
  `Packaged ${process.platform}/${process.arch} extension: release/Vira`,
);
