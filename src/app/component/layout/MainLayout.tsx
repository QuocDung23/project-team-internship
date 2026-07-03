// Root layout for the operations console. Pins the Sidebar on the left and
// streams the routed page into the content column. Bootstrap of the mock
// socket happens here once so every child route can subscribe to telemetry.

import { useEffect, type ReactElement, type ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { bootstrapFleet } from "../../store/fleetStore";

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps): ReactElement {
  useEffect(() => {
    bootstrapFleet();
  }, []);

  return (
    <div className="flex min-h-dvh bg-canvas text-zinc-100">
      <Sidebar />
      <main className="flex min-w-0 flex-1 flex-col">{children}</main>
    </div>
  );
}