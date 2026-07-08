import { useTheme } from "../providers/ThemeProvider";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={`
        relative w-10 h-10 rounded-full
        flex items-center justify-center
        transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]
        hover:scale-105 active:scale-95
        focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
        ${className}
      `}
      style={
        {
          backgroundColor: "var(--color-surface)",
          border: "1px solid var(--color-hairline)",
          "--tw-ring-color": "var(--color-focus-ring)",
        } as React.CSSProperties
      }
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
    >
      {/* Sun icon (shown in dark mode) */}
      <svg
        className={`w-5 h-5 transition-all duration-300 ${
          theme === "dark"
            ? "opacity-100 rotate-0"
            : "opacity-0 rotate-90 absolute"
        }`}
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        style={{ color: "var(--color-text-primary)" }}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z"
        />
      </svg>

      {/* Moon icon (shown in light mode) */}
      <svg
        className={`w-5 h-5 transition-all duration-300 ${
          theme === "light"
            ? "opacity-100 rotate-0"
            : "opacity-0 -rotate-90 absolute"
        }`}
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        style={{ color: "var(--color-text-primary)" }}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z"
        />
      </svg>
    </button>
  );
}
