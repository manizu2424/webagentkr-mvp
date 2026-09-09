/**
 * 마케팅 카피 단일 소스 (절대원칙 §2, docs/decisions.md D2)
 *
 * SERVICES.name 은 반드시 lib/options.ts SERVICE_TYPES 와 정확히 같은 순서·값
 * 모든 icon 값은 components/marketing/icons.tsx IconName 에 존재
 */

import type { IconName } from "@/components/marketing/icons";

export const HERO = {
  headline: ["AI가 직원처럼", "일하는 회사"],
  sub: "고객 문의, 견적, 보고서, 콘텐츠 제작까지 반복 업무를 AI와 n8n으로 연결하고 자동화합니다.",
  facts: ["서비스 5종", "무료 진단 3분", "n8n + gpt-4o"],
} as const;

export const PROBLEMS = [
  { label: "문의 수동 확인", icon: "inbox" as IconName },
  { label: "엑셀 재입력", icon: "sheet" as IconName },
  { label: "견적서 매번 재작성", icon: "file-text" as IconName },
  { label: "상담 수기 정리", icon: "clipboard-list" as IconName },
  { label: "블로그·SNS 직접 제작", icon: "pen-line" as IconName },
  { label: "보고서 복사·작성", icon: "bar-chart" as IconName },
] as const;

export const SERVICES = [
  {
    name: "AI Automation",
    desc: "반복 사무·영업·관리 업무 자동화",
    icon: "workflow" as IconName,
  },
  {
    name: "n8n Automation",
    desc: "API·이메일·DB·메신저·AI 모델 연결",
    icon: "waypoints" as IconName,
  },
  {
    name: "Smart Website",
    desc: "문의 접수·고객관리 연결 자동화 홈페이지",
    icon: "globe" as IconName,
  },
  {
    name: "AI Agent",
    desc: "사내 문서 검색·고객 상담·자료 생성",
    icon: "bot" as IconName,
  },
  {
    name: "AI Consulting",
    desc: "AI 도입 진단·실무 교육·운영 컨설팅",
    icon: "graduation-cap" as IconName,
  },
] as const;

export const BEFORE_AFTER = [
  {
    task: "고객 문의",
    before: "이메일 수동 확인",
    after: "접수 즉시 저장·알림",
  },
  {
    task: "고객 관리",
    before: "엑셀 수기 입력",
    after: "CRM 자동 등록",
  },
  {
    task: "견적 작성",
    before: "양식 복사·수정",
    after: "AI 초안 생성",
  },
  {
    task: "상담 정리",
    before: "직원 수기 작성",
    after: "AI 자동 요약",
  },
  {
    task: "블로그",
    before: "조사부터 직접 수행",
    after: "자료·초안 자동 생성",
  },
  {
    task: "보고서",
    before: "자료 복사 후 작성",
    after: "지정 양식 자동 생성",
  },
] as const;

export const PROCESS = [
  {
    step: "자동화 진단",
    icon: "scan-search" as IconName,
    desc: "회사·업무 정보를 입력하면 AI가 자동화 여지와 예상 절감 시간을 추정해 드립니다. 무료, 3분.",
  },
  {
    step: "설계·제안",
    icon: "pencil-ruler" as IconName,
    desc: "진단 결과를 바탕으로 어떤 업무를 어떤 순서로 자동화할지, 예상 비용과 기간을 제안서로 정리합니다.",
  },
  {
    step: "구축·연동",
    icon: "wrench" as IconName,
    desc: "n8n 워크플로우와 AI 호출을 만들고, 기존에 쓰던 도구(메일·시트·메신저·CRM)에 연결합니다.",
  },
  {
    step: "검수·이관",
    icon: "clipboard-check" as IconName,
    desc: "실제 데이터로 테스트하고, 예외 처리와 실패 알림을 붙인 뒤 운영 환경으로 옮깁니다.",
  },
  {
    step: "운영 지원",
    icon: "life-buoy" as IconName,
    desc: "가동 후 오류 모니터링과 개선을 지원합니다. 워크플로우는 문서와 함께 인계됩니다.",
  },
] as const;

