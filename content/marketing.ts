/**
 * 마케팅 카피 단일 소스 (절대원칙 §2, docs/decisions.md D2)
 *
 * SERVICES.name 은 반드시 lib/options.ts SERVICE_TYPES 와 정확히 같은 순서·값
 * 모든 icon 값은 components/marketing/icons.tsx IconName 에 존재
 * 문구는 쉬운 말로: 짧은 문장, 전문용어(n8n·워크플로우·API 등)는 풀어 쓴다. 서비스 "이름"만 예외.
 */

import type { IconName } from "@/components/marketing/icons";

export const HERO = {
  headline: ["반복 업무,", "AI가 대신합니다"],
  sub: "3분 무료 진단으로, 우리 회사에서 자동화할 수 있는 일을 찾아드려요.",
  facts: ["무료", "약 3분", "가입 없음"],
} as const;

export const SECTIONS: Record<
  "pain" | "services" | "process" | "demos" | "faq",
  { eyebrow: string; heading: string; lead?: string }
> = {
  pain: {
    eyebrow: "고민",
    heading: "이런 일, 아직 손으로 하고 계신가요?",
    lead: "자동화하면 이렇게 달라져요.",
  },
  services: {
    eyebrow: "서비스",
    heading: "이런 걸 해드려요",
    lead: "서비스는 다섯 가지예요.",
  },
  process: {
    eyebrow: "진행 방식",
    heading: "이렇게 진행돼요",
    lead: "진단부터 구축까지, 세 단계예요.",
  },
  demos: {
    eyebrow: "데모",
    heading: "이렇게 움직여요",
    lead: "실제 고객 사례가 아니라, 동작 방식을 보여 드리는 예시예요.",
  },
  faq: {
    eyebrow: "질문",
    heading: "자주 묻는 질문",
  },
};

export const PAIN = [
  {
    task: "고객 문의",
    before: "메일을 하나씩 열어서 확인",
    after: "접수되면 바로 저장하고 알림",
    icon: "inbox" as IconName,
  },
  {
    task: "고객 관리",
    before: "엑셀에 직접 입력",
    after: "고객 목록에 자동 등록",
    icon: "sheet" as IconName,
  },
  {
    task: "견적서",
    before: "매번 양식을 복사해서 수정",
    after: "AI가 초안을 만들어 줌",
    icon: "file-text" as IconName,
  },
  {
    task: "상담 기록",
    before: "직원이 직접 정리",
    after: "AI가 자동으로 요약",
    icon: "clipboard-list" as IconName,
  },
  {
    task: "블로그·SNS",
    before: "조사부터 글쓰기까지 직접",
    after: "자료와 초안을 자동 준비",
    icon: "pen-line" as IconName,
  },
  {
    task: "보고서",
    before: "자료를 복사해서 작성",
    after: "정해진 양식으로 자동 작성",
    icon: "bar-chart" as IconName,
  },
] as const;

export const SERVICES = [
  {
    name: "AI Automation",
    desc: "매일 반복하는 사무·영업 업무를 AI가 대신 처리해요.",
    icon: "workflow" as IconName,
  },
  {
    name: "n8n Automation",
    desc: "메일·엑셀·메신저·AI를 서로 연결해서 자동으로 흘러가게 해요.",
    icon: "waypoints" as IconName,
  },
  {
    name: "Smart Website",
    desc: "문의 접수와 고객 관리가 자동으로 이어지는 홈페이지예요.",
    icon: "globe" as IconName,
  },
  {
    name: "AI Agent",
    desc: "회사 문서를 읽고 고객 질문에 답하는 AI 직원이에요.",
    icon: "bot" as IconName,
  },
  {
    name: "AI Consulting",
    desc: "우리 회사에 AI를 어떻게 쓸지 진단하고 교육해 드려요.",
    icon: "graduation-cap" as IconName,
  },
] as const;

export const PROCESS = [
  {
    step: "무료 진단",
    icon: "scan-search" as IconName,
    desc: "회사와 업무 정보를 입력하면 AI가 자동화할 수 있는 일을 추정해서 알려드려요. 3분이면 끝나요.",
  },
  {
    step: "제안",
    icon: "pencil-ruler" as IconName,
    desc: "진단 결과를 보고 무엇부터 자동화할지, 예상 비용과 기간을 제안서로 정리해 드려요.",
  },
  {
    step: "구축",
    icon: "wrench" as IconName,
    desc: "제안이 맞으면 지금 쓰는 도구에 연결해서 만들고, 실제 데이터로 테스트한 뒤 넘겨 드려요. 이후 오류도 함께 살펴봐요.",
  },
] as const;

