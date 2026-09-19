import {
  BarChart3, Bot, ClipboardList, FileText, Globe, GraduationCap, Inbox,
  PencilRuler, PenLine, ScanSearch, Sheet, Waypoints, Workflow, Wrench,
  type LucideIcon,
} from "lucide-react";

const MAP = {
  "bar-chart": BarChart3, bot: Bot, "clipboard-list": ClipboardList,
  "file-text": FileText, globe: Globe, "graduation-cap": GraduationCap,
  inbox: Inbox, "pencil-ruler": PencilRuler, "pen-line": PenLine,
  "scan-search": ScanSearch, sheet: Sheet, waypoints: Waypoints,
  workflow: Workflow, wrench: Wrench,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof MAP;

export function Icon({ name, className }: { name: IconName; className?: string }) {
  const C = MAP[name];
  return <C size={22} strokeWidth={1.75} className={className ?? "text-signal"} aria-hidden />;
}
