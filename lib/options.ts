/**
 * 폼 select 선택지의 단일 소스 (decisions.md D2).
 *
 * ⚠️ 여기 문자열이 그대로 DB 에 저장된다. 라벨을 수정하면 기존 행과 어긋나므로
 *    데이터 마이그레이션이 필요하다. 폼 · zod(lib/validation.ts) · 서비스 태깅
 *    (lib/serviceTagging.ts) · AI 프롬프트가 전부 여기서 읽는다. 값을 하드코딩하지 말 것.
 */
export const OPTIONS = {
  // 업종 — 기획서 §2 초기 집중 업종 우선순위 순
  industry: [
    "건설·인테리어",
    "부동산",
    "전문서비스(법무·세무·회계·노무)",
    "교육·학원",
    "컨설팅",
    "제조",
    "유통·도소매",
    "의료·보건",
    "IT·소프트웨어",
    "요식·숙박",
    "1인 기업·프리랜서",
    "기타",
  ],

  // 직원 수 — 타깃은 5~50명이나 1인 기업도 타깃(§2)이므로 하단 구간 포함
  employeeCount: ["1-4명", "5-10명", "11-30명", "31-50명", "51-100명", "100명 이상"],

  // 홈페이지 유무
  websiteStatus: ["없음", "있음 (운영 중)", "있으나 방치 상태", "제작·개편 예정"],

  // 사용 도구 (복수 선택) — 기획서 §7, 변경 없음
  currentTools: [
    "Excel",
    "Google Sheets",
    "이메일",
    "카카오톡",
    "ERP",
    "CRM",
    "WordPress",
    "네이버",
    "Slack",
    "Telegram",
    "기타",
  ],

  // 반복 업무 (복수 선택) — 기획서 §7, 변경 없음
  repetitiveTasks: [
    "문의",
    "견적",
    "고객정보",
    "이메일",
    "보고서",
    "블로그",
    "SNS",
    "문서 정리",
    "상담 기록",
    "내부 알림",
  ],

  // 하루 반복 업무 시간
  dailyHours: ["1시간 미만", "1~2시간", "2~4시간", "4~6시간", "6시간 이상"],

  // 담당 인원 (decisions.md D1 추가)
  staffCount: ["1명", "2~3명", "4~5명", "6명 이상"],

  // 월간 처리 건수
  monthlyVolume: [
    "50건 미만",
    "50~200건",
    "200~500건",
    "500~1,000건",
    "1,000건 이상",
    "파악 못함",
  ],

  // 도입 목적 (decisions.md D1 추가) — "방향성 파악"이 기획서 §11.3 의 AI Consulting 분기를 구동
  purpose: [
    "업무 시간 절감",
    "인건비 절감",
    "고객 응대 속도 개선",
    "데이터 관리 체계화",
    "방향성 파악 (무엇부터 할지 모름)",
    "기타",
  ],

  // 예산 범위 — 기획서 §12.2 가격대(150만~800만원)와 정합
  budgetRange: [
    "미정 (방향성부터 파악)",
    "300만원 미만",
    "300~500만원",
    "500~1,000만원",
    "1,000만원 이상",
  ],

  // 상담 방식 — leads.consulting_method / consultations.consultation_type 공용 (decisions.md D2-c)
  consultingMethod: ["전화", "온라인 미팅", "방문 상담", "이메일"],

  // 희망 상담 시기 — consultations.preferred_date (날짜 아닌 선택지 버킷)
  preferredDate: ["가능한 빨리", "1주일 이내", "2주일 이내", "1개월 이내"],
} as const satisfies Record<string, readonly string[]>;

export type OptionKey = keyof typeof OPTIONS;

/** 서비스 5종 (기획서 §0, §11.3 · consultations.suggested_service_type CHECK 와 1:1) */
export const SERVICE_TYPES = [
  "AI Automation",
  "n8n Automation",
  "Smart Website",
  "AI Agent",
  "AI Consulting",
] as const;

export type ServiceType = (typeof SERVICE_TYPES)[number];
