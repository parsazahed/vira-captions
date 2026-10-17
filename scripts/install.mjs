import { cp, mkdir, access } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
if (process.platform !== "darwin")
  throw new Error(
    "Automatic installation currently supports macOS. See README for Windows.",
  );
const source = new URL("../release/Vira", import.meta.url);
await access(source);
const target = join(
  homedir(),
  "Library/Application Support/Adobe/CEP/extensions/Vira",
);
await mkdir(target, { recursive: true });
await cp(source, target, { recursive: true });
console.log(
  `Installed at ${target}. Enable CEP developer mode as described in README, then restart Premiere.`,
);
