import type { ReactElement } from "react";
import { AppLayout } from "./app/layout";
import { ThemeColorProvider } from "./app/themeColor";

export default function App(): ReactElement {
  return (
    <ThemeColorProvider>
      <AppLayout />
    </ThemeColorProvider>
  );
}
