/** Find Adobe's installed WAV settings without asking the editor to manage .epr files.
 * Only inspect MediaIO preset folders beside the active host executable.
 * Premiere validates the candidates before an export is attempted.
 */
interface PresetFileSystem {
  existsSync: (path: string) => boolean;
  readdirSync: (
    path: string,
    options: { withFileTypes: true },
  ) => { name: string; isDirectory: () => boolean; isFile: () => boolean }[];
  readFileSync: (path: string, encoding: "utf8") => string;
}
interface PresetPaths {
  dirname: (path: string) => string;
  join: (...paths: string[]) => string;
}
export function findAudioPresets(
  executable: string,
  fs: PresetFileSystem,
  path: PresetPaths,
): string[] {
  if (!executable) return [];
  const roots = new Set<string>();
  let parent = path.dirname(decodeURI(executable.replace(/^file:\/\//, "")));
  for (let level = 0; level < 6; level++) {
    roots.add(path.join(parent, "MediaIO", "systempresets"));
    roots.add(path.join(parent, "Contents", "MediaIO", "systempresets"));
    roots.add(path.join(parent, "SharedSupport", "MediaIO", "systempresets"));
    const next = path.dirname(parent);
    if (next === parent) break;
    parent = next;
  }
  const matches: string[] = [];
  let inspected = 0;
  function visit(folder: string, depth: number) {
    if (depth > 6 || inspected > 2000) return;
    let entries;
    try {
      entries = fs.readdirSync(folder, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (/ingest/i.test(entry.name)) continue;
      const file = path.join(folder, entry.name);
      if (entry.isDirectory()) visit(file, depth + 1);
      else if (entry.isFile() && /\.epr$/i.test(entry.name)) {
        inspected++;
        try {
          // Adobe's WAVE fourCC. Filename and UI language are not reliable identifiers.
          const xml = fs.readFileSync(file, "utf8").replace(/\0/g, "");
          if (
            /<ExporterFileType>\s*1463899717\s*<\/ExporterFileType>/i.test(
              xml,
            ) &&
            !/<IngestPreset>\s*true\s*<\/IngestPreset>/i.test(xml)
          )
            matches.push(file);
        } catch {
          /* Ignore an unreadable setting; other stock settings may work. */
        }
      }
    }
  }
  for (const root of roots) if (fs.existsSync(root)) visit(root, 0);
  return [...new Set(matches)].slice(0, 24);
}
