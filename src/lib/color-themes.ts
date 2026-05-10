// Color themes — each defines primary + accent CSS variables.
// Applied via data-color-theme="<id>" on <html>.

export type ColorThemeId =
  | "emerald"
  | "ocean"
  | "sunset"
  | "midnight"
  | "rose"
  | "amber";

export interface ColorTheme {
  id: ColorThemeId;
  name: string;
  description: string;
  /** Swatches shown in picker (3 colors). */
  swatch: [string, string, string];
}

export const COLOR_THEMES: ColorTheme[] = [
  {
    id: "emerald",
    name: "Emerald",
    description: "Fresh, financial green (default)",
    swatch: ["#10b981", "#34d399", "#065f46"],
  },
  {
    id: "ocean",
    name: "Ocean",
    description: "Cool, calming blue",
    swatch: ["#2563eb", "#60a5fa", "#1e3a8a"],
  },
  {
    id: "sunset",
    name: "Sunset",
    description: "Warm orange and coral",
    swatch: ["#f97316", "#fb923c", "#9a3412"],
  },
  {
    id: "midnight",
    name: "Midnight",
    description: "Deep purple, rich at night",
    swatch: ["#8b5cf6", "#a78bfa", "#4c1d95"],
  },
  {
    id: "rose",
    name: "Rose",
    description: "Soft pink and crimson",
    swatch: ["#e11d48", "#fb7185", "#881337"],
  },
  {
    id: "amber",
    name: "Amber",
    description: "Sunny gold",
    swatch: ["#d97706", "#fbbf24", "#78350f"],
  },
];

export const DEFAULT_COLOR_THEME: ColorThemeId = "emerald";
export const STORAGE_KEY = "duddify-color-theme";
