import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
if (process.platform !== "darwin" || process.arch !== "arm64")
  throw new Error("This preview installer targets Apple Silicon Macs.");
const root = fileURLToPath(new URL("../", import.meta.url));
const output = `${root}release/installer-parts`;
mkdirSync(output, { recursive: true });
execFileSync(
  "/usr/bin/pkgbuild",
  [
    "--root",
    `${root}release/Vira`,
    "--scripts",
    `${root}installer/scripts`,
    "--install-location",
    "/Library/Application Support/Vira/Preview Payload",
    "--identifier",
    "studio.vira.captions.preview",
    "--version",
    "0.2.0",
    `${output}/Vira-component.pkg`,
  ],
  { stdio: "inherit" },
);
execFileSync(
  "/usr/bin/productbuild",
  [
    "--distribution",
    `${root}installer/distribution.xml`,
    "--package-path",
    output,
    "--resources",
    `${root}installer/resources`,
    `${root}release/Vira-Preview-macOS-arm64.pkg`,
  ],
  { stdio: "inherit" },
);
console.log(
  "Created release/Vira-Preview-macOS-arm64.pkg. Unsigned preview; no installation or system settings were changed.",
);
