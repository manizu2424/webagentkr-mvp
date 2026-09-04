import { Section } from "@/components/marketing/section";

// 구축 절차 — 진짜 순서라 번호 사용. 단계 라벨은 기획서 §6 여정에서 유추,
// 각 단계 설명 문구는 확정 전.
const STEPS = ["자동화 진단", "설계·제안", "구축·연동", "검수·이관", "운영 지원"];

export function Process() {
  return (
    <Section heading="구축 절차" wide>
      <ol className="grid gap-x-6 gap-y-8 sm:grid-cols-3 lg:grid-cols-5">
        {STEPS.map((step, i) => (
          <li key={step} className="border-t-2 border-ink pt-3">
            <span className="font-flow text-[0.8rem] text-signal">
              {String(i + 1).padStart(2, "0")}
            </span>
            <p className="mt-1.5 text-[1rem] font-bold text-ink">{step}</p>
            <p className="mt-2 text-[0.88rem] leading-relaxed text-ink-soft">
              {/* TODO: 단계 설명 카피 확정 */}
              단계 설명이 들어갑니다.
            </p>
          </li>
        ))}
      </ol>
    </Section>
  );
}
