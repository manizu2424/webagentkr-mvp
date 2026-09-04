import { Section } from "@/components/marketing/section";

// 서비스는 항상 정확히 5종 (절대원칙 §2). 재분류·통합 금지. 집합이므로 번호 없음.
const SERVICES = [
  ["AI Automation", "반복 사무·영업·관리 업무 자동화"],
  ["n8n Automation", "API·이메일·DB·메신저·AI 모델 연결"],
  ["Smart Website", "문의 접수·고객관리 연결 자동화 홈페이지"],
  ["AI Agent", "사내 문서 검색·고객 상담·자료 생성"],
  ["AI Consulting", "AI 도입 진단·실무 교육·운영 컨설팅"],
];

export function Services() {
  return (
    <Section heading="다섯 가지 서비스" wide>
      <ul className="grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
        {SERVICES.map(([name, desc]) => (
          <li key={name} className="border-t border-ink pt-4 pb-2">
            <p className="font-flow text-[0.95rem] tracking-tight text-ink">
              {name}
            </p>
            <p className="mt-2 text-[0.92rem] leading-relaxed text-ink-soft">
              {desc}
            </p>
          </li>
        ))}
      </ul>
    </Section>
  );
}
