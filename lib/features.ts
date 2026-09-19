// 기능 플래그. 환경변수가 아니라 상수 — NEXT_PUBLIC_* 는 빌드 시점에 고정되어
// Docker build args 를 빼먹으면 조용히 무효화된다(PR #19 사례). 사례를 채우려면 어차피 코드 배포가 필요하다.

/** 자동화 사례 메뉴·페이지. 실제 고객 사례가 생기면 true 로 바꾸고 재배포한다. */
export const CASES_ENABLED = false;

/** 플래그가 꺼져 있으면 /cases 링크를 걸러낸다. */
export function withCasesGate<T extends { href: string }>(
  links: readonly T[],
  enabled: boolean = CASES_ENABLED,
): T[] {
  return links.filter((l) => l.href !== "/cases" || enabled);
}
