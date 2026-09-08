// 상담 신청 시점 서비스 유형 자동 태깅 (기획서 §11.3, docs/decisions.md D3, 결함 #8).
// 이 값은 확정이 아니라 "상담 시작 전 가설"이다 — 상담 중 검증한다.
// n8n 이 아니라 POST /api/consultations 에서 계산한다.
// "server-only" 를 넣지 않는다(러너 없는 유닛 테스트 대상, 순수 함수).
// ServiceType 은 상대경로 타입-only import — _wak_*.mts 가 node 로 직접 실행되므로
// @/ 별칭·값 import 를 피한다(node 타입 스트리핑이 import type 을 통째로 제거).
import type { ServiceType } from "./options";

export interface TaggingDiagnosis {
  purpose: string | null; // diagnoses.purpose
  budgetRange: string | null; // diagnoses.budget_range
  websiteStatus: string | null; // diagnoses.website_status
}

export interface TaggingResult {
  recommendedStack: string[]; // diagnosis_results.recommended_stack
  priorityTasks: { name: string; reason: string }[]; // diagnosis_results.recommended_tasks (부분)
}

// 아래 라벨 리터럴은 lib/options.ts 의 purpose / budgetRange 값과 동기화돼 있어야 한다(D2).
const PURPOSE_DIRECTION = "방향성 파악 (무엇부터 할지 모름)";
const BUDGET_UNDECIDED = "미정 (방향성부터 파악)";

const WEBSITE_KEYWORDS = ["website", "웹사이트", "홈페이지", "랜딩", "smart website"];
const AGENT_KEYWORDS = ["문서 검색", "사내 문서", "상담 ai", "챗봇", "rag", "지식베이스", "ai agent"];
const LLM_MARKERS = ["openai", "gpt", "llm", " ai "];

export function computeServiceType(
  d: TaggingDiagnosis,
  r: TaggingResult | null,
): ServiceType | null {
  if (r === null) return null;

  const haystack = [
    ...r.recommendedStack,
    ...r.priorityTasks.flatMap((t) => [t.name, t.reason]),
  ]
    .join(" ")
    .toLowerCase();
  const stackLower = r.recommendedStack.map((s) => s.toLowerCase());

  // ① 고객 의도 신호를 먼저 단락
  if (d.purpose === PURPOSE_DIRECTION || d.budgetRange === BUDGET_UNDECIDED) {
    return "AI Consulting";
  }
  // ② 홈페이지
  if (d.websiteStatus === "없음" || WEBSITE_KEYWORDS.some((k) => haystack.includes(k))) {
    return "Smart Website";
  }
  // ③ 에이전트성
  if (AGENT_KEYWORDS.some((k) => haystack.includes(k))) {
    return "AI Agent";
  }
  // ④ 순수 워크플로 자동화 (n8n 있고 LLM 요소 없음)
  if (stackLower.includes("n8n") && !LLM_MARKERS.some((m) => haystack.includes(m))) {
    return "n8n Automation";
  }
  // ⑤ 기본값 — AI 가 개입하는 일반 반복 업무 자동화
  return "AI Automation";
}
