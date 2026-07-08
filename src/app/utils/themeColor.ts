export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'theme-preference';

/**
 * Get current theme from storage or system preference
 */
export function getStoredTheme(): Theme | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(STORAGE_KEY) as Theme | null;
}

/**
 * Check if user's system prefers dark mode
 */
export function getSystemPreference(): Theme {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * Get the effective theme (stored > system preference)
 */
export function getEffectiveTheme(): Theme {
  return getStoredTheme() ?? getSystemPreference();
}

/**
 * Apply theme to document root
 */
export function applyTheme(theme: Theme): void {
  if (typeof document === 'undefined') return;
  
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(STORAGE_KEY, theme);
}

/**
 * Toggle between light and dark mode
 */
export function toggleTheme(): Theme {
  const current = getEffectiveTheme();
  const next = current === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  return next;
}

/**
 * Set specific theme
 */
export function setTheme(theme: Theme): void {
  applyTheme(theme);
}

/**
 * Initialize theme on app load
 * Call this once in your app's root
 */
export function initializeTheme(): Theme {
  const theme = getEffectiveTheme();
  applyTheme(theme);
  return theme;
}

/**
 * Subscribe to system theme changes
 * Returns cleanup function
 */
export function subscribeToSystemTheme(callback: (theme: Theme) => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  
  const handler = (e: MediaQueryListEvent) => {
    // Only update if user hasn't set explicit preference
    if (!getStoredTheme()) {
      callback(e.matches ? 'dark' : 'light');
    }
  };

  mediaQuery.addEventListener('change', handler);
  return () => mediaQuery.removeEventListener('change', handler);
}

/**
 * Check if current theme is dark
 */
export function isDarkMode(): boolean {
  return getEffectiveTheme() === 'dark';
}
