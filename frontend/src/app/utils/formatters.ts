export function formatAgo(
  ts: number,
  now: number,
  labels: { justNow: string; secondsAgo: string; minutesAgo: string; hoursAgo: string } = {
    justNow: "Just now",
    secondsAgo: "{{count}}s ago",
    minutesAgo: "{{count}}m ago",
    hoursAgo: "{{count}}h ago",
  },
): string {
  const diff = Math.max(0, now - ts);
  const sec = Math.floor(diff / 1000);
  if (sec < 5) return labels.justNow;
  if (sec < 60) return labels.secondsAgo.replace("{{count}}", String(sec));
  const min = Math.floor(sec / 60);
  if (min < 60) return labels.minutesAgo.replace("{{count}}", String(min));
  const hr = Math.floor(min / 60);
  return labels.hoursAgo.replace("{{count}}", String(hr));
}

export function formatTime(ts: number): string {
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

export function formatDateTime(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")} ${formatTime(ts)}`;
}
