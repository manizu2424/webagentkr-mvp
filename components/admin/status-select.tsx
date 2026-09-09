"use client";

import { useState, useTransition } from "react";
import { updateConsultationStatus } from "@/app/admin/consultations/[id]/actions";

const OPTIONS: { value: string; label: string }[] = [
  { value: "NEW", label: "신규" },
  { value: "CONTACT_PENDING", label: "연락 예정" },
  { value: "SCHEDULED", label: "일정 확정" },
  { value: "PROPOSAL_SENT", label: "제안 발송" },
  { value: "CONTRACTED", label: "계약" },
  { value: "ON_HOLD", label: "보류" },
  { value: "CLOSED", label: "종료" },
];

export function StatusSelect({
  consultationId,
  current,
}: {
  consultationId: string;
  current: string;
}) {
  const [value, setValue] = useState(current);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const onChange = (next: string) => {
    const prev = value;
    setValue(next);
    setMsg(null);
    startTransition(async () => {
      try {
        const r = await updateConsultationStatus(consultationId, next);
        if ("error" in r) {
          setValue(prev);
          setMsg({ kind: "err", text: r.error });
        } else {
          setMsg({ kind: "ok", text: "저장됨" });
        }
      } catch {
        setValue(prev);
        setMsg({ kind: "err", text: "저장에 실패했습니다. 새로고침 후 다시 시도해 주세요." });
      }
    });
  };

  return (
    <div className="flex items-center gap-2">
      <select
        value={value}
        disabled={pending}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-9 rounded-md border border-line bg-paper px-2 text-[0.85rem] text-ink outline-none focus-visible:border-signal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal disabled:opacity-60"
      >
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {pending && <span className="text-[0.75rem] text-ink-soft">저장 중…</span>}
      {msg && (
        <span className={msg.kind === "ok" ? "text-[0.75rem] text-signal" : "text-[0.75rem] text-danger"}>
          {msg.text}
        </span>
      )}
    </div>
  );
}
