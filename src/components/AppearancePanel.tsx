import { RefreshCw, SlidersHorizontal } from "lucide-react";
import { Color, Field, Select, Slider, Toggle } from "./Controls";
import type { CaptionStyle } from "../lib/types";
const presetStyles: Record<string, Partial<CaptionStyle>> = {
  Clean: {
    color: "#ffffff",
    strokeWidth: 2,
    shadow: 5,
    box: false,
    weight: 700,
  },
  Cinema: {
    color: "#fff1cf",
    strokeWidth: 1,
    shadow: 3,
    box: false,
    weight: 500,
  },
  Highlight: {
    color: "#17191e",
    strokeWidth: 4,
    shadow: 0,
    box: true,
    background: "#d9ccff",
    weight: 800,
  },
};
interface Props {
  t: (key: string) => string;
  style: CaptionStyle;
  updateStyle: <K extends keyof CaptionStyle>(
    key: K,
    value: CaptionStyle[K],
  ) => void;
  onPreset: (value: Partial<CaptionStyle>) => void;
  onReset: () => void;
}
export function AppearancePanel({
  t,
  style,
  updateStyle,
  onPreset,
  onReset,
}: Props) {
  return (
    <aside className="appearance-panel panel">
      <div className="panel-heading">
        <h2>
          <SlidersHorizontal size={16} />
          {t("Appearance")}
        </h2>
        <button
          className="icon-button"
          aria-label={t("Clean")}
          title={t("Clean")}
          onClick={() => {
            onReset();
          }}
        >
          <RefreshCw size={14} />
        </button>
      </div>
      <section className="presets-section">
        <span className="field-label">{t("Presets")}</span>
        <div className="style-presets">
          {Object.keys(presetStyles).map((name, index) => (
            <button
              key={name}
              className={`style-preset preset-${index}`}
              onClick={() => {
                onPreset(presetStyles[name]);
              }}
            >
              <span className="preset-type">Aa</span>
              <span>{t(name)}</span>
            </button>
          ))}
        </div>
      </section>
      <section>
        <h3>{t("Typography")}</h3>
        <Select
          label={t("Font family")}
          value={style.font}
          onChange={(v) => updateStyle("font", v)}
          options={[
            "Vazirmatn Variable",
            "Manrope Variable",
            "Arial",
            "Tahoma",
            "Georgia",
          ].map((v) => [v, v.replace(" Variable", "")])}
        />
        <div className="two-fields">
          <Field label={t("Size")}>
            <div className="number-unit">
              <input
                aria-label={t("Size")}
                type="number"
                min={20}
                max={120}
                value={style.size}
                onChange={(e) =>
                  updateStyle(
                    "size",
                    Math.min(120, Math.max(20, +e.target.value)),
                  )
                }
              />
              <span>px</span>
            </div>
          </Field>
          <Select
            label={t("Weight")}
            value={style.weight}
            onChange={(v) => updateStyle("weight", +v)}
            options={[
              [500, "Medium"],
              [700, "Bold"],
              [800, "Extra bold"],
            ].map(([v, l]) => [String(v), t(l as string)])}
          />
        </div>
        <Color
          label={t("Text color")}
          value={style.color}
          onChange={(v) => updateStyle("color", v)}
        />
        <Slider
          label={t("Line height")}
          value={style.lineHeight}
          min={1}
          max={2}
          step={0.1}
          onChange={(v) => updateStyle("lineHeight", v)}
        />
      </section>
      <section>
        <h3>{t("Stroke & shadow")}</h3>
        <Color
          label={t("Stroke color")}
          value={style.stroke}
          onChange={(v) => updateStyle("stroke", v)}
        />
        <Slider
          label={t("Stroke width")}
          value={style.strokeWidth}
          min={0}
          max={8}
          unit="px"
          onChange={(v) => updateStyle("strokeWidth", v)}
        />
        <Slider
          label={t("Shadow")}
          value={style.shadow}
          min={0}
          max={16}
          unit="px"
          onChange={(v) => updateStyle("shadow", v)}
        />
        <Toggle
          label={t("Background box")}
          value={style.box}
          onChange={(v) => updateStyle("box", v)}
        />
        {style.box && (
          <Color
            label={t("Background color")}
            value={style.background}
            onChange={(v) => updateStyle("background", v)}
          />
        )}
      </section>
      <section>
        <h3>{t("Layout")}</h3>
        <Select
          label={t("Position")}
          value={style.position}
          onChange={(v) =>
            updateStyle("position", v as CaptionStyle["position"])
          }
          options={["bottom", "center", "top"].map((v) => [
            v,
            t(v[0].toUpperCase() + v.slice(1)),
          ])}
        />
        <Select
          label={t("Alignment")}
          value={style.align}
          onChange={(v) => updateStyle("align", v as CaptionStyle["align"])}
          options={["left", "center", "right"].map((v) => [
            v,
            t(v[0].toUpperCase() + v.slice(1)),
          ])}
        />
        <Select
          label={t("Text direction")}
          value={style.direction}
          onChange={(v) =>
            updateStyle("direction", v as CaptionStyle["direction"])
          }
          options={["auto", "rtl", "ltr"].map((v, i) => [
            v,
            t(["Automatic", "Right to left", "Left to right"][i]),
          ])}
        />
      </section>
    </aside>
  );
}
