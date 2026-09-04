import { Section } from "@/components/marketing/section";

// 네이티브 <details> — 클라이언트 JS 없음. 질문/답변 카피 확정 전.
// TODO: 6문항 확정 (예: 비용, 소요 기간, 유지보수, 데이터 보안/국외 이전,
//       기존 도구 연동, 진단 결과 정확도 — 기획서 §12·§16 참고)
const ITEMS = Array.from({ length: 6 }, (_, i) => i + 1);

export function Faq() {
  return (
    <Section heading="자주 묻는 질문">
      <div className="border-t border-line">
        {ITEMS.map((n) => (
          <details key={n} className="group border-b border-line">
            <summary className="flex cursor-pointer list-none items-center justify-between py-4 text-[1rem] font-medium text-ink [&::-webkit-details-marker]:hidden">
              {/* TODO: 질문 {n} */}
              질문 {n}
              <span
                aria-hidden
                className="ml-4 text-ink-soft transition-transform group-open:rotate-45"
              >
                +
              </span>
            </summary>
            <p className="pb-5 text-[0.95rem] leading-relaxed text-ink-soft">
              {/* TODO: 답변 {n} */}
              답변 문구가 들어갑니다.
            </p>
          </details>
        ))}
      </div>
    </Section>
  );
}
