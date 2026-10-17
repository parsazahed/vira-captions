import type { CaptionStyle, Cue } from "./types";
/** Browser text shaping preserves Persian joining and mixed-script bidi order. */
export async function renderCaption(
  cue: Cue,
  style: CaptionStyle,
  width: number,
  height: number,
): Promise<Blob> {
  await document.fonts.ready;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas rendering is unavailable.");
  const scale = height / 1080;
  const size = style.size * scale;
  const lineHeight = size * style.lineHeight;
  ctx.font = `${style.weight} ${size}px "${style.font}"`;
  ctx.textBaseline = "top";
  ctx.textAlign = style.align;
  const rtl =
    style.direction === "rtl" ||
    (style.direction === "auto" && /[\u0590-\u08ff]/.test(cue.text));
  ctx.direction = rtl ? "rtl" : "ltr";
  const lines = cue.text.split("\n");
  const blockHeight = lineHeight * lines.length;
  const y =
    style.position === "top"
      ? height * 0.12
      : style.position === "center"
        ? (height - blockHeight) / 2
        : height * 0.88 - blockHeight;
  const x =
    style.align === "center"
      ? width / 2
      : style.align === "right"
        ? width * 0.92
        : width * 0.08;
  lines.forEach((line, index) => {
    const textWidth = ctx.measureText(line).width;
    if (textWidth > width * 0.84)
      throw new Error(
        "Caption is too wide. Reduce font size or words per line before adding styled overlays.",
      );
    const top = y + index * lineHeight;
    if (top < 0 || top + lineHeight > height)
      throw new Error(
        "Caption exceeds the frame. Reduce font size or line count.",
      );
    if (style.box) {
      const left =
        style.align === "center"
          ? x - textWidth / 2
          : style.align === "right"
            ? x - textWidth
            : x;
      ctx.fillStyle = style.background;
      ctx.fillRect(
        left - 12 * scale,
        top - 2 * scale,
        textWidth + 24 * scale,
        lineHeight,
      );
    }
    ctx.save();
    ctx.fillStyle = style.color;
    ctx.strokeStyle = style.stroke;
    ctx.lineWidth = style.strokeWidth * 2 * scale;
    ctx.lineJoin = "round";
    ctx.shadowColor = "#000000";
    ctx.shadowBlur = style.shadow * scale;
    ctx.shadowOffsetY = (style.shadow / 3) * scale;
    if (style.strokeWidth) ctx.strokeText(line, x, top);
    ctx.fillText(line, x, top);
    ctx.restore();
  });
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("Could not render caption.")),
      "image/png",
    ),
  );
}