export const DEMOS = [
  {
    title: "문의 자동화",
    steps: [
      "문의 접수",
      "AI가 유형 분류",
      "고객 목록에 저장",
      "담당자에게 알림",
      "접수 확인 메일",
      "답변 초안 작성",
    ],
    effect: "문의를 놓치지 않고, 답변이 빨라져요.",
  },
  {
    title: "견적 자동화",
    steps: ["견적 요청", "요구사항 파악", "추가 질문", "견적 초안", "담당자 확인"],
    effect: "견적 작성 시간이 줄고, 기준이 일정해져요.",
  },
  {
    title: "콘텐츠 자동화",
    steps: [
      "키워드 입력",
      "자료 수집",
      "AI 초안",
      "이미지 준비",
      "블로그에 임시 저장",
      "사람이 검수",
    ],
    effect: "품질은 지키고, 준비 시간은 줄어요.",
    note: "완전 자동 발행이 아니라, 사람이 검수한 뒤 게시해요.",
  },
] as const;

export const FAQ = [
  {
    q: "비용은 얼마인가요?",
    a: "일의 범위에 따라 다르지만 보통 150만~800만원 사이예요. 무료 진단 뒤에 받으시는 제안서에 정확한 견적이 들어 있어요.",
  },
  {
    q: "얼마나 걸리나요?",
    a: "간단한 자동화는 1~2주, 여러 업무를 함께 하면 3~5주쯤 걸려요. 오픈한 뒤에는 오류 알림과 개선도 함께 살펴봐요.",
  },
  {
    q: "지금 쓰는 도구와 연결되나요?",
    a: "메일, 구글시트, 카카오톡, Slack, Telegram 같은 도구는 대부분 연결돼요. 어려운 경우는 진단에서 미리 알려드려요.",
  },
  {
    q: "우리 정보는 안전한가요?",
    a: "이름과 연락처는 저희 데이터베이스에만 저장하고, AI에게는 보내지 않아요. 자세한 내용은 개인정보처리방침에서 확인하실 수 있어요.",
  },
  {
    q: "진단 결과는 얼마나 정확한가요?",
    a: "입력하신 내용을 바탕으로 AI가 계산한 추정치예요. 방향을 잡는 용도이고, 실제 효과는 업무 방식에 따라 달라져요. 상담에서 구체적으로 정리해 드려요.",
  },
] as const;

export const FINAL_CTA = {
  heading: "우리 회사는 무엇을 자동화할 수 있을까요?",
  body: "3분이면 알 수 있어요. 결과는 AI가 추정한 값이라, 자세한 내용은 상담에서 함께 정해요.",
  button: "무료 진단 시작",
  note: "무료 · 가입 없음",
} as const;

export const ABOUT = {
  mission:
    "WEBAGENT.KR은 중소기업이 반복되는 일을 사람 대신 AI와 자동화에 맡기도록 돕는 곳이에요. 고객 문의, 견적, 보고서, 콘텐츠 제작처럼 매일 되풀이되는 일을 도구와 AI로 이어서, 직원이 판단이 필요한 일에 집중할 수 있게 만들어요.",
  notDoing: [
    "홈페이지 제작만 따로 팔지 않아요. 홈페이지는 Smart Website 서비스의 결과물 중 하나일 뿐이에요.",
    "실제 고객 사례가 없는 화면을 사례처럼 보여 드리지 않아요. 홈페이지의 예시는 모두 \"자동화 데모\"로 표시해요.",
    "AI가 추정한 절감 효과를 보장처럼 말하지 않아요. 결과는 언제나 추정치예요.",
  ],
  stack:
    "기술은 Next.js · Supabase · n8n · OpenAI · Telegram으로 정해 두고 써요. 새 도구를 매번 바꾸지 않고, 검증된 조합을 깊게 다뤄요.",
  solo: "지금은 소수 인원으로 운영해요. 모든 자동화에는 문제가 생기면 담당자에게 바로 알려주는 오류 알림을 기본으로 붙여서, 사람이 적어도 놓치는 일이 없게 해요.",
} as const;
