import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { themePalettes } from "./palettes";
import { ThemeColorContext } from "./themeContext";
import {
  applyThemeMode,
  readStoredThemeMode,
  writeStoredThemeMode,
} from "./themeStorage";
import type {
  ThemeColorProviderProps,
  ThemeContextValue,
  ThemeMode,
} from "./types";

export function ThemeColorProvider({ children }: ThemeColorProviderProps) {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() =>
    readStoredThemeMode(),
  );

  useEffect(() => {
    applyThemeMode(themeMode);
    writeStoredThemeMode(themeMode);
  }, [themeMode]);

  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemeModeState(mode);
  }, []);

  const toggleThemeMode = useCallback(() => {
    setThemeModeState((current) => (current === "dark" ? "light" : "dark"));
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      themeMode,
      theme: themePalettes[themeMode],
      setThemeMode,
      toggleThemeMode,
    }),
    [setThemeMode, themeMode, toggleThemeMode],
  );

  return (
    <ThemeColorContext.Provider value={value}>
      {children}
    </ThemeColorContext.Provider>
  );
}