export const TRUST = [
  {
    point: "고정 기술 스택 공개",
    icon: "layers" as IconName,
    body: "Next.js · Supabase · n8n · OpenAI · Telegram 으로 고정합니다. 어떤 도구로 무엇을 하는지 처음부터 공개합니다.",
  },
  {
    point: "구축 과정 투명 공유",
    icon: "eye" as IconName,
    body: "진단부터 이관까지 각 단계의 산출물(제안서·워크플로우·문서)을 그대로 전달합니다. 블랙박스가 없습니다.",
  },
  {
    point: "데모 재현 가능",
    icon: "refresh-cw" as IconName,
    body: "홈페이지의 자동화 데모는 실제 동작하는 흐름입니다. 상담 시 같은 구성을 직접 시연합니다.",
  },
] as const;

export const FAQ = [
  {
    q: "비용은 얼마인가요?",
    a: "업무 범위에 따라 150만~800만원 수준입니다. 무료 진단 후 제안서에 정확한 견적을 담습니다.",
  },
  {
    q: "기간은 얼마나 걸리나요?",
    a: "간단한 자동화는 1~2주, 여러 업무를 묶으면 3~5주가 일반적입니다. 진단·설계 단계에서 확정합니다.",
  },
  {
    q: "유지보수는 어떻게 하나요?",
    a: "가동 후 오류 알림과 개선을 지원합니다. 워크플로우 JSON 과 문서를 함께 인계하므로 다른 담당자도 이어받을 수 있습니다.",
  },
  {
    q: "우리 데이터는 안전한가요?",
    a: "이름·연락처는 데이터베이스에만 저장하고 AI 에는 보내지 않습니다. 자세한 내용은 개인정보처리방침의 국외 이전·위탁 표를 확인해 주세요.",
  },
  {
    q: "지금 쓰는 도구와 연동되나요?",
    a: "이메일·구글시트·카카오톡·Slack·Telegram·WordPress·일반 CRM/ERP 등 API 나 웹훅이 있으면 대부분 연결됩니다. 안 되는 경우는 진단에서 알려드립니다.",
  },
  {
    q: "AI 진단 결과는 얼마나 정확한가요?",
    a: "입력값 기반 추정치입니다. 자동화 가능성의 방향을 잡는 용도이며, 실제 효과는 업무 표준화 정도에 따라 달라집니다. 상담에서 구체화합니다.",
  },
] as const;

export const ABOUT = {
  mission:
    "WEBAGENT.KR 은 중소기업이 반복 업무를 사람 대신 AI와 자동화에 맡기도록 돕습니다. 고객 문의·견적·보고서·콘텐츠 제작처럼 매일 반복되는 일을 n8n 워크플로우와 AI 호출로 연결해, 직원이 판단이 필요한 일에 집중할 수 있게 만듭니다.",
  notDoing: [
    "홈페이지 제작을 단독 상품으로 팔지 않습니다. 홈페이지는 Smart Website 서비스의 결과물 중 하나일 뿐입니다.",
    "실제 고객 사례가 없는 화면을 사례처럼 포장하지 않습니다. 홈페이지의 예시는 모두 \"자동화 데모\"로 표시합니다.",
    "AI가 추정한 절감 효과를 보장처럼 말하지 않습니다. 결과는 언제나 추정치입니다.",
  ],
  stack:
    "기술 스택은 Next.js · Supabase · n8n · OpenAI · Telegram 으로 고정합니다. 새 도구를 매번 갈아끼우지 않고, 검증된 조합을 깊게 다룹니다.",
  solo: "현재 소수 인원 체제로 운영합니다. 모든 자동화에는 실패 시 담당자에게 즉시 알리는 오류 알림 채널을 기본으로 붙여, 사람이 적어도 누락이 생기지 않게 합니다.",
} as const;
