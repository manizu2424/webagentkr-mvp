import { cn } from "@/lib/utils";

const CONSULTATION: Record<string, { label: string; cls: string }> = {
  NEW: { label: "신규", cls: "bg-signal/10 text-signal" },
  CONTACT_PENDING: { label: "연락 예정", cls: "bg-panel text-ink border border-line" },
  SCHEDULED: { label: "일정 확정", cls: "bg-panel text-ink border border-line" },
  PROPOSAL_SENT: { label: "제안 발송", cls: "bg-panel text-ink border border-line" },
  CONTRACTED: { label: "계약", cls: "bg-signal text-white" },
  ON_HOLD: { label: "보류", cls: "bg-panel text-ink-soft border border-line" },
  CLOSED: { label: "종료", cls: "bg-panel text-ink-soft border border-line" },
};

const DIAGNOSIS: Record<string, { label: string; cls: string }> = {
  SUBMITTED: { label: "접수", cls: "bg-panel text-ink border border-line" },
  PROCESSING: { label: "분석 중", cls: "bg-panel text-ink border border-line" },
  COMPLETED: { label: "완료", cls: "bg-signal/10 text-signal" },
  FAILED: { label: "실패", cls: "bg-danger/[0.08] text-danger" },
};

export function StatusBadge({
  kind,
  value,
}: {
  kind: "consultation" | "diagnosis";
  value: string;
}) {
  const map = kind === "consultation" ? CONSULTATION : DIAGNOSIS;
  const hit = map[value] ?? { label: value, cls: "bg-panel text-ink-soft border border-line" };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[0.72rem] font-medium whitespace-nowrap",
        hit.cls,
      )}
    >
      {hit.label}
    </span>
  );
}
