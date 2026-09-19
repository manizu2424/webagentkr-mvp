// 배경 도트 그리드 — 순수 장식(aria-hidden). 색은 currentColor 로 받아 래퍼의 text-* 토큰에 위임한다.
export function GridTexture({ className }: { className?: string }) {
  return (
    <svg aria-hidden className={className} width="100%" height="100%">
      <defs>
        <pattern
          id="wak-grid"
          width="28"
          height="28"
          patternUnits="userSpaceOnUse"
        >
          <circle cx="1" cy="1" r="1" fill="currentColor" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#wak-grid)" />
    </svg>
  );
}
