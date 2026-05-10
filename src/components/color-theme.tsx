"use client";

import * as React from "react";
import { COLOR_THEMES, DEFAULT_COLOR_THEME, STORAGE_KEY, type ColorThemeId } from "@/lib/color-themes";

interface Ctx {
  theme: ColorThemeId;
  setTheme: (id: ColorThemeId) => void;
}

const ColorThemeCtx = React.createContext<Ctx | null>(null);

const isValid = (v: string | null): v is ColorThemeId =>
  !!v && COLOR_THEMES.some((t) => t.id === v);

function applyTheme(id: ColorThemeId) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-color-theme", id);
}

export function ColorThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = React.useState<ColorThemeId>(DEFAULT_COLOR_THEME);

  React.useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const initial = isValid(stored) ? stored : DEFAULT_COLOR_THEME;
      setThemeState(initial);
      applyTheme(initial);
    } catch {
      applyTheme(DEFAULT_COLOR_THEME);
    }
  }, []);

  const setTheme = React.useCallback((id: ColorThemeId) => {
    setThemeState(id);
    applyTheme(id);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      // ignore storage failures
    }
  }, []);

  return (
    <ColorThemeCtx.Provider value={{ theme, setTheme }}>{children}</ColorThemeCtx.Provider>
  );
}

export function useColorTheme() {
  const ctx = React.useContext(ColorThemeCtx);
  if (!ctx) throw new Error("useColorTheme must be used inside ColorThemeProvider");
  return ctx;
}

/** Inline script — runs before React hydrates to avoid color flash. */
export const NoFlashScript = `(function(){try{var t=localStorage.getItem('${STORAGE_KEY}');if(t){document.documentElement.setAttribute('data-color-theme',t);}else{document.documentElement.setAttribute('data-color-theme','${DEFAULT_COLOR_THEME}');}}catch(e){document.documentElement.setAttribute('data-color-theme','${DEFAULT_COLOR_THEME}');}})();`;
