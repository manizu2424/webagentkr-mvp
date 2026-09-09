"use client";

import { useState, useTransition } from "react";
import { updateConsultationMemo } from "@/app/admin/consultations/[id]/actions";

export function MemoEditor({
  consultationId,
  initial,
}: {
  consultationId: string;
  initial: string;
}) {
  const [value, setValue] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const dirty = value !== saved;

  const onSave = () => {
    setMsg(null);
    startTransition(async () => {
      try {
        const r = await updateConsultationMemo(consultationId, value);
        if ("error" in r) {
          setMsg({ kind: "err", text: r.error });
        } else {
          setSaved(value);
          setMsg({ kind: "ok", text: "저장됨" });
        }
      } catch {
        setMsg({ kind: "err", text: "저장에 실패했습니다. 새로고침 후 다시 시도해 주세요." });
      }
    });
  };

  return (
    <div className="flex flex-col gap-2">
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={5}
        maxLength={5000}
        className="w-full resize-y rounded-md border border-line bg-paper p-3 text-[0.88rem] text-ink outline-none focus-visible:border-signal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
      />
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={!dirty || pending}
          onClick={onSave}
          className="min-h-9 rounded-md bg-signal px-4 text-[0.85rem] font-medium text-white transition-colors hover:bg-[#182fc0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal disabled:opacity-50 motion-reduce:transition-none"
        >
          {pending ? "저장 중…" : "메모 저장"}
        </button>
        {msg && (
          <span className={msg.kind === "ok" ? "text-[0.75rem] text-signal" : "text-[0.75rem] text-danger"}>
            {msg.text}
          </span>
        )}
      </div>
    </div>
  );
}
