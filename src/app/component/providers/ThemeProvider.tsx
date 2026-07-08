import {
  useEffect,
  useState,
  createContext,
  useContext,
  useCallback,
  type ReactNode,
} from "react";
import {
  getEffectiveTheme,
  initializeTheme,
  subscribeToSystemTheme,
  setTheme as setThemeUtil,
  toggleTheme as toggleThemeUtil,
  type Theme,
} from "../../utils/themeColor";

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  isDark: boolean;
}

const defaultContext: ThemeContextValue = {
  theme: "dark",
  toggleTheme: () => {},
  setTheme: () => {},
  isDark: true,
};

const ThemeContext = createContext<ThemeContextValue>(defaultContext);

interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: Theme;
}

export function ThemeProvider({ children, defaultTheme }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme ?? "dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const initial = initializeTheme();
    setThemeState(initial);

    // Listen for system theme changes
    const unsubscribe = subscribeToSystemTheme((newTheme) => {
      setThemeState(newTheme);
    });

    return unsubscribe;
  }, []);

  const toggleTheme = useCallback(() => {
    const next = toggleThemeUtil();
    setThemeState(next);
  }, []);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeUtil(newTheme);
    setThemeState(newTheme);
  }, []);

  const contextValue: ThemeContextValue = {
    theme,
    toggleTheme,
    setTheme,
    isDark: theme === "dark",
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {mounted ? children : <div style={{ visibility: "hidden" }}>{children}</div>}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}

/**
 * Hook for theme-aware components without requiring provider context
 * Falls back to current document theme attribute
 */
export function useThemeVariables(): {
  theme: Theme;
  isDark: boolean;
} {
  const [theme, setThemeState] = useState<Theme>("dark");

  useEffect(() => {
    setThemeState(getEffectiveTheme());

    // Watch for theme changes
    const observer = new MutationObserver(() => {
      const currentTheme = document.documentElement.getAttribute(
        "data-theme",
      ) as Theme;
      if (currentTheme) {
        setThemeState(currentTheme);
      }
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => observer.disconnect();
  }, []);

  return { theme, isDark: theme === "dark" };
}
