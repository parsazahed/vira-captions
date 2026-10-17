import { parseSrt } from "../../src/lib/captions";
import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
const srt =
  "1\n00:00:00,000 --> 00:00:02,000\nسلام، این یک تست است.\n\n2\n00:00:03,000 --> 00:00:05,000\nVira می‌تواند فارسی بنویسد.\n";
test.beforeEach(async ({ page }) => {
  await page.goto("/");
});
test("edits, searches, deletes, undoes, and exports actual Persian SRT", async ({
  page,
}) => {
  await page.locator('input[accept=".srt"]').setInputFiles({
    name: "captions.srt",
    mimeType: "text/plain",
    buffer: Buffer.from(srt),
  });
  await expect(page.getByLabel("Caption text 1", { exact: true })).toHaveValue(
    "سلام، این یک تست است.",
  );
  await page
    .getByLabel("Caption text 1", { exact: true })
    .fill("می‌روم به خانه");
  await page.getByLabel("Search captions").fill("Vira");
  await expect(page.locator(".caption-row")).toHaveCount(1);
  await page.getByLabel("Clear search").click();
  await expect(page.locator(".caption-row")).toHaveCount(2);
  await page.getByLabel("Remove caption 2").click();
  await expect(page.locator(".caption-row")).toHaveCount(1);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.locator(".caption-row")).toHaveCount(2);
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export file", exact: true }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe("vira-captions.srt");
});
test("preserves secret in session across providers and excludes it from project downloads", async ({
  page,
}) => {
  await page
    .getByRole("button", { name: "Connections", exact: true })
    .first()
    .click();
  await page.getByLabel("API key", { exact: true }).fill("private-test-key");
  await expect(page.getByLabel("API key", { exact: true })).toHaveAttribute(
    "type",
    "password",
  );
  await page.getByLabel("Show API key").click();
  await expect(page.getByLabel("API key", { exact: true })).toHaveAttribute(
    "type",
    "text",
  );
  await page.getByLabel("Provider", { exact: true }).selectOption("groq");
  await expect(page.getByLabel("API key", { exact: true })).toHaveValue("");
  await page.getByLabel("Provider", { exact: true }).selectOption("openai");
  await expect(page.getByLabel("API key", { exact: true })).toHaveValue(
    "private-test-key",
  );
  await page
    .getByRole("button", { name: "Workspace", exact: true })
    .first()
    .click();
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Save project" }).click();
  const file = await pending;
  const stream = await file.createReadStream();
  let content = "";
  for await (const chunk of stream!) content += chunk.toString();
  expect(content).not.toContain("private-test-key");
  expect(JSON.parse(content).version).toBe(1);
});
test("invalid times block export and expose inline errors", async ({
  page,
}) => {
  await page.getByLabel("End 1", { exact: true }).fill("-2");
  await expect(page.getByLabel("End 1", { exact: true })).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await page.getByRole("button", { name: "Export file", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText(
    "end must be after start",
  );
});
test("dirty replacement dialog cancels and returns focus", async ({ page }) => {
  const text = page.getByLabel("Caption text 1", { exact: true });
  await text.fill("keep this text");
  await page.locator('input[accept=".srt"]').setInputFiles({
    name: "captions.srt",
    mimeType: "text/plain",
    buffer: Buffer.from(srt),
  });
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(text).toHaveValue("keep this text");
});
test("switches full interface to Persian and fits a narrow panel", async ({
  page,
}) => {
  await page.getByLabel("Interface language").click();
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(
    page.getByRole("heading", { name: "هر واژه، در جای خودش." }),
  ).toBeVisible();
  await page.setViewportSize({ width: 360, height: 800 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "docs/vira-persian-narrow.png",
    fullPage: true,
  });
});
test("has no serious accessibility violations in the workspace and settings", async ({
  page,
}) => {
  let results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  expect(results.violations).toEqual([]);
  await page
    .getByRole("button", { name: "Connections", exact: true })
    .first()
    .click();
  results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  expect(results.violations).toEqual([]);
});
test("provider failures and canceled requests preserve captions", async ({
  page,
}) => {
  await page
    .getByRole("button", { name: "Connections", exact: true })
    .first()
    .click();
  await page.getByLabel("API key", { exact: true }).fill("test-key");
  await page
    .getByRole("button", { name: "Workspace", exact: true })
    .first()
    .click();
  // A real 1-second silent PCM WAV supplies browser-readable metadata; provider is mocked.
  const wav = Buffer.alloc(32044);
  wav.write("RIFF");
  wav.writeUInt32LE(32036, 4);
  wav.write("WAVEfmt ", 8);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(16000, 24);
  wav.writeUInt32LE(32000, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write("data", 36);
  wav.writeUInt32LE(32000, 40);
  await page
    .locator('input[accept^=".mp3"]')
    .setInputFiles({ name: "silence.wav", mimeType: "audio/wav", buffer: wav });
  await expect(page.getByText("Audio loaded.", { exact: true })).toBeVisible();
  await page.route("https://api.openai.com/**", (route) =>
    route.fulfill({ status: 401, body: "{}" }),
  );
  await page
    .getByRole("button", { name: "Generate subtitles", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("API key rejected");
  await expect(page.locator(".caption-row")).toHaveCount(4);
  await page.unroute("https://api.openai.com/**");
  await page.route("https://api.openai.com/**", async (route) => {
    await new Promise((r) => setTimeout(r, 3000));
    await route
      .fulfill({ body: JSON.stringify({ text: "hello" }) })
      .catch(() => {});
  });
  await page
    .getByRole("button", { name: "Generate subtitles", exact: true })
    .click();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.locator('.notification[role="status"]')).toContainText(
    "Canceled",
  );
  await expect(page.locator(".caption-row")).toHaveCount(4);
});
test("successful transcription replaces sample and marks GPT timing estimated", async ({
  page,
}) => {
  await page
    .getByRole("button", { name: "Connections", exact: true })
    .first()
    .click();
  await page.getByLabel("API key", { exact: true }).fill("test-key");
  await page
    .getByRole("button", { name: "Workspace", exact: true })
    .first()
    .click();
  // Reuse browser audio metadata independently of network calls.
  await page.evaluate(() => {
    const original = Object.getOwnPropertyDescriptor(
      HTMLMediaElement.prototype,
      "duration",
    );
    Object.defineProperty(HTMLMediaElement.prototype, "duration", {
      get: () => 8,
      configurable: true,
    });
    window.setTimeout(() => {}, 0);
    void original;
  });
  const wav = Buffer.alloc(44 + 16000);
  wav.write("RIFF");
  wav.writeUInt32LE(wav.length - 8, 4);
  wav.write("WAVEfmt ", 8);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(8000, 24);
  wav.writeUInt32LE(16000, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write("data", 36);
  wav.writeUInt32LE(16000, 40);
  await page
    .locator('input[accept^=".mp3"]')
    .setInputFiles({ name: "audio.wav", mimeType: "audio/wav", buffer: wav });
  await expect(page.getByText("Audio loaded.", { exact: true })).toBeVisible();
  await page.route("https://api.openai.com/**", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ text: "سلام دنیا این صدای ویرا است" }),
    }),
  );
  await page
    .getByRole("button", { name: "Generate subtitles", exact: true })
    .click();
  await expect(page.locator('.notification[role="status"]')).toContainText(
    "Subtitles generated.",
  );
  await expect(page.locator(".timing-label")).toContainText("Estimated timing");
  await expect(page.locator(".caption-row")).toHaveCount(2);
});

test("beginner setup explains the key and never asks for audio presets", async ({
  page,
}) => {
  await expect(page.getByLabel("Getting started")).toBeVisible();
  await expect(page.getByLabel("Model", { exact: true })).not.toBeVisible();
  await page
    .getByRole("button", { name: /Connect your speech service/ })
    .click();
  await expect(
    page.getByText("Audio setup is automatic", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /preset/i })).toHaveCount(0);
  await expect(page.getByText(/Your API key is a secret code/)).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Get an OpenAI API key/ }),
  ).toHaveAttribute("href", "https://platform.openai.com/api-keys");
  await page
    .getByRole("button", { name: "Workspace", exact: true })
    .first()
    .click();
  await page.getByText("Change speech service", { exact: true }).click();
  await expect(page.getByLabel("Model", { exact: true })).toBeVisible();
});

