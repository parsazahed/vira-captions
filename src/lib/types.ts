export type Locale = "en" | "fa";
export type Provider = "openai" | "groq" | "deepgram" | "custom";
export interface Word {
  text: string;
  start: number;
  end: number;
}
export interface Cue {
  id: string;
  start: number;
  end: number;
  text: string;
}
export interface Transcript {
  words: Word[];
  timing: "native" | "estimated";
}
export interface CaptionStyle {
  font: string;
  size: number;
  weight: number;
  color: string;
  stroke: string;
  strokeWidth: number;
  shadow: number;
  background: string;
  box: boolean;
  position: "bottom" | "center" | "top";
  align: "center" | "right" | "left";
  direction: "auto" | "rtl" | "ltr";
  lineHeight: number;
}
export interface ParagraphSettings {
  wordsPerLine: number;
  maxLines: number;
  maxDuration: number;
  gap: number;
  normalize: boolean;
  digits: "original" | "persian" | "latin";
}
export interface TranscriptionSettings {
  provider: Provider;
  model: string;
  key: string;
  endpoint: string;
  language: string;
  prompt: string;
  temperature: number;
  keywords?: string;
  extraLanguages?: string;
}
export interface MediaSource {
  name: string;
  duration: number;
  offset: number;
  blob: Blob;
  previewUrl?: string;
  sequenceId?: string;
}
export const defaultStyle: CaptionStyle = {
  font: "Vazirmatn Variable",
  size: 56,
  weight: 700,
  color: "#ffffff",
  stroke: "#17191e",
  strokeWidth: 2,
  shadow: 5,
  background: "#17191e",
  box: false,
  position: "bottom",
  align: "center",
  direction: "auto",
  lineHeight: 1.5,
};
export const defaultParagraph: ParagraphSettings = {
  wordsPerLine: 6,
  maxLines: 2,
  maxDuration: 5,
  gap: 0.7,
  normalize: true,
  digits: "original",
};
