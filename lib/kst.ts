// 표시·집계용 KST(Asia/Seoul) 날짜 헬퍼. 배포지(독일 VPS)는 컨테이너 TZ 미지정 → 사실상 UTC 라
// Date.slice / setHours 는 하루 어긋난다. 여기를 단일 소스로 쓴다.
const KST_DATE = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul" }); // "YYYY-MM-DD"

/** ISO 문자열 → KST 기준 "YYYY-MM-DD" */
export function kstDate(iso: string): string {
  return KST_DATE.format(new Date(iso));
}

/** 지금(KST) 자정의 ISO 문자열 — created_at >= 이 값 으로 "오늘" 집계 */
export function kstTodayStartIso(): string {
  return new Date(`${kstDate(new Date().toISOString())}T00:00:00+09:00`).toISOString();
}
