import { createContext } from "react";
import type { ThemeContextValue } from "./types";

export const ThemeColorContext = createContext<ThemeContextValue | null>(null);
