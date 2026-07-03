import { useEffect, useState } from "react";

export function useTicker(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}

export { formatAgo, formatTime, formatDateTime } from "../utils/formatters";