test("changing words per line immediately fixes single-word SRT and preserves edits in the download", async ({
  page,
}) => {
  const words = "یک دو سه چهار پنج شش هفت هشت نه ده یازده دوازده".split(" ");
  const input = words
    .map(
      (word, index) =>
        `${index + 1}\n00:00:${String(index).padStart(2, "0")},000 --> 00:00:${String(index).padStart(2, "0")},900\n${word}`,
    )
    .join("\n\n");
  await page.locator('input[accept=".srt"]').setInputFiles({
    name: "word-by-word.srt",
    mimeType: "text/plain",
    buffer: Buffer.from(input),
  });
  await expect(page.locator(".caption-row")).toHaveCount(12);
  await page.getByLabel("Caption text 1", { exact: true }).fill("می‌روم");
  // Keep advanced duration above six seconds so this test isolates the word limit.
  await page.getByText("Advanced settings", { exact: true }).click();
  await page.getByLabel("Maximum duration", { exact: true }).fill("10");
  await page.getByLabel("Maximum lines", { exact: true }).selectOption("1");
  await page.getByLabel("Words per line", { exact: true }).selectOption("1");
  await expect(page.locator(".caption-row")).toHaveCount(12);
  await page.getByLabel("Words per line", { exact: true }).selectOption("6");
  await expect(page.locator(".caption-row")).toHaveCount(2);
  await expect(page.getByLabel("Caption text 1", { exact: true })).toHaveValue(
    "می‌روم دو سه چهار پنج شش",
  );
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export file", exact: true }).click();
  const file = await pending;
  const stream = await file.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  const exported = parseSrt(Buffer.concat(chunks).toString("utf8"));
  expect(exported.map((cue) => cue.text.split(/\s+/).length)).toEqual([6, 6]);
  expect(exported[0]).toMatchObject({
    start: 0,
    end: 5.9,
    text: "می‌روم دو سه چهار پنج شش",
  });
  expect(exported[1]).toMatchObject({ start: 6, end: 11.9 });
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.locator(".caption-row")).toHaveCount(12);
  await expect(page.getByLabel("Words per line", { exact: true })).toHaveValue(
    "1",
  );
});
