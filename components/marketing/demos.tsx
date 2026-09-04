import { Section } from "@/components/marketing/section";

// 실제 고객이 없는 데모는 반드시 "자동화 데모"로 표시 (절대원칙 §3).
const DEMOS: {
  title: string;
  steps: string[];
  effect: string;
  note?: string;
}[] = [
  {
    title: "문의 자동화",
    steps: [
      "문의 제출",
      "AI 유형 분류",
      "DB 저장",
      "담당자 알림",
      "접수 이메일",
      "답변 초안",
    ],
    effect: "문의 누락 방지 · 응답 속도 개선 · 고객 데이터 축적",
  },
  {
    title: "견적 자동화",
    steps: ["견적 요청", "요구사항 분석", "추가 질문", "견적 초안", "관리자 검토"],
    effect: "작성 시간 단축 · 상담 기준 표준화",
  },
  {
    title: "콘텐츠 자동화",
    steps: [
      "키워드",
      "자료 수집",
      "AI 초안",
      "이미지 준비",
      "WordPress 임시글",
      "사람 검수",
    ],
    effect: "신뢰도·품질 유지",
    note: "반자동 — 완전 자동 발행이 아니라 사람 검수를 거칩니다.",
  },
];

export function Demos() {
  return (
    <Section heading="자동화 데모" wide>
      <div className="flex flex-col gap-px bg-line">
        {DEMOS.map((demo) => (
          <article
            key={demo.title}
            className="grid gap-4 bg-paper py-8 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-10"
          >
            <div>
              <span className="inline-block border border-signal px-2 py-0.5 text-[0.7rem] font-medium tracking-wide text-signal">
                자동화 데모
              </span>
              <h3 className="mt-3 text-[1.15rem] font-bold text-ink">
                {demo.title}
              </h3>
            </div>

            <div>
              <ol className="flex flex-wrap items-center gap-x-6 gap-y-2.5">
                {demo.steps.map((step, i) => (
                  <li key={step} className="flex items-baseline gap-2">
                    <span className="font-flow text-[0.68rem] text-signal">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="text-[0.95rem] text-ink">{step}</span>
                  </li>
                ))}
              </ol>

              <p className="mt-5 text-[0.95rem] font-medium text-resolved">
                효과 · {demo.effect}
              </p>
              {demo.note && (
                <p className="mt-2 text-[0.85rem] text-ink-soft">{demo.note}</p>
              )}
            </div>
          </article>
        ))}
      </div>
    </Section>
  );
}
