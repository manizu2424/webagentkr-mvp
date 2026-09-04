import { Section } from "@/components/marketing/section";

// 신뢰 요소 — 실제 고객 로고·후기 사용 불가 (절대원칙 §3: 데모는 "자동화 데모"로만).
// 스택 투명성 · 구축 프로세스 공개 · 데모 재현 가능성 축으로 채운다.
const POINTS = ["고정 기술 스택 공개", "구축 과정 투명 공유", "데모 재현 가능"];

export function Trust() {
  return (
    <Section heading="왜 믿을 수 있나" wide>
      <ul className="grid gap-8 sm:grid-cols-3">
        {POINTS.map((point) => (
          <li key={point} className="border-t border-line pt-4">
            <p className="text-[1rem] font-bold text-ink">{point}</p>
            <p className="mt-2 text-[0.9rem] leading-relaxed text-ink-soft">
              {/* TODO: 신뢰 요소 본문 카피 확정 */}
              설명 문구가 들어갑니다.
            </p>
          </li>
        ))}
      </ul>
    </Section>
  );
}
