import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { I18nextProvider } from "react-i18next";
import "./app/assets/styles/index.css";
import App from "./App";
import { i18n, initializeI18n } from "./app/i18n";
import { applyInitialThemeMode } from "./app/themeColor";

async function bootstrap(): Promise<void> {
  applyInitialThemeMode();
  await initializeI18n();

  const rootEl = document.getElementById("root");
  if (!rootEl) throw new Error("Root element #root not found in index.html");

  createRoot(rootEl).render(
    <StrictMode>
      <I18nextProvider i18n={i18n}>
        <App />
      </I18nextProvider>
    </StrictMode>,
  );
}

void bootstrap();
