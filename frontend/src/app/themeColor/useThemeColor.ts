import { useContext } from "react";
import { ThemeColorContext } from "./themeContext";
import type { ThemeContextValue } from "./types";

export function useThemeColor(): ThemeContextValue {
  const context = useContext(ThemeColorContext);
  if (!context) {
    throw new Error("useThemeColor must be used within ThemeColorProvider");
  }
  return context;
}
