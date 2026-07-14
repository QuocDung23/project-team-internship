import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./app/assets/styles/index.css";
import App from "./App";
import { applyInitialThemeMode } from "./app/themeColor";

applyInitialThemeMode();

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("Root element #root not found in index.html");

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
