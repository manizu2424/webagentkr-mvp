import {
  ArrowLeftRight, BarChart3, Bot, ClipboardCheck, ClipboardList, Eye,
  FileText, Globe, GraduationCap, Inbox, Layers, LayoutGrid, LifeBuoy,
  MessagesSquare, PencilRuler, PenLine, Play, RefreshCw, Route, ScanSearch,
  Sheet, ShieldCheck, TriangleAlert, Waypoints, Workflow, Wrench,
  type LucideIcon,
} from "lucide-react";

const MAP = {
  "arrow-left-right": ArrowLeftRight, "bar-chart": BarChart3, bot: Bot,
  "clipboard-check": ClipboardCheck, "clipboard-list": ClipboardList, eye: Eye,
  "file-text": FileText, globe: Globe, "graduation-cap": GraduationCap,
  inbox: Inbox, layers: Layers, "layout-grid": LayoutGrid, "life-buoy": LifeBuoy,
  "messages-square": MessagesSquare, "pencil-ruler": PencilRuler, "pen-line": PenLine,
  play: Play, "refresh-cw": RefreshCw, route: Route, "scan-search": ScanSearch,
  sheet: Sheet, "shield-check": ShieldCheck, "triangle-alert": TriangleAlert,
  waypoints: Waypoints, workflow: Workflow, wrench: Wrench,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof MAP;

export function Icon({ name, className }: { name: IconName; className?: string }) {
  const C = MAP[name];
  return <C size={22} strokeWidth={1.75} className={className ?? "text-signal"} aria-hidden />;
}
