// 히어로 비주얼: 실제 자동화 흐름 (기획서 §5 — "AI 로봇 이미지 대신 실제 흐름").
// 분기 파이프라인 — 입력 1 → AI 처리 1 → 출력 3. 노드 라벨은 모노 = 시스템 부품.
// 신호 애니메이션은 globals.css 의 .wak-signal (1-shot, prefers-reduced-motion 가드) 재사용.

const LABEL =
  "자동화 흐름: 문의 접수 → AI 처리 → 담당자 알림·CRM 저장·자동 회신";

const OUTPUTS = [
  { x: 12, cx: 58, label: "담당자 알림" },
  { x: 114, cx: 160, label: "CRM 저장" },
  { x: 216, cx: 262, label: "자동 회신" },
] as const;

export function HeroFlow() {
  return (
    <div
      role="img"
      aria-label={LABEL}
      className="relative mx-auto w-full max-w-[20rem] lg:mx-0"
    >
      {/* 입력 → 처리 커넥터 위를 신호가 1회 통과 (reduced-motion 시 숨김) */}
      <span
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[18%] h-[16%] w-px -translate-x-1/2 overflow-hidden motion-reduce:hidden"
      >
        <span className="wak-signal block h-1/2 w-full bg-gradient-to-b from-transparent via-signal to-transparent" />
      </span>

      <svg
        aria-hidden
        viewBox="0 0 320 300"
        className="block h-auto w-full"
        fontFamily="var(--font-flow)"
      >
        <defs>
          <marker
            id="wak-flow-arrow"
            viewBox="0 0 8 8"
            refX="7"
            refY="4"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M0 0 L8 4 L0 8 Z" fill="var(--wak-line)" />
          </marker>
        </defs>

        {/* 커넥터 */}
        <g
          stroke="var(--wak-line)"
          strokeWidth={1}
          fill="none"
          markerEnd="url(#wak-flow-arrow)"
        >
          <line x1={160} y1={56} x2={160} y2={100} />
          <line x1={58} y1={182} x2={58} y2={232} />
          <line x1={160} y1={182} x2={160} y2={232} />
          <line x1={262} y1={182} x2={262} y2={232} />
        </g>
        {/* 분기 버스 (화살표 없음) */}
        <g stroke="var(--wak-line)" strokeWidth={1} fill="none">
          <line x1={160} y1={148} x2={160} y2={182} />
          <line x1={58} y1={182} x2={262} y2={182} />
        </g>

        {/* 입력 노드 */}
        <rect
          x={100}
          y={16}
          width={120}
          height={40}
          rx={3}
          fill="var(--wak-panel)"
          stroke="var(--wak-line)"
          strokeWidth={1}
        />
        <text
          x={160}
          y={40}
          textAnchor="middle"
          fontSize={11}
          fill="var(--wak-ink)"
        >
          문의 접수
        </text>

        {/* 처리 노드 (강조) */}
        <rect
          x={90}
          y={104}
          width={140}
          height={44}
          rx={3}
          fill="rgb(31 60 230 / 0.06)"
          stroke="var(--wak-signal)"
          strokeWidth={1.5}
        />
        <text
          x={160}
          y={130}
          textAnchor="middle"
          fontSize={11}
          fontWeight={500}
          fill="var(--wak-signal)"
        >
          AI 처리
        </text>

        {/* 출력 노드 3개 */}
        {OUTPUTS.map((o) => (
          <g key={o.label}>
            <rect
              x={o.x}
              y={234}
              width={92}
              height={44}
              rx={3}
              fill="rgb(12 139 119 / 0.06)"
              stroke="var(--wak-resolved)"
              strokeWidth={1}
            />
            <text
              x={o.cx}
              y={260}
              textAnchor="middle"
              fontSize={10}
              fill="var(--wak-resolved)"
            >
              {o.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
