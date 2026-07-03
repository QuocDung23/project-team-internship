import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  globalIgnores(["dist", "node_modules"]),
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: tseslint,
      parserOptions: {
        ecmaFeatures: { jsx: true },
        sourceType: "module",
        ecmaVersion: 2022,
      },
      globals: globals.browser,
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...reactHooks.configs.flat.recommended.rules,
      ...tsPlugin.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
  {
    // Plain JS config files (eslint.config.js, vite.config.ts) - relaxed.
    files: ["*.{js,mjs,cjs}", "vite.config.ts"],
    languageOptions: {
      parser: tseslint,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
      },
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
]);