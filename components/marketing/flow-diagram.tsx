// 히어로 비주얼: 실제 자동화 흐름 (기획서 §5 — "AI 로봇 이미지 대신 실제 흐름").
// 세로 파이프라인 — 페이지 커넥터 스파인과 같은 시각 언어. 노드 라벨은 모노 = 시스템 부품.
const NODES = [
  { label: "문의", kind: "입력" },
  { label: "AI 분류", kind: "처리" },
  { label: "DB 저장", kind: "처리" },
  { label: "담당자 알림", kind: "처리" },
  { label: "답변 초안", kind: "출력" },
] as const;

export function FlowDiagram() {
  return (
    <div
      role="img"
      aria-label={`자동화 흐름: ${NODES.map((n) => n.label).join(" 다음 ")}`}
      className="relative pl-6"
    >
      {/* 연속 커넥터 라인 + 로드 시 신호 1회 */}
      <span
        aria-hidden
        className="absolute top-3 bottom-3 left-[3px] w-px overflow-hidden bg-signal/30"
      >
        <span className="wak-signal absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-transparent via-signal to-transparent" />
      </span>
      <ul className="flex flex-col gap-3">
        {NODES.map((node, i) => {
          const isOutput = node.kind === "출력";
          return (
            <li key={node.label} className="relative">
              <span
                aria-hidden
                className={`absolute top-1/2 -left-[calc(1.5rem-1px)] size-[7px] -translate-y-1/2 rotate-45 ${
                  isOutput ? "bg-resolved" : "bg-signal"
                }`}
              />
              <div
                className={`flex items-center justify-between border px-4 py-3.5 ${
                  isOutput
                    ? "border-resolved/40 bg-resolved/[0.06]"
                    : "border-line bg-panel"
                }`}
              >
                <span className="text-[0.95rem] font-medium text-ink">
                  {node.label}
                </span>
                <span
                  className={`font-flow text-[0.68rem] tracking-tight ${
                    isOutput ? "text-resolved" : "text-ink-soft"
                  }`}
                >
                  {String(i + 1).padStart(2, "0")} · {node.kind}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
