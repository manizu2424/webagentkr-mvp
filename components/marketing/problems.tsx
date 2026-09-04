import { Section } from "@/components/marketing/section";

const ITEMS = [
  "문의 수동 확인",
  "엑셀 재입력",
  "견적서 매번 재작성",
  "상담 수기 정리",
  "블로그·SNS 직접 제작",
  "보고서 복사·작성",
];

export function Problems() {
  return (
    <Section heading="아직도 이런 업무를 사람이 반복하고 있나요?">
      <ul className="grid gap-x-10 gap-y-3 sm:grid-cols-2">
        {ITEMS.map((item) => (
          <li
            key={item}
            className="flex items-baseline gap-3 border-t border-line py-3 text-[1.02rem] text-ink"
          >
            <span aria-hidden className="text-ink-soft">
              —
            </span>
            {item}
          </li>
        ))}
      </ul>
    </Section>
  );
}
