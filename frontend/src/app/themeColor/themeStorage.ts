import { DEFAULT_THEME_MODE, themePalettes } from "./palettes";
import type { ThemeMode, ThemePalette } from "./types";

const THEME_STORAGE_KEY = "driver-safety-theme-mode";

type ThemePaletteKey = keyof Omit<ThemePalette, "mode">;

const THEME_CSS_VARIABLES: ReadonlyArray<[ThemePaletteKey, string]> = [
  ["canvas", "--color-canvas"],
  ["surface", "--color-surface"],
  ["surface1", "--color-surface-1"],
  ["surface2", "--color-surface-2"],
  ["elevated", "--color-elevated"],
  ["hairline", "--color-hairline"],
  ["textPrimary", "--color-text-primary"],
  ["textSecondary", "--color-text-secondary"],
  ["textTertiary", "--color-text-tertiary"],
  ["textInverse", "--color-text-inverse"],
  ["accentActive", "--color-accent-active"],
  ["accentWarn", "--color-accent-warn"],
  ["accentCritical", "--color-accent-critical"],
  ["accentMesh", "--color-accent-mesh"],
  ["subtleBg", "--theme-subtle-bg"],
  ["subtleBgHover", "--theme-subtle-bg-hover"],
  ["subtleBorder", "--theme-subtle-border"],
  ["overlay", "--theme-overlay"],
  ["shadow", "--theme-shadow"],
];

export function isThemeMode(value: string | null): value is ThemeMode {
  return value === "dark" || value === "light";
}

export function readStoredThemeMode(): ThemeMode {
  if (typeof window === "undefined") return DEFAULT_THEME_MODE;

  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isThemeMode(stored) ? stored : DEFAULT_THEME_MODE;
  } catch {
    return DEFAULT_THEME_MODE;
  }
}

export function writeStoredThemeMode(mode: ThemeMode): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, mode);
  } catch {
    // Theme persistence is a nice-to-have; the in-memory theme still applies.
  }
}

export function applyThemeMode(mode: ThemeMode): void {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  const palette = themePalettes[mode];

  root.dataset.theme = mode;
  root.style.colorScheme = mode;

  for (const [paletteKey, cssVariable] of THEME_CSS_VARIABLES) {
    root.style.setProperty(cssVariable, palette[paletteKey]);
  }
}

export function applyInitialThemeMode(): ThemeMode {
  const mode = readStoredThemeMode();
  applyThemeMode(mode);
  return mode;
}
