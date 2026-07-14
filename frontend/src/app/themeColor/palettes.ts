import type { ThemeMode, ThemePalette } from "./types";

export const DEFAULT_THEME_MODE: ThemeMode = "dark";

export const darkTheme: ThemePalette = {
  mode: "dark",
  canvas: "#0a0e14",
  surface: "#11161d",
  surface1: "#11161d",
  surface2: "#161c25",
  elevated: "#151b24",
  hairline: "#1f2630",
  textPrimary: "#e4e7ec",
  textSecondary: "#7d8590",
  textTertiary: "#5a626d",
  textInverse: "#0a0e14",
  accentActive: "#10b981",
  accentWarn: "#f59e0b",
  accentCritical: "#ef4444",
  accentMesh: "#facc15",
  subtleBg: "rgb(255 255 255 / 0.02)",
  subtleBgHover: "rgb(255 255 255 / 0.04)",
  subtleBorder: "rgb(255 255 255 / 0.06)",
  overlay: "rgba(3, 7, 18, 0.82)",
  shadow: "rgba(0, 0, 0, 0.40)",
};

export const lightTheme: ThemePalette = {
  mode: "light",
  canvas: "#f6f3ee",
  surface: "#fffdf9",
  surface1: "#faf7f2",
  surface2: "#eee8df",
  elevated: "#fffefa",
  hairline: "#ded6cc",
  textPrimary: "#23211d",
  textSecondary: "#5f574e",
  textTertiary: "#918579",
  textInverse: "#ffffff",
  accentActive: "#047857",
  accentWarn: "#b45309",
  accentCritical: "#dc2626",
  accentMesh: "#b7791f",
  subtleBg: "rgb(88 67 43 / 0.045)",
  subtleBgHover: "rgb(88 67 43 / 0.075)",
  subtleBorder: "rgb(88 67 43 / 0.13)",
  overlay: "rgba(35, 29, 22, 0.42)",
  shadow: "rgba(88, 67, 43, 0.16)",
};

export const themePalettes: Record<ThemeMode, ThemePalette> = {
  dark: darkTheme,
  light: lightTheme,
};
