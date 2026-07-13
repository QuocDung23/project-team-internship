import { AlertTriangle, CheckCircle, Frown } from "lucide-react";
import type { FleetAlertEvent } from "../../types/alerts";
import { formatTime } from "../../hook/useTicker";
import AlertRow from "./AlertRow";

const DROWSINESS_GROUP_SIZE = 3;
const DROWSINESS_GROUP_WINDOW_MS = 5 * 60 * 1000;

interface AlertGroup {
  id: string;
  events: FleetAlertEvent[];
}

type AlertListItem =
  | { kind: "single"; event: FleetAlertEvent }
  | { kind: "group"; group: AlertGroup };

interface AlertListProps {
  events: FleetAlertEvent[];
  acknowledgingId?: string | null;
  onAcknowledge?: (event: FleetAlertEvent) => void;
  onAcknowledgeGroup?: (events: FleetAlertEvent[], groupId: string) => void;
}

export default function AlertList({
  events,
  acknowledgingId = null,
  onAcknowledge,
  onAcknowledgeGroup,
}: AlertListProps) {
  if (events.length === 0) {
    return (
      <div className="panel flex flex-col items-center justify-center gap-3 py-16">
        <AlertTriangle size={32} className="text-zinc-600" />
        <p className="text-[13px] text-zinc-500">
          Không có cảnh báo nào phù hợp
        </p>
      </div>
    );
  }

  const items = groupDrowsinessAlerts(events);

  return (
    <div className="flex flex-1 flex-col gap-2 overflow-y-auto">
      {items.map((item) => {
        if (item.kind === "group") {
          return (
            <DrowsinessGroupRow
              key={item.group.id}
              group={item.group}
              isAcknowledging={acknowledgingId === item.group.id}
              onAcknowledgeGroup={onAcknowledgeGroup}
            />
          );
        }

        return (
          <AlertRow
            key={item.event.id}
            event={item.event}
            isAcknowledging={acknowledgingId === item.event.id}
            onAcknowledge={onAcknowledge}
          />
        );
      })}
    </div>
  );
}

function groupDrowsinessAlerts(events: FleetAlertEvent[]): AlertListItem[] {
  const used = new Set<string>();
  const groupsByFirstId = new Map<string, AlertGroup>();
  const ordered = [...events].sort((a, b) => b.timestamp - a.timestamp);
  const candidates = ordered.filter(
    (event) => event.type === "drowsiness_alert" && !event.acknowledged,
  );

  for (const event of candidates) {
    if (used.has(event.id)) continue;

    const groupEvents = candidates.filter(
      (candidate) =>
        !used.has(candidate.id)
        && candidate.driverId === event.driverId
        && Math.abs(candidate.timestamp - event.timestamp) <= DROWSINESS_GROUP_WINDOW_MS,
    ).slice(0, DROWSINESS_GROUP_SIZE);

    if (groupEvents.length === DROWSINESS_GROUP_SIZE) {
      groupEvents.forEach((groupEvent) => used.add(groupEvent.id));
      groupsByFirstId.set(groupEvents[0]!.id, {
        id: `drowsiness-group:${groupEvents.map((groupEvent) => groupEvent.id).join(":")}`,
        events: groupEvents,
      });
    }
  }

  const items: AlertListItem[] = [];
  for (const event of events) {
    const group = groupsByFirstId.get(event.id);
    if (group) {
      items.push({ kind: "group", group });
      continue;
    }
    if (used.has(event.id)) continue;
    items.push({ kind: "single", event });
  }
  return items;
}

function DrowsinessGroupRow({
  group,
  isAcknowledging,
  onAcknowledgeGroup,
}: {
  group: AlertGroup;
  isAcknowledging: boolean;
  onAcknowledgeGroup?: (events: FleetAlertEvent[], groupId: string) => void;
}) {
  const newest = Math.max(...group.events.map((event) => event.timestamp));
  const oldest = Math.min(...group.events.map((event) => event.timestamp));
  const first = group.events[0]!;
  const isCritical = group.events.some((event) => event.severity === "critical");

  return (
    <div
      className={`flex flex-col gap-2 rounded-lg border p-3.5 transition-colors ${
        isCritical
          ? "border-red-500/25 bg-red-500/5"
          : "border-amber-500/20 bg-amber-500/5"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-white ${
            isCritical ? "bg-red-500/30" : "bg-amber-500/20"
          }`}
          >
            <Frown size={14} />
          </span>
          <div>
            <p className="text-[12px] font-medium text-zinc-100">
              3 cảnh báo buồn ngủ
            </p>
            <p className="font-mono-num text-[10px] text-zinc-500">
              {first.driverName} · {first.licensePlate}
            </p>
          </div>
        </div>
        <span className="font-mono-num text-[10px] text-zinc-500">
          {formatTime(newest)}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-zinc-400">
        <span>Gom 3 cảnh báo gần nhau</span>
        <span className="font-mono-num">
          {formatTime(oldest)} - {formatTime(newest)}
        </span>
      </div>

      {onAcknowledgeGroup ? (
        <button
          type="button"
          onClick={() => onAcknowledgeGroup(group.events, group.id)}
          disabled={isAcknowledging}
          className="inline-flex w-fit items-center gap-1 rounded-md border border-emerald-500/25 bg-emerald-500/10 px-2 py-1 text-[10px] font-medium text-emerald-300 transition-colors hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <CheckCircle size={11} />
          {isAcknowledging ? "Đang xác nhận" : "Xác nhận nhóm"}
        </button>
      ) : null}
    </div>
  );
}
