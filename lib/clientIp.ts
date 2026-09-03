/**
 * 실제 클라이언트 IP 추출 (결함 #2).
 *
 * 배포 구성: Cloudflare → Nginx Proxy Manager → web(127.0.0.1:3000).
 * 따라서 요청 소켓 주소는 항상 프록시의 것이고, 그대로 rate limit 키로 쓰면
 * 전 세계 방문자가 한 버킷을 공유해 사이트 전체가 시간당 5건으로 막힌다.
 *
 * web 컨테이너 포트는 127.0.0.1 에만 바인딩되어(결함 #4) 외부 요청은 반드시
 * 프록시를 거치므로, 프록시가 붙이는 헤더를 신뢰한다.
 * 우선순위: cf-connecting-ip > x-real-ip > x-forwarded-for(첫 항목).
 */
export function getClientIp(req: Request): string {
  const h = req.headers;

  const cf = h.get("cf-connecting-ip");
  if (cf) return cf.trim();

  const real = h.get("x-real-ip");
  if (real) return real.trim();

  const xff = h.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }

  return "unknown";
}
