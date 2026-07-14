import type { ReactNode } from "react";

export type ThemeMode = "dark" | "light";

export interface ThemePalette {
  mode: ThemeMode;
  canvas: string;
  surface: string;
  surface1: string;
  surface2: string;
  elevated: string;
  hairline: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textInverse: string;
  accentActive: string;
  accentWarn: string;
  accentCritical: string;
  accentMesh: string;
  subtleBg: string;
  subtleBgHover: string;
  subtleBorder: string;
  overlay: string;
  shadow: string;
}

export interface ThemeContextValue {
  themeMode: ThemeMode;
  theme: ThemePalette;
  setThemeMode: (mode: ThemeMode) => void;
  toggleThemeMode: () => void;
}

export interface ThemeColorProviderProps {
  children: ReactNode;
}
