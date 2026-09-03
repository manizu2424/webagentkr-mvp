/**
 * 프로세스 인메모리 rate limit (기술 스펙 §5).
 *
 * 단일 컨테이너 배포 전제이므로 Redis 를 두지 않는다. 컨테이너 재시작 시
 * 카운터가 초기화되는 건 MVP 단계의 허용 트레이드오프. 인스턴스를 여러 개로
 * 늘리면 supabase/migrations 의 submission_log 테이블 기반으로 교체한다.
 *
 * 키는 IP 가 아니라 호출부에서 lib/clientIp.getClientIp() 로 만든 실제 IP 를 넘긴다 (결함 #2).
 */

const hits = new Map<string, number[]>();

export interface RateLimitResult {
  ok: boolean;
  /** 이번 요청까지 포함해 남은 허용 건수 */
  remaining: number;
  /** ok=false 일 때, 다음 요청이 가능해지기까지의 초 (Retry-After 헤더용) */
  retryAfterSec: number;
}

const DEFAULT_LIMIT = 5;
const DEFAULT_WINDOW_MS = 60 * 60 * 1000; // 1시간

export function checkRateLimit(
  key: string,
  limit: number = DEFAULT_LIMIT,
  windowMs: number = DEFAULT_WINDOW_MS,
): RateLimitResult {
  const now = Date.now();
  const cutoff = now - windowMs;

  const recent = (hits.get(key) ?? []).filter((t) => t > cutoff);

  if (recent.length >= limit) {
    hits.set(key, recent);
    const retryAfterSec = Math.max(
      1,
      Math.ceil((recent[0] + windowMs - now) / 1000),
    );
    return { ok: false, remaining: 0, retryAfterSec };
  }

  recent.push(now);
  hits.set(key, recent);
  maybePrune(windowMs);

  return { ok: true, remaining: limit - recent.length, retryAfterSec: 0 };
}

/**
 * 만료 엔트리 정리 (결함 #19). 안 하면 방문 IP 마다 엔트리가 무한 누적된다.
 * 매 호출마다 전체를 훑는 건 낭비이므로 5분에 한 번만.
 */
let lastPrune = 0;
function maybePrune(windowMs: number) {
  const now = Date.now();
  if (now - lastPrune < 5 * 60 * 1000) return;
  lastPrune = now;

  const cutoff = now - windowMs;
  for (const [k, times] of hits) {
    const kept = times.filter((t) => t > cutoff);
    if (kept.length === 0) hits.delete(k);
    else hits.set(k, kept);
  }
}

/** 테스트 전용 — 카운터 초기화 */
export function __resetRateLimit(): void {
  hits.clear();
  lastPrune = 0;
}
